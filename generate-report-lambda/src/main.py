import sys
import os
import json
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode, quote_plus

# Append the path to the "src" folder and its parent folder to the system path (Lambda friendly)
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from src.create_report import create_report
from sqlalchemy.sql import select, insert
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine, Table, MetaData
from dotenv import load_dotenv

load_dotenv()

is_development = os.environ.get('API_ENV') == 'development'


def build_db_dsn() -> str:
    """Build a Postgres DSN from DATABASE_URL or POSTGRES_* vars (mirrors run-simulation lambda)."""
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


Base = declarative_base()

DSN = build_db_dsn()
print(f"[generate-report] Using DSN={DSN}")
engine = create_engine(DSN, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
session = Session()

metadata = MetaData()
projects_table = Table('projects', metadata, autoload_with=engine)
simulations_table = Table('simulations', metadata, autoload_with=engine)
reports_table = Table('reports', metadata, autoload_with=engine)


# Call with the following event:
# {
#     "user_id": str,
#     "simulation_id": int
# }

# Returns:
# {
#     "report_id": str
# }
def handler(event, context):
    # Validate API key from headers
    headers = event.get('headers', {})
    api_key = headers.get('x-api-key') or headers.get('X-API-Key')
    expected_api_key = os.environ.get('API_KEY')

    print("API Key:", api_key)
    print("Expected API Key:", expected_api_key)

    if not expected_api_key:
        print("API_KEY environment variable not set")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Server configuration error'})
        }

    if not api_key or api_key != expected_api_key:
        print("Invalid or missing API key")
        return {
            'statusCode': 401,
            'body': json.dumps({'error': 'Unauthorized'})
        }

    print("Called with event:", event)

    # Parse request body if it exists
    body = {}
    if 'body' in event:
        try:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }
    
    # Extract simulation parameters from body or direct event
    simulation_id = body.get('simulation_id') or event.get('simulation_id')
    user_id = body.get('user_id') or event.get('user_id')
    team_id = body.get('team_id') or event.get('team_id')

    # TODO: Validate against team_id
    simulation_row = session.execute(select(simulations_table).where(simulations_table.c.id == simulation_id)).first()
    if not simulation_row:
        return { 'statusCode': 404, 'body': json.dumps({'error': 'Simulation not found'}) }
    sim = simulation_row._mapping

    project_row = session.execute(
        select(projects_table).where(projects_table.c.team_id == team_id).where(projects_table.c.id == sim['project_id'])
    ).first()
    if not project_row:
        return { 'statusCode': 404, 'body': json.dumps({'error': 'Project not found or not in team'}) }
    proj = project_row._mapping
    print(f"Found project: {proj['id']}")

    requested_title = body.get('title') or 'Report'

    # Get state from simulation encoded_s (can be dict, JSON string, or bytes)
    s = sim.get('encoded_s')
    try:
        print(f"[generate-report] encoded_s python type={type(s).__name__}")
    except Exception:
        pass
    if isinstance(s, (bytes, bytearray)):
        try:
            s = s.decode('utf-8')
        except Exception:
            # Fallback to latin-1 to avoid crashing on odd bytes; downstream will validate JSON
            s = s.decode('latin-1', errors='ignore')

    report_meta = create_report(s, team_id, proj['id'], requested_title)
    print(f"report_id: {report_meta['report_id']}")

    insert_query = insert(reports_table).values(
        simulation_id=simulation_id,
        id=report_meta['report_id'],
        title=requested_title,
        team_id=team_id,
        project_id=sim['project_id'],
        drawing_id=sim.get('drawing_id'),
        s3_key=report_meta.get('s3_key')
    )
    session.execute(insert_query)
    session.commit()

    return {
        'statusCode': 200,
        'body': json.dumps({
            'report_id': report_meta['report_id'],
            's3_key': report_meta['s3_key'],
            'download_url': report_meta['download_url']
        })
    }

