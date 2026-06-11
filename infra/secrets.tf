# Session secret is auto-generated on first apply via random_password.
# To rotate: taint random_password.session_secret and re-apply,
# or update the value manually in the AWS console.

resource "random_password" "session_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "session" {
  name        = "${var.app_name}/session-secret"
  description = "HMAC secret for BFF session cookies (SESSION_SECRET env var)"
}

resource "aws_secretsmanager_secret_version" "session" {
  secret_id     = aws_secretsmanager_secret.session.id
  secret_string = random_password.session_secret.result
}
