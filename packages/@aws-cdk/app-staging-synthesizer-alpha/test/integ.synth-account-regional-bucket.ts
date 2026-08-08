import * as integ from '@aws-cdk/integ-tests-alpha';
import { App, Stack } from 'aws-cdk-lib';
import { BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { APP_ID_MAX } from './util';
import { AppStagingSynthesizer } from '../lib';

const app = new App({
  context: {
    '@aws-cdk/aws-iam:minimizePolicies': true,
  },
});

const stackAccountRegionalBucket = new Stack(app, 'synthesize-account-regional-bucket', {
  synthesizer: AppStagingSynthesizer.defaultResources({
    appId: APP_ID_MAX, // maximum length appId, so this also covers the bucket name length limit
    stagingBucketEncryption: BucketEncryption.S3_MANAGED,
    useAccountRegionalNamespace: true,
  }),
});

const defaultStagingStack = app.node.tryFindChild(`StagingStack-${APP_ID_MAX}-ACCOUNT-REGION`) as Stack;
if (!defaultStagingStack) {
  throw new Error('Default Staging Stack not found.');
}

new integ.IntegTest(app, 'integ-tests', {
  testCases: [defaultStagingStack, stackAccountRegionalBucket],
});

app.synth();
