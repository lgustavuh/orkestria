import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

interface OrkestriaStackProps extends cdk.StackProps {
  environment: 'staging' | 'production';
}

export class OrkestriaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OrkestriaStackProps) {
    super(scope, id, props);

    const env = props.environment;
    const isProduction = env === 'production';

    // ── VPC ──────────────────────────────────────
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: isProduction ? 3 : 2,
      natGateways: isProduction ? 2 : 1,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // ── Security Groups ─────────────────────────
    const albSg = new ec2.SecurityGroup(this, 'AlbSg', { vpc, description: 'ALB' });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP redirect');

    const ecsSg = new ec2.SecurityGroup(this, 'EcsSg', { vpc, description: 'ECS Tasks' });
    ecsSg.addIngressRule(albSg, ec2.Port.tcp(4000), 'From ALB');

    const dbSg = new ec2.SecurityGroup(this, 'DbSg', { vpc, description: 'RDS' });
    dbSg.addIngressRule(ecsSg, ec2.Port.tcp(5432), 'From ECS');

    const redisSg = new ec2.SecurityGroup(this, 'RedisSg', { vpc, description: 'Redis' });
    redisSg.addIngressRule(ecsSg, ec2.Port.tcp(6379), 'From ECS');

    // ── RDS PostgreSQL ──────────────────────────
    const db = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      instanceType: isProduction
        ? ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL)
        : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      databaseName: 'orkestria',
      credentials: rds.Credentials.fromGeneratedSecret('orkestria_admin', {
        secretName: `orkestria-${env}-db-credentials`,
      }),
      multiAz: isProduction,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(isProduction ? 14 : 3),
      deletionProtection: isProduction,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ── ElastiCache Redis ───────────────────────
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnets', {
      description: 'Redis subnets',
      subnetIds: vpc.isolatedSubnets.map((s) => s.subnetId),
    });

    const redis = new elasticache.CfnCacheCluster(this, 'Redis', {
      engine: 'redis',
      cacheNodeType: isProduction ? 'cache.t4g.small' : 'cache.t4g.micro',
      numCacheNodes: 1,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSg.securityGroupId],
    });

    // ── S3 Bucket ───────────────────────────────
    const filesBucket = new s3.Bucket(this, 'FilesBucket', {
      bucketName: `orkestria-${env}-files-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(90),
          transitions: [
            { storageClass: s3.StorageClass.INFREQUENT_ACCESS, transitionAfter: cdk.Duration.days(30) },
          ],
        },
      ],
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // Restrict in production
          maxAge: 3600,
        },
      ],
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ── CloudFront for S3 ───────────────────────
    const cdn = new cloudfront.Distribution(this, 'CDN', {
      defaultBehavior: {
        origin: new origins.S3Origin(filesBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    // ── ECS Cluster ─────────────────────────────
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `orkestria-${env}`,
      containerInsights: isProduction,
    });

    // ── ECR Repositories ────────────────────────
    const apiRepo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: `orkestria-${env}-api`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const workerRepo = new ecr.Repository(this, 'WorkerRepo', {
      repositoryName: `orkestria-${env}-worker`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Log Groups ──────────────────────────────
    const apiLogs = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: `/orkestria/${env}/api`,
      retention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const workerLogs = new logs.LogGroup(this, 'WorkerLogs', {
      logGroupName: `/orkestria/${env}/worker`,
      retention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Task Definition: API ────────────────────
    const apiTaskDef = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      memoryLimitMiB: isProduction ? 1024 : 512,
      cpu: isProduction ? 512 : 256,
    });

    filesBucket.grantReadWrite(apiTaskDef.taskRole);

    const apiContainer = apiTaskDef.addContainer('api', {
      image: ecs.ContainerImage.fromEcrRepository(apiRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'api', logGroup: apiLogs }),
      environment: {
        NODE_ENV: env === 'production' ? 'production' : 'staging',
        PORT: '4000',
        S3_BUCKET: filesBucket.bucketName,
        AWS_REGION: this.region,
        REDIS_HOST: redis.attrRedisEndpointAddress,
        REDIS_PORT: redis.attrRedisEndpointPort,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(this, 'DbUrl', {
            parameterName: `/orkestria/${env}/database-url`,
          }),
        ),
        JWT_SECRET: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(this, 'JwtSecret', {
            parameterName: `/orkestria/${env}/jwt-secret`,
          }),
        ),
      },
      portMappings: [{ containerPort: 4000 }],
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://localhost:4000/api/v1 || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    // ── Task Definition: Worker ─────────────────
    const workerTaskDef = new ecs.FargateTaskDefinition(this, 'WorkerTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    filesBucket.grantReadWrite(workerTaskDef.taskRole);

    workerTaskDef.addContainer('worker', {
      image: ecs.ContainerImage.fromEcrRepository(workerRepo, 'latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'worker', logGroup: workerLogs }),
      environment: {
        NODE_ENV: env === 'production' ? 'production' : 'staging',
        REDIS_HOST: redis.attrRedisEndpointAddress,
        REDIS_PORT: redis.attrRedisEndpointPort,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(this, 'WorkerDbUrl', {
            parameterName: `/orkestria/${env}/database-url`,
          }),
        ),
      },
    });

    // ── ALB ─────────────────────────────────────
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    const listener = alb.addListener('HttpsListener', {
      port: 80, // Use 443 + certificate in production
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    // ── ECS Services ────────────────────────────
    const apiService = new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition: apiTaskDef,
      desiredCount: isProduction ? 2 : 1,
      securityGroups: [ecsSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      circuitBreaker: { rollback: true },
    });

    listener.addTargets('ApiTarget', {
      port: 4000,
      targets: [apiService],
      healthCheck: {
        path: '/api/v1',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
      },
    });

    if (isProduction) {
      const scaling = apiService.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 8 });
      scaling.scaleOnCpuUtilization('CpuScaling', { targetUtilizationPercent: 70 });
      scaling.scaleOnMemoryUtilization('MemScaling', { targetUtilizationPercent: 80 });
    }

    const workerService = new ecs.FargateService(this, 'WorkerService', {
      cluster,
      taskDefinition: workerTaskDef,
      desiredCount: 1,
      securityGroups: [ecsSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // ── Outputs ─────────────────────────────────
    new cdk.CfnOutput(this, 'AlbDns', { value: alb.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'CdnDomain', { value: cdn.distributionDomainName });
    new cdk.CfnOutput(this, 'BucketName', { value: filesBucket.bucketName });
    new cdk.CfnOutput(this, 'DbEndpoint', { value: db.dbInstanceEndpointAddress });
    new cdk.CfnOutput(this, 'RedisEndpoint', { value: redis.attrRedisEndpointAddress });
  }
}
