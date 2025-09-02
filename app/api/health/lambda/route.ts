import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const lambdaUrl = process.env.RUN_SIMULATION_LAMBDA_URL;
    const apiKey = process.env.LAMBDA_API_KEY || process.env.API_KEY;

    if (!lambdaUrl) {
      return NextResponse.json({ ok: false, error: 'Missing RUN_SIMULATION_LAMBDA_URL' }, { status: 500 });
    }
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Missing LAMBDA_API_KEY/API_KEY' }, { status: 500 });
    }

  const url = lambdaUrl.replace(/\/$/, '') + '/health';
  const start = Date.now();
  const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
      // keep it snappy
      // @ts-ignore Node 18 runtime supports RequestInit with signal via AbortController
      cache: 'no-store',
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
      url,
      rttMs,
      requestId: reqId,
      errorType: errType,
      body: data || text,
    }, { status: res.ok ? 200 : res.status });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
