import json
from aws_cdk import (
    Stack,
    aws_iam as iam,
    aws_s3 as s3,
    aws_lambda as _lambda,
    Duration,
)
from constructs import Construct

environment = "dev"

class ConfigClass:
    def __init__(self, env, data):
        self.env = env
        self.account_no = data.get("account_no")
        self.region = data.get("region")
        print("env initialize")

# Load data from the environment file
with open("env_parameters.json") as env_file:
    data = json.load(env_file)

Config = ConfigClass(environment, data)

class MoodifyRepoStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        aws_account = Config.account_no
        aws_region = Config.region

        # Create S3 bucket
        moodify_s3_bucket = s3.Bucket(
            self,
            "NxpDataLoaderBucket",
            bucket_name="moodify-s3-bucket",
            enforce_ssl=True,
        )

        # Create Lambda role
        lambda_role = iam.Role(
            self,
            "NxpDataLoaderLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            role_name="moodify-lambda-role"
        )

        # Attach inline policy
        lambda_role.attach_inline_policy(
            iam.Policy(
                self,
                "NxpDataLoaderLambdaRolePolicy",
                statements=[
                    iam.PolicyStatement(
                        actions=[
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                        ],
                        resources=[f"arn:aws:logs:{aws_region}:{aws_account}:*"],
                    ),
                    iam.PolicyStatement(
                        actions=[
                            "s3:GetObject",
                            "s3:PutObject",
                            "s3:ListBucket",
                            "s3:DeleteObject",
                        ],
                        resources=[
                            f"{moodify_s3_bucket.bucket_arn}/*",
                            moodify_s3_bucket.bucket_arn,
                        ],
                    ),
                ],
            )
        )

        # Create Lambda function
        _lambda.Function(
            self,
            "MoodAnalyzerLambda",
            function_name="mood_analyzer",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="mood_analyzer.lambda_handler",
            code=_lambda.Code.from_asset("lambdas/mood_analyzer"),
            timeout=Duration.minutes(15),
            role=lambda_role,  # ✅ comma added
            environment={      # ✅ now valid
                "s3_bucket_name": moodify_s3_bucket.bucket_name,
            },
        )