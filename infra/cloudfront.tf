# CloudFront in front of the ALB provides HTTPS on the AWS-provided
# *.cloudfront.net domain without owning a custom domain: TLS terminates at
# the edge with the default CloudFront certificate. The hop from CloudFront
# to the ALB stays plain HTTP on the AWS network because the ALB has no
# certificate — acceptable for this demo, not for real credentials.
#
# The app is fully dynamic (BFF session cookies), so the default behaviour
# disables caching and forwards all viewer headers, cookies, and query
# strings. Hashed build assets under /_next/static are immutable and cached.

locals {
  # AWS managed policy IDs (fixed, documented identifiers).
  cache_policy_caching_disabled  = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  cache_policy_caching_optimized = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  origin_request_all_viewer      = "216adef6-5c7f-47e4-b989-5492eafa07d3"
}

resource "aws_cloudfront_distribution" "main" {
  enabled      = true
  comment      = "${var.app_name} HTTPS entry point"
  price_class  = "PriceClass_100"
  http_version = "http2and3"

  # Do not block `tofu apply` on edge propagation (takes several minutes);
  # the distribution serves traffic once deployed.
  wait_for_deployment = false

  origin {
    origin_id   = "alb"
    domain_name = aws_lb.main.dns_name

    custom_origin_config {
      origin_protocol_policy = "http-only"
      http_port              = 80
      https_port             = 443
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = local.cache_policy_caching_disabled
    # AllViewer forwards the Host header, so the app builds redirect and
    # cookie URLs against the *.cloudfront.net domain, not the ALB's.
    origin_request_policy_id = local.origin_request_all_viewer
  }

  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id = local.cache_policy_caching_optimized
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = { Name = "${var.app_name}-cdn" }
}
