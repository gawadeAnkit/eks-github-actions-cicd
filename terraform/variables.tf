variable "aws_region" {
  description = "AWS region for ECR and EKS resources"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "Name of the Amazon EKS cluster"
  type        = string
  default     = "devops-eks-cluster"
}

variable "ecr_repository_name" {
  description = "Name of the Amazon ECR repository"
  type        = string
  default     = "cloud-api-service"
}
