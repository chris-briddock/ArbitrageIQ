#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Run this script inside AWS CloudShell (https://console.aws.amazon.com →
# CloudShell icon in the top nav bar).  CloudShell is already authenticated
# with your AWS account — no aws configure needed.
#
# What it does:
#   1. Creates the GitHub Actions OIDC provider in IAM (idempotent)
#   2. Creates the GitHubActions-ArbitrageIQ IAM role (idempotent)
#   3. Attaches AdministratorAccess so the CI pipelines can manage all
#      infra resources (scope this down for a hardened production setup)
#   4. Installs the gh CLI
#   5. Sets AWS_ROLE_ARN and AWS_REGION as GitHub Actions secrets
#
# Usage:
#   # Paste into CloudShell, then run:
#   bash cloudshell-bootstrap.sh --repo owner/ArbitrageIQ [--region eu-west-2]
#
#   # Or, pass a GitHub PAT directly to skip the gh auth login prompt:
#   bash cloudshell-bootstrap.sh --repo owner/ArbitrageIQ --token ghp_xxxx
#
# Options:
#   --repo    OWNER/REPO  GitHub repository (required)
#   --region  REGION      AWS region (default: current CloudShell region)
#   --token   GH_PAT      GitHub Personal Access Token with secrets:write scope
#                         If omitted, you will be prompted to run gh auth login
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO=""
REGION=""
GH_TOKEN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)    REPO="$2";     shift 2 ;;
    --region)  REGION="$2";   shift 2 ;;
    --token)   GH_TOKEN="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$REPO" ]]; then
  echo "Error: --repo OWNER/REPO is required."
  echo "Usage: bash cloudshell-bootstrap.sh --repo owner/ArbitrageIQ"
  exit 1
fi

# Default region from the current CloudShell session.
REGION="${REGION:-$(aws configure get region 2>/dev/null || echo "eu-west-2")}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="GitHubActions-ArbitrageIQ"
OIDC_URL="https://token.actions.githubusercontent.com"
OIDC_THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

echo ""
echo "==> [1/5] Creating GitHub Actions OIDC provider..."
if aws iam get-open-id-connect-provider \
     --open-id-connect-provider-arn \
     "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" \
     &>/dev/null; then
  echo "  OIDC provider already exists — skipping."
else
  aws iam create-open-id-connect-provider \
    --url "$OIDC_URL" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "$OIDC_THUMBPRINT"
  echo "  OIDC provider created."
fi

OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"

# ── IAM role ──────────────────────────────────────────────────────────────────

echo ""
echo "==> [2/5] Creating IAM role ${ROLE_NAME}..."

cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${OIDC_ARN}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO}:*"
        }
      }
    }
  ]
}
EOF

if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
  echo "  Role already exists — updating trust policy."
  aws iam update-assume-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-document file:///tmp/trust-policy.json
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)
else
  ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --description "Used by GitHub Actions CI/CD for ArbitrageIQ" \
    --query Role.Arn \
    --output text)
  echo "  Role created: ${ROLE_ARN}"
fi

# ── Policies ──────────────────────────────────────────────────────────────────

echo ""
echo "==> [3/5] Attaching AdministratorAccess policy..."
# AdministratorAccess lets the pipelines manage all infrastructure resources.
# For a hardened production setup, replace this with a scoped policy that
# grants only EC2, ECS, ECR, S3, DynamoDB, IAM (for task roles), ELB,
# CloudWatch Logs, and Secrets Manager.
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
echo "  AdministratorAccess attached."

# ── gh CLI ───────────────────────────────────────────────────────────────────

echo ""
echo "==> [4/5] Installing GitHub CLI..."
if ! command -v gh &>/dev/null; then
  # CloudShell runs Amazon Linux 2 (rpm-based).
  if command -v yum &>/dev/null; then
    sudo yum install -y yum-utils
    sudo yum-config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
    sudo yum install -y gh
  # CloudShell on some regions runs Ubuntu (deb-based).
  elif command -v apt-get &>/dev/null; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update -q && sudo apt-get install -y gh
  else
    echo "  Could not detect package manager. Install gh manually: https://cli.github.com"
    exit 1
  fi
  echo "  gh CLI installed."
else
  echo "  gh CLI already installed ($(gh --version | head -1))."
fi

# ── GitHub secrets ───────────────────────────────────────────────────────────

echo ""
echo "==> [5/5] Setting GitHub Actions secrets..."

if [[ -n "$GH_TOKEN" ]]; then
  export GH_TOKEN
else
  echo ""
  echo "  No --token provided. You need to authenticate with GitHub."
  echo "  Run:  gh auth login"
  echo "  Then re-run this script, or set the two secrets manually:"
  echo ""
  echo "    gh secret set AWS_ROLE_ARN --repo ${REPO} --body \"${ROLE_ARN}\""
  echo "    gh secret set AWS_REGION   --repo ${REPO} --body \"${REGION}\""
  echo ""
  echo "  Alternatively pass --token ghp_xxxx to this script."
  echo ""
  echo "==> Summary (save these values):"
  echo "  AWS_ROLE_ARN = ${ROLE_ARN}"
  echo "  AWS_REGION   = ${REGION}"
  exit 0
fi

gh secret set AWS_ROLE_ARN --repo "$REPO" --body "$ROLE_ARN"
gh secret set AWS_REGION   --repo "$REPO" --body "$REGION"

echo ""
echo "==> Done! GitHub Actions secrets set:"
echo "  AWS_ROLE_ARN = ${ROLE_ARN}"
echo "  AWS_REGION   = ${REGION}"
echo ""
echo "  The infra and demo CI/CD pipelines are now ready to run."
echo "  Push to main (touching infra/ or src/demo/) to trigger them."
