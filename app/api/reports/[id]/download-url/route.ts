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

  console.log(`[report-download] request reportId=${reportId}`);

    const report = await getReportById(reportId);
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Verify the user has access to this report through team membership
    if (report.teamId !== userWithTeam.teamId) {
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

  // Prefer stored s3Key (exact path used at generation time) else fall back to deterministic key
    const reportKey = (report as any).s3Key || generateReportKey(userWithTeam.teamId, report.projectId, report.id);
    console.log(`[report-download] using key=${reportKey} storedKey=${(report as any).s3Key ? 'yes' : 'no'}`);
    let downloadUrl: string;
    try {
      downloadUrl = await generatePresignedUrl(bucketName, reportKey, 900); // 15 min expiration
    } catch (e) {
      console.error('[report-download] presign failed for key', reportKey, e);
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }
    
    // Log the download activity
    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.DOWNLOAD_REPORT}: ${report.title}`,
      ipAddress: undefined,
    });

    return new NextResponse(JSON.stringify({ downloadUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[report-download] unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
