import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
// Avoid supplying empty/expired creds; let default provider chain resolve (e.g. IAM role) when not explicitly set.
const explicitAccessKey = process.env.AWS_ACCESS_KEY_ID;
const explicitSecret = process.env.AWS_SECRET_ACCESS_KEY;
const explicitSession = process.env.AWS_SESSION_TOKEN;

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: (explicitAccessKey && explicitSecret)
    ? {
        accessKeyId: explicitAccessKey,
        secretAccessKey: explicitSecret,
        sessionToken: explicitSession, // include if present (STS)
      }
    : undefined,
});

/**
 * Generate a presigned URL for downloading a file from S3
 * @param bucketName - The S3 bucket name
 * @param key - The object key (file path) in S3
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - The presigned URL
 */
export interface PresignOptions {
  filename?: string;
  contentType?: string;
  // If true perform a HEAD first to ensure object exists
  headCheck?: boolean;
}

export async function generatePresignedUrl(
  bucketName: string,
  key: string,
  expiresIn: number = 3600, // 1 hour
  opts: PresignOptions = {}
): Promise<string> {
  try {
    if (opts.headCheck) {
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
      } catch (e: any) {
        if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound' || e?.Code === 'NotFound') {
          throw new Error('OBJECT_NOT_FOUND');
        }
        console.warn('[s3] HEAD failed but continuing to presign:', e);
      }
    }
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: opts.filename ? `attachment; filename="${opts.filename}"` : undefined,
      ResponseContentType: opts.contentType,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'OBJECT_NOT_FOUND') {
      throw error; // bubble for caller to map to 404
    }
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Generate the S3 key (file path) for a report
 * @param teamId - The team ID
 * @param projectId - The project ID
 * @param reportId - The report ID
 * @returns string - The S3 key
 */
export function generateReportKey(teamId: number, projectId: number, reportId: string): string {
  return `${teamId}/${projectId}/${reportId}.docx`;
}
