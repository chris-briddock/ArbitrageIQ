variable "aws_region" {
  type        = string
  description = "AWS region to deploy into."
  default     = "eu-west-2"
}

variable "app_name" {
  type        = string
  description = "Base name applied to all resources."
  default     = "arbitrageiq-demo"
}

variable "task_cpu" {
  type        = number
  description = "ECS task CPU units (1024 = 1 vCPU)."
  default     = 512
}

variable "task_memory" {
  type        = number
  description = "ECS task memory in MiB."
  default     = 1024
}

variable "desired_count" {
  type        = number
  description = "Number of ECS tasks to keep running."
  default     = 1
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention period in days."
  default     = 30
}

variable "certificate_arn" {
  type        = string
  description = "ARN of an ACM certificate for HTTPS. When set, the ALB uses an HTTPS listener and redirects HTTP → HTTPS. Leave null for HTTP-only (demo/internal use)."
  default     = null
}
