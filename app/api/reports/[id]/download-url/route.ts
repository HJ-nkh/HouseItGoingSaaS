import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getReportById } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { activityLogs, ActivityType } from '@/lib/db/schema';
import { generatePresignedUrl, generateReportKey } from '@/lib/services/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json(
        { error: 'User not associated with a team' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const reportId = id;

    console.log(`Getting download url for report ${reportId}`);

    const report = await getReportById(reportId);
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this report
    if (report.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Generate S3 presigned URL
    const bucketName = process.env.REPORTS_BUCKET_NAME;
    if (!bucketName) {
      console.error('REPORTS_BUCKET_NAME environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const reportKey = generateReportKey(user.id, report.projectId, report.id);
    const downloadUrl = await generatePresignedUrl(bucketName, reportKey, 3600); // 1 hour expiration
    
    // Log the download activity
    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.DOWNLOAD_REPORT}: ${report.title}`,
      ipAddress: undefined,
    });

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
