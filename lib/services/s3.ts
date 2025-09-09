import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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
export async function generatePresignedUrl(
  bucketName: string,
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return signedUrl;
  } catch (error) {
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
