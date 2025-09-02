import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  try {
    const lambdaUrl = process.env.RUN_SIMULATION_LAMBDA_URL;
    const apiKey = process.env.LAMBDA_API_KEY || process.env.API_KEY;
    if (!lambdaUrl || !apiKey) {
      return NextResponse.json({ ok: false, error: 'Missing RUN_SIMULATION_LAMBDA_URL or API key' }, { status: 500 });
    }

    const body = { simulation_id: -1, team_id: -1 }; // invalid on purpose, should return 400/404 from Lambda, but proves POST path
    const start = Date.now();
    const res = await fetch(lambdaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(body),
      cache: 'no-store' as any,
    });
    const rttMs = Date.now() - start;
    const text = await res.text().catch(() => '');
    let data: any = {};
    try { data = JSON.parse(text || '{}'); } catch {}
    const reqId = res.headers.get('x-amzn-requestid') || res.headers.get('x-amzn-request-id');
    const errType = res.headers.get('x-amzn-errortype');

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      rttMs,
      requestId: reqId,
      errorType: errType,
      body: data || text,
    }, { status: res.ok ? 200 : res.status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
