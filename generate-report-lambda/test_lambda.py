#!/usr/bin/env python3
"""Local test harness for generate-report-lambda.

Usage examples (PowerShell):
  # Simple invoke (requires existing rows in DB)
  python test_lambda.py --team-id 1 --simulation-id 1 --api-key $env:API_KEY

  # Bootstrap minimal tables & seed data (IDs 200 & 100) using temp key:
  $env:API_KEY='dev-test-key'
  python test_lambda.py --team-id 1 --project-id 200 --simulation-id 100 --bootstrap --seed

Adds optional --bootstrap (creates minimal tables if missing) and --seed to insert sample rows.
"""
import sys
import os
import json
import argparse
import subprocess
import shutil
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode, quote_plus
from dotenv import load_dotenv

load_dotenv()


def build_db_dsn() -> str:
    url = os.getenv('DATABASE_URL')
    if url:
        parsed = urlparse(url)
        scheme = parsed.scheme or 'postgresql'
        if scheme == 'postgres':
            scheme = 'postgresql'
        q = dict(parse_qsl(parsed.query, keep_blank_values=True))
        host = parsed.hostname or ''
        if (('neon.tech' in host) or ('aws.neon.tech' in host)) and 'sslmode' not in q:
            q['sslmode'] = 'require'
        return urlunparse((scheme, parsed.netloc, parsed.path, parsed.params, urlencode(q), parsed.fragment))

    host = os.getenv('POSTGRES_HOST') or ''
    user = os.getenv('POSTGRES_USER') or ''
    password = os.getenv('POSTGRES_PASSWORD') or ''
    db_raw = os.getenv('POSTGRES_DB') or 'postgres'
    port = os.getenv('POSTGRES_PORT') or '5432'
    sslmode = os.getenv('POSTGRES_SSLMODE')

    if '?' in db_raw:
        db_name, existing_query = db_raw.split('?', 1)
    else:
        db_name, existing_query = db_raw, ''

    if host and '?' in host:
        host = host.split('?', 1)[0]

    q = {}
    if existing_query:
        q.update(dict(parse_qsl(existing_query, keep_blank_values=True)))
    if sslmode and 'sslmode' not in q:
        q['sslmode'] = sslmode
    if (('neon.tech' in host) or ('aws.neon.tech' in host)) and 'sslmode' not in q:
        q['sslmode'] = 'require'

    netloc = f"{quote_plus(user)}:{quote_plus(password)}@{host}:{int(port)}"
    return urlunparse(('postgresql', netloc, f'/{db_name}', '', urlencode(q), ''))


def parse_args():
    p = argparse.ArgumentParser(description='Local tester for generate-report-lambda handler.')
    p.add_argument('--team-id', type=int, default=1)
    p.add_argument('--project-id', type=int, default=1)
    p.add_argument('--simulation-id', type=int, default=1)
    p.add_argument('--title', default='Report')
    p.add_argument('--api-key', default=os.getenv('API_KEY') or 'dev-test-key', help='API key to send in headers (sets env if missing)')
    p.add_argument('--bootstrap', action='store_true', help='Create minimal tables if they do not exist.')
    p.add_argument('--seed', action='store_true', help='Insert sample project + simulation rows if missing.')
    p.add_argument('--force-local', action='store_true', help='Ignore REPORTS_BUCKET_NAME and use local filesystem for plots & doc.')
    p.add_argument('--auto-install', action='store_true', help='Automatically pip install project deps if missing.')
    return p.parse_args()


def ensure_tables_and_seed(engine, args):
    from sqlalchemy import text
    with engine.begin() as conn:
        if args.bootstrap:
            conn.execute(text('''CREATE TABLE IF NOT EXISTS projects (id INT PRIMARY KEY, team_id INT NOT NULL)'''))
            conn.execute(text('''CREATE TABLE IF NOT EXISTS simulations (id INT PRIMARY KEY, project_id INT NOT NULL, drawing_id INT NULL)'''))
            conn.execute(text('''CREATE TABLE IF NOT EXISTS reports (id UUID PRIMARY KEY, simulation_id INT NOT NULL, title TEXT, team_id INT, project_id INT, drawing_id INT, s3_key TEXT)'''))
        if args.seed:
            res = conn.execute(text('SELECT 1 FROM projects WHERE id=:pid'), {'pid': args.project_id}).first()
            if not res:
                conn.execute(text('INSERT INTO projects (id, team_id) VALUES (:pid, :tid)'), {'pid': args.project_id, 'tid': args.team_id})
            res = conn.execute(text('SELECT 1 FROM simulations WHERE id=:sid'), {'sid': args.simulation_id}).first()
            if not res:
                conn.execute(text('INSERT INTO simulations (id, project_id) VALUES (:sid, :pid)'), {'sid': args.simulation_id, 'pid': args.project_id})


def attempt_auto_install():
    """Install project dependencies using uv (preferred) else pip.

    Strategy:
      1. If uv present: ensure fresh .venv (recreate if broken), run `uv venv` then `uv sync`.
      2. Fallback: python -m venv .venv + pip install -e .
    """
    proj_root = os.path.dirname(__file__)
    pyproject = os.path.join(proj_root, 'pyproject.toml')
    if not os.path.exists(pyproject):
        print('[auto-install] No pyproject.toml found; skipping.')
        return
    venv_dir = os.path.join(proj_root, '.venv')
    pyvenv_cfg = os.path.join(venv_dir, 'pyvenv.cfg')
    uv_path = shutil.which('uv')
    if uv_path:
        try:
            if os.path.isdir(venv_dir) and not os.path.isfile(pyvenv_cfg):
                print('[auto-install] Existing .venv appears broken (missing pyvenv.cfg); removing...')
                shutil.rmtree(venv_dir, ignore_errors=True)
            if not os.path.isdir(venv_dir):
                print('[auto-install] Creating virtual environment with uv venv ...')
                subprocess.check_call([uv_path, 'venv'], cwd=proj_root)
            print('[auto-install] Syncing dependencies with uv sync ...')
            subprocess.check_call([uv_path, 'sync'], cwd=proj_root)
            print('[auto-install] uv sync completed.')
            # Inject site-packages for current process
            sp = os.path.join(venv_dir, 'Lib', 'site-packages') if os.name == 'nt' else os.path.join(venv_dir, 'lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages')
            if os.path.isdir(sp) and sp not in sys.path:
                sys.path.insert(0, sp)
                print(f'[auto-install] Added {sp} to sys.path')
            return
        except subprocess.CalledProcessError as e:
            print(f'[auto-install][warn] uv failed (code {e.returncode}); falling back to pip.')
    # Fallback to pip editable install
    if not os.path.isdir(venv_dir):
        print('[auto-install] Creating virtual environment with python -m venv .venv ...')
        subprocess.check_call([sys.executable, '-m', 'venv', '.venv'], cwd=proj_root)
    pip_exe = os.path.join(venv_dir, 'Scripts', 'pip.exe') if os.name == 'nt' else os.path.join(venv_dir, 'bin', 'pip')
    if not os.path.isfile(pip_exe):
        pip_exe = sys.executable  # fall back to global pip
        pip_cmd = [pip_exe, '-m', 'pip', 'install', '-e', '.']
    else:
        pip_cmd = [pip_exe, 'install', '-e', '.']
    print('[auto-install] Installing with pip (editable mode)...')
    subprocess.check_call(pip_cmd, cwd=proj_root)
    print('[auto-install] pip install completed.')
    sp = os.path.join(venv_dir, 'Lib', 'site-packages') if os.name == 'nt' else os.path.join(venv_dir, 'lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages')
    if os.path.isdir(sp) and sp not in sys.path:
        sys.path.insert(0, sp)
        print(f'[auto-install] Added {sp} to sys.path')


def import_handler_with_rescue(args):
    """Import the lambda handler, attempting remediation for common issues (missing deps, tables)."""
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
    try:
        from main import handler  # type: ignore
        return handler
    except ModuleNotFoundError as e:
        missing = str(e).split("'")[-2]
        print(f"[test_lambda][warn] Missing dependency: {missing}")
        if args.auto_install:
            attempt_auto_install()
            from main import handler  # retry
            return handler
        else:
            print('Re-run with --auto-install to attempt automatic dependency installation.')
            raise
    except Exception as e:
        # Attempt to detect missing table errors and create minimal schema, then retry once
        msg = str(e).lower()
        if any(tok in msg for tok in ('no such table', 'does not exist')):
            print('[test_lambda][warn] Detected missing tables during import; creating minimal schema then retrying import.')
            dsn = build_db_dsn()
            from sqlalchemy import create_engine
            engine = create_engine(dsn, pool_pre_ping=True)
            class TempArgs: pass
            tmp = TempArgs(); tmp.bootstrap = True; tmp.seed = False; tmp.project_id = args.project_id; tmp.simulation_id = args.simulation_id; tmp.team_id = args.team_id
            ensure_tables_and_seed(engine, tmp)
            from main import handler  # type: ignore
            return handler
        raise


def main():
    args = parse_args()
    if not os.getenv('API_KEY'):
        os.environ['API_KEY'] = args.api_key

    # Force local storage if requested or placeholder bucket detected
    bucket = os.environ.get('REPORTS_BUCKET_NAME')
    if args.force_local or (bucket and 'your-reports-bucket-name' in bucket):
        os.environ.pop('REPORTS_BUCKET_NAME', None)
        print('[test_lambda] Using local filesystem storage (REPORTS_BUCKET_NAME unset).')

    dsn = build_db_dsn()
    if args.bootstrap or args.seed:
        from sqlalchemy import create_engine
        engine = create_engine(dsn, pool_pre_ping=True)
        ensure_tables_and_seed(engine, args)

    handler = import_handler_with_rescue(args)
    if args.force_local:
        # Clear again in case load_dotenv reloaded it during import
        os.environ['REPORTS_BUCKET_NAME'] = ''
        print('[test_lambda] Cleared REPORTS_BUCKET_NAME after import to ensure local mode.')

    event = {
        'headers': {'X-API-Key': os.environ.get('API_KEY')},
        'body': json.dumps({
            'team_id': args.team_id,
            'simulation_id': args.simulation_id,
            'title': args.title
        })
    }

    print('[test_lambda] Invoking handler with:')
    print(json.dumps(event, indent=2))

    result = handler(event, {})
    print('\n[test_lambda] Handler result:')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
