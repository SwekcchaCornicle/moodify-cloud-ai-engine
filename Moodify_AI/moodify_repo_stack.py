import json
import aws_cdk as cdk
from aws_cdk import (
    Stack,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_sns as sns,
    aws_stepfunctions as sfn,
    aws_stepfunctions_tasks as tasks,
    aws_sns_subscriptions as subscriptions,
    aws_ecr as ecr,
    aws_ssm as ssm,
    Duration,
    aws_ec2 as ec2,
    aws_secretsmanager as secretsmanager,
    SecretValue,
)
import shutil

environment = "dev"


class ConfigClass:
    def __init__(self, env, data):

        self.env = env
        print("env intilize")


# Load data from the environment file
with open("env_parameters.json") as env_file:
    data = json.load(env_file)

Config = ConfigClass(environment, data)


class MoodifyRepoStackack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Get AWS account info
        aws_account = Config.account_no
        aws_region = Config.region

        
        # Create lambda function
        _lambda.Function(
            self,
            "NxpMoodAnalyzerLambda",
            function_name="mood_analyzer",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="mood_analyzer.lambda_handler",
            code=_lambda.Code.from_asset(
                "lambdas/mood_analyzer"
            ),  # type: ignore
            timeout=Duration.minutes(15),
            
        )

        