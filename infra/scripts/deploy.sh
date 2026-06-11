#!/usr/bin/env bash
# Fully automated deploy:
#   1. Creates the GitHub `production` environment (idempotent)
#   2. Creates S3 state bucket + DynamoDB lock table (bootstrap, idempotent)
#   3. Writes infra/backend.tfvars from bootstrap outputs
#   4. Initialises and applies the main infrastructure
#   5. Syncs tofu outputs → GitHub Actions secrets
#
# Prerequisites:
#   - tofu and aws CLI installed, `aws configure` done
#   - gh CLI installed and authenticated (`gh auth login`)
#
# Usage:
#   ./infra/scripts/deploy.sh               # full deploy
#   ./infra/scripts/deploy.sh --plan-only   # preview without applying

set -euo pipefail

PLAN_ONLY=false
for arg in "$@"; do
  [[ "$arg" == "--plan-only" ]] && PLAN_ONLY=true
done

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPTS_DIR")"
BOOTSTRAP_DIR="$INFRA_DIR/bootstrap"
BACKEND_VARS="$INFRA_DIR/backend.tfvars"

# ── GitHub environment ────────────────────────────────────────────────────────

echo "==> [1/4] Creating GitHub 'production' environment..."
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# Create or update the environment, restricting deployments to main only.
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/environments/production" \
  --silent

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/environments/production" \
  --field 'deployment_branch_policy[protected_branches]=false' \
  --field 'deployment_branch_policy[custom_branch_policies]=true' \
  --silent

# Allow deployments from main only.
EXISTING=$(gh api \
  -H "Accept: application/vnd.github+json" \
  "/repos/$REPO/environments/production/deployment-branch-policies" \
  --jq '.branch_policies[].name' 2>/dev/null || echo "")

if ! echo "$EXISTING" | grep -qx "main"; then
  gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    "/repos/$REPO/environments/production/deployment-branch-policies" \
    --field 'name=main' \
    --field 'type=branch' \
    --silent
fi

echo "  Environment 'production' ready (deployments restricted to main)."

# ── Bootstrap ─────────────────────────────────────────────────────────────────

echo "==> [2/4] Bootstrapping state backend..."
cd "$BOOTSTRAP_DIR"
tofu init -input=false -reconfigure
tofu apply -auto-approve -input=false

BUCKET=$(tofu output -raw state_bucket)
TABLE=$(tofu output -raw lock_table)
REGION=$(tofu output -raw aws_region)

# ── Write backend.tfvars ──────────────────────────────────────────────────────

echo "==> [3/4] Writing backend.tfvars..."
cat > "$BACKEND_VARS" <<EOF
bucket         = "$BUCKET"
key            = "arbitrageiq-demo/terraform.tfstate"
region         = "$REGION"
dynamodb_table = "$TABLE"
encrypt        = true
EOF

# ── Main infrastructure ───────────────────────────────────────────────────────

echo "==> [4/4] Deploying main infrastructure..."
cd "$INFRA_DIR"
tofu init -backend-config=backend.tfvars -input=false -reconfigure

if [[ "$PLAN_ONLY" == "true" ]]; then
  tofu plan -input=false
  echo ""
  echo "==> Plan complete. Re-run without --plan-only to apply."
  exit 0
fi

tofu apply -auto-approve -input=false

# ── Sync outputs → GitHub secrets ────────────────────────────────────────────

echo ""
echo "==> Syncing outputs to GitHub Actions secrets..."
gh secret set ECR_REPOSITORY      --repo "$REPO" --body "$(tofu output -raw ecr_repository_name)"
gh secret set ECS_CLUSTER         --repo "$REPO" --body "$(tofu output -raw ecs_cluster_name)"
gh secret set ECS_SERVICE         --repo "$REPO" --body "$(tofu output -raw ecs_service_name)"
gh secret set ECS_TASK_DEFINITION --repo "$REPO" --body "$(tofu output -raw task_definition_family)"
gh secret set CONTAINER_NAME      --repo "$REPO" --body "web"

echo ""
echo "==> Deploy complete. Outputs:"
echo ""
tofu output
echo ""
echo "==> Next: populate SESSION_SECRET before the ECS service can start:"
echo "    aws secretsmanager put-secret-value \\"
echo "      --secret-id \$(tofu output -raw session_secret_arn) \\"
echo "      --secret-string \"\$(openssl rand -hex 32)\""
