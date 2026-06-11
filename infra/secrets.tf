# After `tofu apply`, populate the value before starting the service:
#   aws secretsmanager put-secret-value \
#     --secret-id $(tofu output -raw session_secret_arn) \
#     --secret-string "$(openssl rand -hex 32)"

resource "aws_secretsmanager_secret" "session" {
  name        = "${var.app_name}/session-secret"
  description = "HMAC secret for BFF session cookies (SESSION_SECRET env var)"
}
