variable "aws_region" {
  type        = string
  description = "AWS region for the state bucket and lock table."
  default     = "eu-west-2"
}

variable "state_bucket" {
  type        = string
  description = "S3 bucket name for OpenTofu state. Leave empty to auto-generate a globally unique name using the AWS account ID."
  default     = null
}

variable "lock_table" {
  type        = string
  description = "DynamoDB table name for state locking."
  default     = "arbitrageiq-state-lock"
}
