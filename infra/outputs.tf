output "app_url" {
  description = "HTTPS entry point for the app (CloudFront default domain)."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "alb_url" {
  description = "URL of the Application Load Balancer (HTTPS when certificate_arn is set, HTTP otherwise)."
  value       = var.certificate_arn != null ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "Full ECR image URI (without tag). Used as the base path in CI/CD."
  value       = aws_ecr_repository.main.repository_url
}

# ── Values to copy into GitHub Actions secrets ────────────────────────────────

output "ecr_repository_name" {
  description = "→ GitHub secret ECR_REPOSITORY"
  value       = aws_ecr_repository.main.name
}

output "ecs_cluster_name" {
  description = "→ GitHub secret ECS_CLUSTER"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "→ GitHub secret ECS_SERVICE"
  value       = aws_ecs_service.app.name
}

output "task_definition_family" {
  description = "→ GitHub secret ECS_TASK_DEFINITION"
  value       = aws_ecs_task_definition.app.family
}

output "session_secret_arn" {
  description = "Secrets Manager ARN — auto-populated on first apply (see secrets.tf)."
  value       = aws_secretsmanager_secret.session.arn
}
