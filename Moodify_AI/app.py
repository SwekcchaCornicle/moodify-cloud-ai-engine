#!/usr/bin/env python3
import os
 
import aws_cdk as cdk
 
from  moodify_repo_stack import MoodifyRepoStack
 
 
app = cdk.App()
MoodifyRepoStack(
    app,
    "MoodifyRepoStack",
    env=cdk.Environment(
        account="630596767812",
        region="ap-south-1"
    )
)

 
    # Uncomment the next line if you know exactly what Account and Region you
    # want to deploy the stack to. */
 
    #env=cdk.Environment(account='123456789012', region='us-east-1'),
 
    # For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html

 
app.synth()