import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

@Injectable()
export class S3Service {
  private client: S3Client;
  private bucket: string;
  private readonly logger = new Logger(S3Service.name);

  constructor(private config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'orkestria-files');

    this.client = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
      endpoint: config.get<string>('S3_ENDPOINT'),
      forcePathStyle: true, // Required for MinIO
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });

    // Auto-create bucket on startup
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      } catch (err) {
        this.logger.warn(`Could not create bucket: ${err}`);
      }
    }
  }

  async getPresignedUploadUrl(params: {
    projectId: string;
    projectName?: string;
    tenantSlug?: string;
    fileName: string;
    mimeType: string;
    context: 'project' | 'task' | 'delivery';
    contextId?: string;
  }) {
    const ext = params.fileName.split('.').pop() || '';
    const date = new Date().toISOString().split('T')[0];
    const safeName = (params.projectName || params.projectId)
      .replace(/[^a-zA-Z0-9\u00C0-\u024F _-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase() || 'uploads';
    const key = `${safeName}/${date}/${uuid()}.${ext}`;

    // Use tenant-specific bucket if available
    const targetBucket = params.tenantSlug ? `${params.tenantSlug}-files` : this.bucket;

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });

    return { url, key, bucket: targetBucket };
  }

  async getPresignedDownloadUrl(key: string, originalName?: string, bucket?: string) {
    const command = new GetObjectCommand({
      Bucket: bucket || this.bucket,
      Key: key,
      ...(originalName ? {
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalName)}"`,
      } : {}),
    });

    return getSignedUrl(this.client, command, { expiresIn: 900 });
  }

  async deleteObject(key: string, bucket?: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
  }


  async listObjects(bucket?: string, prefix?: string): Promise<{ key: string; size: number; lastModified: string }[]> {
    const results: { key: string; size: number; lastModified: string }[] = [];
    let continuationToken: string | undefined;
    
    do {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: bucket || this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }));
      
      for (const obj of response.Contents || []) {
        if (obj.Key) {
          results.push({
            key: obj.Key,
            size: obj.Size || 0,
            lastModified: obj.LastModified?.toISOString() || '',
          });
        }
      }
      
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    
    return results;
  }

  async createBucket(bucketName: string) {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucketName }));
      // Bucket already exists
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucketName }));
      this.logger.log(`Bucket created: ${bucketName}`);
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string, bucket?: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket || this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return { key, bucket: this.bucket };
  }

  async downloadObject(key: string, bucket?: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: bucket || this.bucket, Key: key }),
    );
    const stream = response.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
