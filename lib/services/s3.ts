import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
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
