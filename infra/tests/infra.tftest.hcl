variables {
  aws_region = "eu-west-2"
  app_name   = "arbitrageiq-demo"
}

# ── Naming ────────────────────────────────────────────────────────────────────

run "naming_conventions" {
  command = plan

  assert {
    condition     = aws_ecr_repository.main.name == var.app_name
    error_message = "ECR repository name must match app_name"
  }

  assert {
    condition     = aws_ecs_task_definition.app.family == var.app_name
    error_message = "Task definition family must match app_name (maps to ECS_TASK_DEFINITION GitHub secret)"
  }

  assert {
    condition     = aws_ecs_service.app.name == var.app_name
    error_message = "ECS service name must match app_name"
  }
}

# ── Security ──────────────────────────────────────────────────────────────────

run "ecs_tasks_are_private" {
  command = plan

  assert {
    condition     = aws_ecs_service.app.network_configuration[0].assign_public_ip == false
    error_message = "ECS tasks must not have public IP addresses"
  }
}

run "alb_is_public" {
  command = plan

  assert {
    condition     = aws_lb.main.internal == false
    error_message = "ALB must be internet-facing"
  }
}

run "ecr_scan_on_push" {
  command = plan

  assert {
    condition     = aws_ecr_repository.main.image_scanning_configuration[0].scan_on_push == true
    error_message = "ECR repository must scan images on push"
  }
}

# ── Networking ────────────────────────────────────────────────────────────────

run "subnet_counts" {
  command = plan

  assert {
    condition     = length(aws_subnet.public) == 2
    error_message = "Must provision 2 public subnets for ALB multi-AZ"
  }

  assert {
    condition     = length(aws_subnet.private) == 2
    error_message = "Must provision 2 private subnets for ECS multi-AZ"
  }
}

run "alb_http_listener" {
  command = plan

  assert {
    condition     = aws_lb_listener.http.port == 80
    error_message = "ALB HTTP listener must be on port 80"
  }

  # When a certificate is provided, HTTP must redirect to HTTPS.
  assert {
    condition     = var.certificate_arn != null ? length(aws_lb_listener.https) == 1 : length(aws_lb_listener.https) == 0
    error_message = "HTTPS listener must exist when certificate_arn is set, and must not exist otherwise"
  }
}

# ── ECS configuration ─────────────────────────────────────────────────────────

run "task_sizing" {
  command = plan

  assert {
    condition     = aws_ecs_task_definition.app.cpu == tostring(var.task_cpu)
    error_message = "Task CPU must match var.task_cpu"
  }

  assert {
    condition     = aws_ecs_task_definition.app.memory == tostring(var.task_memory)
    error_message = "Task memory must match var.task_memory"
  }
}

run "log_retention" {
  command = plan

  assert {
    condition     = aws_cloudwatch_log_group.app.retention_in_days == var.log_retention_days
    error_message = "Log group retention must match var.log_retention_days"
  }
}

# ── Health check ──────────────────────────────────────────────────────────────

run "target_group_health_check" {
  command = plan

  assert {
    condition     = aws_lb_target_group.app.health_check[0].path == "/api/health"
    error_message = "Target group health check path must be /api/health"
  }

  assert {
    condition     = aws_lb_target_group.app.health_check[0].matcher == "200-299"
    error_message = "Target group health check matcher must be 200-299"
  }
}

# ── Secrets ────────────────────────────────────────────────────────────────────

run "session_secret_has_version" {
  command = apply

  assert {
    condition     = aws_secretsmanager_secret_version.session.secret_id == aws_secretsmanager_secret.session.id
    error_message = "Secret version must reference the session secret"
  }

  assert {
    condition     = length(aws_secretsmanager_secret_version.session.secret_string) > 0
    error_message = "Secret version must contain a non-empty secret value"
  }
}
