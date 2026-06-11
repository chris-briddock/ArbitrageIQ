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

run "alb_listens_on_port_80" {
  command = plan

  assert {
    condition     = aws_lb_listener.http.port == 80
    error_message = "ALB listener must be on port 80"
  }
}

# ── ECS configuration ─────────────────────────────────────────────────────────

run "task_sizing" {
  command = plan

  assert {
    condition     = aws_ecs_task_definition.app.cpu == "512"
    error_message = "Task CPU must be 512 units (0.5 vCPU)"
  }

  assert {
    condition     = aws_ecs_task_definition.app.memory == "1024"
    error_message = "Task memory must be 1024 MiB"
  }
}

run "log_retention" {
  command = plan

  assert {
    condition     = aws_cloudwatch_log_group.app.retention_in_days == 30
    error_message = "Log group retention must be 30 days"
  }
}
