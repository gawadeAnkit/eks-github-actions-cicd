output "ecr_repository_url" {
  description = "URI of the Amazon ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "eks_cluster_name" {
  description = "Name of the provisioned Amazon EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Kubernetes API server endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "kubeconfig_command" {
  description = "Command to configure local kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}
