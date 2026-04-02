import json
from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_iam as iam,
    aws_s3 as s3,
    aws_ssm as ssm,
    aws_lambda as _lambda,
    aws_apigateway as apigateway,
    aws_logs as logs,
)
from constructs import Construct

# ─────────────────────────────────────────────
# Environment & Configuration
# ─────────────────────────────────────────────

ENVIRONMENT = "dev"


class ConfigClass:
    """Loads and holds environment-specific configuration."""

    def __init__(self, env: str, data: dict):
        self.env = env
        self.account_no: str = data.get("account_no")
        self.region: str = data.get("region")
        self.spotify_client_id = data.get("spotify_client_id")
        self.spotify_client_secret = data.get("spotify_client_secret")



with open("env_parameters.json") as env_file:
    _env_data = json.load(env_file)

Config = ConfigClass(ENVIRONMENT, _env_data)


# ─────────────────────────────────────────────
# Stack
# ─────────────────────────────────────────────

class MoodifyRepoStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ── S3 Bucket ──────────────────────────────────────────────────────────
        moodify_bucket = s3.Bucket(
            self,
            "MoodifyS3Bucket",
            bucket_name="moodify-s3-bucket",
            enforce_ssl=True,
        )

        # ── CloudWatch Log Group ───────────────────────────────────────────────
        log_group = logs.LogGroup(
            self,
            "MoodifyLambdaLogGroup",
            log_group_name="/aws/lambda/mood_analyzer",
            retention=logs.RetentionDays.ONE_MONTH,
        )

        # ── IAM Role for Lambda ────────────────────────────────────────────────
        lambda_role = iam.Role(
            self,
            "MoodifyLambdaRole",
            role_name="moodify-lambda-role",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
        )

           # create a lambda layer with requests python library
        requests_lib_lambda_layer = _lambda.LayerVersion(
            self,
            "RequestsLibLayer",
            code=_lambda.Code.from_asset(
                "request_layer/python/requests.zip"
            ),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="Lambda layer with python library requests to create snow tickets",
            layer_version_name="requests_lib_layer",
        )

        # store requests layer version arn in ssm parameter to be accessible by other stacks
        ssm.StringParameter(
            self,
            "RequestsLibLayerVersionParam",
            description="Requests Lib Layer version arn",
            parameter_name="requests_lib_layer_version_arn",
            string_value=requests_lib_lambda_layer.layer_version_arn,
            tier=ssm.ParameterTier.STANDARD,
        )

        

        lambda_role.attach_inline_policy(
            iam.Policy(
                self,
                "MoodifyLambdaPolicy",
                statements=[
                    # S3 permissions
                    iam.PolicyStatement(
                        sid="S3Access",
                        actions=[
                            "s3:GetObject",
                            "s3:PutObject",
                            "s3:ListBucket",
                            "s3:DeleteObject",
                        ],
                        resources=[
                            moodify_bucket.bucket_arn,
                            f"{moodify_bucket.bucket_arn}/*",
                        ],
                    ),

                    # CloudWatch Logs permissions
                    iam.PolicyStatement(
                        sid="CloudWatchLogsAccess",
                        actions=[
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                            "logs:DescribeLogStreams",
                        ],
                        resources=[
                            log_group.log_group_arn,
                            f"{log_group.log_group_arn}:log-stream:*",
                        ],
                    ),

                    # ✅ SSM Parameter Store Access (FIXED)
                    iam.PolicyStatement(
                        sid="SSMParameterAccess",
                        actions=[
                            "ssm:GetParameter",
                            "ssm:GetParameters"
                        ],
                        resources=[
                            f"arn:aws:ssm:{self.region}:{self.account}:parameter/*"
                        ],
                    ),
                ],
            )
        )

        # ── Lambda Function ────────────────────────────────────────────────────
        mood_lambda = _lambda.Function(
            self,
            "MoodAnalyzerLambda",
            function_name="mood_analyzer",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="mood_analyzer.lambda_handler",
            code=_lambda.Code.from_asset("lambdas/mood_analyzer"),
            timeout=Duration.minutes(15),
            role=lambda_role,
            log_group=log_group,           # bind the explicit log group
            environment={
                "S3_BUCKET_NAME": moodify_bucket.bucket_name,
                "SPOTIFY_CLIENT_ID": Config.spotify_client_id,
                "SPOTIFY_CLIENT_SECRET": Config.spotify_client_secret,
            },
            layers=[requests_lib_lambda_layer]
        )

        # ── API Gateway ────────────────────────────────────────────────────────
        api = apigateway.RestApi(
            self,
            "MoodifyRestApi",
            rest_api_name="moodify-api",
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=["POST", "OPTIONS"],
                allow_headers=["Content-Type"],
            ),
        )

        playlist_resource = api.root.add_resource("playlist")
        playlist_resource.add_method(
            "POST",
            apigateway.LambdaIntegration(mood_lambda),
        )

        # ── Outputs ────────────────────────────────────────────────────────────
        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "LogGroupName", value=log_group.log_group_name)
        CfnOutput(self, "S3BucketName", value=moodify_bucket.bucket_name)