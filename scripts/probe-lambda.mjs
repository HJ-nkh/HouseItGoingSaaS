import fs from 'node:fs';
import path from 'node:path';

const root = 'c:/Users/Nicolas/HouseItGoingSaaS';
const envPath = path.join(root, '.env');
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = Object.fromEntries(envText.split(/\r?\n/).map(l => {
  const m = l.match(/^(\w+)=(.*)$/);
  return m ? [m[1], m[2]] : [null, null];
}).filter(Boolean));

const URL = (env.RUN_SIMULATION_LAMBDA_URL || '').trim();
const API = (env.LAMBDA_API_KEY || '').trim();

if (!URL || !API) {
  console.error('Missing RUN_SIMULATION_LAMBDA_URL or LAMBDA_API_KEY in .env');
  process.exit(1);
}

const healthUrl = URL.replace(/\/$/, '') + '/health';

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, statusText: res.statusText, headers: Object.fromEntries(res.headers), body };
}

(async () => {
  console.log('GET', healthUrl);
  try {
    const h = await fetchJson(healthUrl, { method: 'GET', headers: { 'X-API-Key': API } });
    console.log('Health:', JSON.stringify(h));
  } catch (e) {
    console.error('Health error:', e?.message || String(e));
  }

  console.log('POST', URL);
  try {
    const p = await fetchJson(URL, { method: 'POST', headers: { 'X-API-Key': API, 'Content-Type': 'application/json' }, body: JSON.stringify({ simulation_id: -1, team_id: -1 }) });
    console.log('Post:', JSON.stringify(p));
  } catch (e) {
    console.error('Post error:', e?.message || String(e));
  }
})();
