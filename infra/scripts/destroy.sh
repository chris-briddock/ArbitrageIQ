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
# Versioning is enabled, so we must remove all object versions AND delete markers.
# A plain `aws s3 rm --recursive` only deletes the current (latest) version.
BUCKET=$(tofu output -raw state_bucket 2>/dev/null || echo "")
if [[ -n "$BUCKET" ]]; then
  echo "  Emptying state bucket $BUCKET (including all versions and delete markers)..."

  # Delete all object versions
  VERSIONS=$(aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --query 'Versions[].{Key:Key,VersionId:VersionId}' \
    --output json 2>/dev/null || echo "[]")

  if echo "$VERSIONS" | jq -e '. | length > 0' >/dev/null 2>&1; then
    echo "$VERSIONS" | jq -c '.[]' | while read -r entry; do
      KEY=$(echo "$entry" | jq -r '.Key')
      VID=$(echo "$entry" | jq -r '.VersionId')
      aws s3api delete-object --bucket "$BUCKET" --key "$KEY" --version-id "$VID"
    done
  fi

  # Delete all delete markers
  MARKERS=$(aws s3api list-object-versions \
    --bucket "$BUCKET" \
    --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' \
    --output json 2>/dev/null || echo "[]")

  if echo "$MARKERS" | jq -e '. | length > 0' >/dev/null 2>&1; then
    echo "$MARKERS" | jq -c '.[]' | while read -r entry; do
      KEY=$(echo "$entry" | jq -r '.Key')
      VID=$(echo "$entry" | jq -r '.VersionId')
      aws s3api delete-object --bucket "$BUCKET" --key "$KEY" --version-id "$VID"
    done
  fi
fi

tofu destroy -auto-approve -input=false

echo ""
echo "==> All infrastructure destroyed."
