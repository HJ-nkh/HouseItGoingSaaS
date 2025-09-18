import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Export it before running this script.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function ensureColumn(table: string, column: string, ddl: string) {
  const rows = await sql<[{ exists: number }]>`SELECT 1 as exists FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}`;
  if (rows.length) {
    console.log(`${table}.${column} already exists`);
    return false;
  }
  console.log(`Adding ${table}.${column} ...`);
  await sql.unsafe(ddl);
  console.log(`Added ${table}.${column}`);
  return true;
}

async function main() {
  const changes: string[] = [];
  const didReports = await ensureColumn('reports', 's3_key', 'ALTER TABLE reports ADD COLUMN s3_key text');
  if (didReports) changes.push('reports.s3_key');
  const didProjects = await ensureColumn('projects', 's3_key', 'ALTER TABLE projects ADD COLUMN s3_key text');
  if (didProjects) changes.push('projects.s3_key');

  console.log('--- Verification ---');
  const verify = await sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('reports','projects') AND column_name='s3_key' ORDER BY table_name;`;
  for (const r of verify) {
    console.log(`${r.table_name}.${r.column_name}`);
  }

  if (changes.length === 0) {
    console.log('No changes applied.');
  } else {
    console.log('Applied:', changes.join(', '));
  }
  await sql.end();
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
