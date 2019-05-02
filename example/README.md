# Example

## Prerequisite

A VPC with at least two public subnets in different Availability Zones.

## Instructions

1. Deploy the ALB CloudFormation template `cf-alb.yml`. You will be ask the VpcId and the two public subnets Ids.
2. Once the stack creation is completed, get the HTTP listener ARN and the ALB auto-generated DNS name.
3. Set the `custom.alb.listener` property in the `serverless.yml` file.
4. Deploy the serverless stack `sls deploy`.

Then you can access your lambda at <ALB DNS name>/hello.