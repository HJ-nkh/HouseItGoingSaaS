import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/db/drizzle';

export async function GET(_req: NextRequest) {
  try {
    // postgres-js tagged template returns rows as objects
    const dbNameRows = await client.unsafe('select current_database() as name');
    const dbName = dbNameRows?.[0]?.name ?? null;
    const sims = await client.unsafe('select count(*)::int as count, max(id) as max_id from simulations');
    return NextResponse.json({ ok: true, dbName, simulations: { count: sims?.[0]?.count ?? null, maxId: sims?.[0]?.max_id ?? null } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
