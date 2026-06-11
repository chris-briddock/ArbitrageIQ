#!/usr/bin/env bash
# Tears down all infrastructure in reverse order:
#   1. Main infra (ECS, ALB, VPC, ECR, etc.)
#   2. Bootstrap resources (S3 state bucket, DynamoDB lock table)
#
# WARNING: this deletes all resources including the state bucket.
# ECR images and Secrets Manager values are also removed.
#
# Usage: ./infra/scripts/destroy.sh

set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPTS_DIR")"
BACKEND_VARS="$INFRA_DIR/backend.tfvars"

read -r -p "This will destroy ALL infrastructure. Type 'yes' to confirm: " confirm
[[ "$confirm" != "yes" ]] && echo "Aborted." && exit 1

# ── Main infrastructure ───────────────────────────────────────────────────────

echo "==> [1/2] Destroying main infrastructure..."
cd "$INFRA_DIR"

if [[ -f "$BACKEND_VARS" ]]; then
  tofu init -backend-config=backend.tfvars -input=false -reconfigure
  tofu destroy -auto-approve -input=false
else
  echo "  backend.tfvars not found — skipping main infra destroy."
fi

# ── Bootstrap ─────────────────────────────────────────────────────────────────

echo "==> [2/2] Destroying bootstrap resources..."
cd "$INFRA_DIR/bootstrap"

# Empty the bucket before destroying it (force_destroy=false protects state).
BUCKET=$(tofu output -raw state_bucket 2>/dev/null || echo "")
if [[ -n "$BUCKET" ]]; then
  echo "  Emptying state bucket $BUCKET..."
  aws s3 rm "s3://$BUCKET" --recursive
fi

tofu destroy -auto-approve -input=false

echo ""
echo "==> All infrastructure destroyed."
