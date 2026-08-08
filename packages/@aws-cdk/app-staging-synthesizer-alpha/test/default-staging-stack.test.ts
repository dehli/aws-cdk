import { App } from 'aws-cdk-lib';
import { BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { testWithXRepos } from './util';
import { DefaultStagingStack } from '../lib';

describe('default staging stack', () => {
  test('can have at least 20 ECR Repositories', () => {
    // Decreasing this number is a breaking change! We have committed
    // to supporting 20 ECR repositories in the template. We can only
    // increase this commitment, not decrease it.
    expect(testWithXRepos(20)).toBeTruthy();
  });

  describe('appId fails', () => {
    test('when appId > 20 characters', () => {
      const app = new App();
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId: 'a'.repeat(21),
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
      })).toThrow(/appId expected no more than 20 characters but got 21 characters./);
    });

    test('when uppercase characters are used', () => {
      const app = new App();
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId: 'ABCDEF',
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
      })).toThrow(/appId only accepts lowercase characters./);
    });

    test('when symbols are used', () => {
      const app = new App();
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId: 'ca$h',
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
      })).toThrow(/appId expects only letters, numbers, and dashes \('-'\)/);
    });

    test('when multiple rules broken at once', () => {
      const app = new App();
      const appId = 'AB&C'.repeat(10);
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId,
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
      })).toThrow([
        `appId ${appId} has errors:`,
        'appId expected no more than 20 characters but got 40 characters.',
        'appId only accepts lowercase characters.',
        'appId expects only letters, numbers, and dashes (\'-\')',
      ].join('\n'));
    });
  });

  describe('account-regional namespace', () => {
    test('fails when combined with stagingBucketName', () => {
      const app = new App();
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId: 'appid',
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
        stagingBucketName: 'my-staging-bucket',
        useAccountRegionalNamespace: true,
      })).toThrow(/'stagingBucketName' \(value: "my-staging-bucket"\) cannot be combined with 'useAccountRegionalNamespace'/);
    });

    test('fails when the resulting bucket name would exceed 63 characters', () => {
      const app = new App();
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId: 'a'.repeat(20),
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
        useAccountRegionalNamespace: true,
        env: { account: '000000000000', region: 'us-isof-south-1' },
      })).toThrow(/would be 64 characters, but S3 bucket names may be at most 63; shorten 'appId' by 1 character\(s\)/);
    });

    // 'cdk-' + 20 + '-staging' = 32, plus '-<account(12)>-<region>-an' = 17 + region.length.
    test.each([
      ['us-east-1', 58],
      ['ap-southeast-7', 63], // longest ordinary region: exactly at the limit
    ])('succeeds for a maximum-length appId in %s (%d characters)', (region: string) => {
      const app = new App();
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId: 'a'.repeat(20),
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
        useAccountRegionalNamespace: true,
        env: { account: '000000000000', region },
      })).not.toThrow();
    });

    test('does not validate length for environment-agnostic stacks', () => {
      const app = new App();
      expect(() => new DefaultStagingStack(app, 'stack', {
        appId: 'a'.repeat(20),
        qualifier: 'qualifier',
        stagingBucketEncryption: BucketEncryption.S3_MANAGED,
        useAccountRegionalNamespace: true,
      })).not.toThrow();
    });
  });
});
