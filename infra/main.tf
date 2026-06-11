terraform {
  required_version = ">= 1.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Partial backend configuration — supply the rest via backend.tfvars:
  #   tofu init -backend-config=backend.tfvars
  backend "s3" {
    key     = "arbitrageiq-demo/terraform.tfstate"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}
