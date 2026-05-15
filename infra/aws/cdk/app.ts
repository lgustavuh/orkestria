#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OrkestriaStack } from './orkestria-stack';

const app = new cdk.App();

// Staging
new OrkestriaStack(app, 'OrkestriaStaging', {
  environment: 'staging',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

// Production
new OrkestriaStack(app, 'OrkestriaProduction', {
  environment: 'production',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

app.synth();
