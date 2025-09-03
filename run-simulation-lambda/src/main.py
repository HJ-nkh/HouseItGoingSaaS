import os
import json
import sys
from urllib.parse import urlparse

# Append the path to the "src" folder and its parent folder to the system path
# This is necessary for running on AWS Lambda
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv

# Delay SQLAlchemy imports until after env validation to reduce import-time failures
from sqlalchemy import create_engine, func, Table, MetaData, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import select, update

print("[main] module import starting", flush=True)
load_dotenv()
print("[main] dotenv loaded", flush=True)

is_development = os.environ.get('API_ENV') == 'development'

Base = declarative_base()

# Lazy-initialized DB globals to avoid import-time failures
engine = None
Session = None
metadata = None
projects_table = None
simulations_table = None

def init_db_once():
    global engine, Session, metadata, projects_table, simulations_table
    if engine is not None:
        return
    # Prefer the same var the Next.js app uses: DATABASE_URL (then POSTGRES_URL)
    source_var = None
    database_url = None
    if os.environ.get('DATABASE_URL'):
        database_url = os.environ.get('DATABASE_URL')
        source_var = 'DATABASE_URL'
    elif os.environ.get('POSTGRES_URL'):
        database_url = os.environ.get('POSTGRES_URL')
        source_var = 'POSTGRES_URL'

    if not database_url:
        # Fall back to discrete vars with multiple naming schemes
        user = os.environ.get('POSTGRES_USER') or os.environ.get('PGUSER')
        password = os.environ.get('POSTGRES_PASSWORD') or os.environ.get('PGPASSWORD')
        host = os.environ.get('POSTGRES_HOST') or os.environ.get('PGHOST') or 'localhost'
        port = os.environ.get('POSTGRES_PORT') or os.environ.get('PGPORT') or '5432'
        dbname = os.environ.get('POSTGRES_DB') or os.environ.get('POSTGRES_DATABASE') or os.environ.get('PGDATABASE')

        missing = [name for name, val in [
            ('user', user), ('password', password), ('host', host), ('port', port), ('database', dbname)
        ] if not val]
        if missing:
            raise RuntimeError(f"Missing DB environment variables: {', '.join(missing)}")

    database_url = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"
    source_var = 'assembled_from_parts'

    # Normalize scheme for SQLAlchemy if env provides postgres:// or postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql+psycopg2://', 1)
    elif database_url.startswith('postgresql://'):
        database_url = database_url.replace('postgresql://', 'postgresql+psycopg2://', 1)

    # Basic sanity parse to catch malformed URLs early
    try:
        parsed = urlparse(database_url)
        if not parsed.scheme.startswith('postgres'):
            raise ValueError('Not a postgres URL')
    except Exception as e:
        raise RuntimeError(f"Invalid database URL: {database_url}. Error: {e}")
    # Keep it simple; could set connect timeout via connect_args if needed
    print(f"[db] using URL source={source_var}")
    engine = create_engine(database_url)
    # Ensure we always use the expected schema regardless of DB defaults
    try:
        def _set_search_path(dbapi_connection, connection_record):
            try:
                cur = dbapi_connection.cursor()
                cur.execute("SET search_path TO public")
                cur.close()
            except Exception as e:
                # Non-fatal; continue with default if this fails
                print(f"[db] set search_path failed: {e}", flush=True)
        event.listen(engine, "connect", _set_search_path)
    except Exception as e:
        print(f"[db] event listen failed: {e}", flush=True)
    Session = sessionmaker(bind=engine)
    metadata = MetaData()
    projects_table = Table('projects', metadata, autoload_with=engine)
    simulations_table = Table('simulations', metadata, autoload_with=engine)


def handler(event, context):
    print("[handler] invoked", flush=True)
    try:
        # Print a safe DB host (no creds) to verify environment targeting
        db_url = os.environ.get('POSTGRES_URL') or os.environ.get('DATABASE_URL') or ''
        if db_url:
            from urllib.parse import urlparse
            _p = urlparse(db_url)
            print(f"[env] db_host={_p.hostname} db_port={_p.port}")
    except Exception:
        pass
    # Validate API key from headers
    headers = event.get('headers', {})
    api_key = headers.get('x-api-key') or headers.get('X-API-Key')
    # Accept either API_KEY or LAMBDA_API_KEY from env
    expected_api_key = os.environ.get('API_KEY') or os.environ.get('LAMBDA_API_KEY')

    
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

    # Optional health check to avoid full runs: GET {function_url}/health
    method = (event.get('requestContext', {}).get('http', {}) or {}).get('method')
    raw_path = event.get('rawPath') or event.get('path') or ''
    if method == 'GET' and '/health' in str(raw_path):
        try:
            init_db_once()
            # quick DB ping
            sess = Session()
            sess.execute(select(1))
            sess.close()
            return {
                'statusCode': 200,
                'body': json.dumps({'ok': True, 'db': True})
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({'ok': False, 'db': False, 'message': str(e)})
            }
    
    # Parse request body if it exists (handle base64)
    body = {}
    if 'body' in event:
        try:
            payload = event['body']
            if event.get('isBase64Encoded') is True and isinstance(payload, str):
                import base64
                payload = base64.b64decode(payload).decode('utf-8', errors='replace')
            body = json.loads(payload) if isinstance(payload, str) else payload
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }

    # Extract parameters (support multiple field names)
    simulation_id = body.get('simulation_id') or event.get('simulation_id') or event.get('simulationId')
    team_id = body.get('team_id') or event.get('team_id') or event.get('teamId')

    if not simulation_id or not team_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing simulation_id or team_id'})
        }

    # Normalize to integers to avoid type mismatch in SQL
    try:
        simulation_id = int(simulation_id)
        team_id = int(team_id)
    except Exception:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'simulation_id and team_id must be integers'})
        }

    print(f"[input] team_id={team_id} simulation_id={simulation_id}")
    
    from lib.serialization import serialize_instance, default_handler
    from Moon2Mars.S import S
    from Moon2Mars.Frame_FEM import Model
    from Moon2Mars.Project import Project
    import pickle
    import base64
    import math

    # Initialize DB (lazy) and session
    try:
        init_db_once()
        session = Session()
    except Exception as e:
        print(f"DB initialization failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Server configuration error: DB', 'message': str(e)})
        }

    # DB probe diagnostics
    try:
        sp = session.execute(text("SHOW search_path")).scalar()
        curr_db = session.execute(text("select current_database()")).scalar()
        neon_branch = None
        try:
            neon_branch = session.execute(text("select current_setting('neon.branch_name', true)")) .scalar()
        except Exception:
            pass
        total = session.execute(select(func.count()).select_from(simulations_table)).scalar()
        max_id = session.execute(select(func.max(simulations_table.c.id))).scalar()
        last5 = session.execute(select(simulations_table.c.id).order_by(simulations_table.c.id.desc()).limit(5)).scalars().all()
        # Explicitly query public.simulations as well to rule out search_path surprises
        total_pub = session.execute(text("select count(*) from public.simulations")).scalar()
        max_pub = session.execute(text("select max(id) from public.simulations")).scalar()
        # Where do our tables live?
        table_info = session.execute(text("select table_schema, table_name from information_schema.tables where table_name in ('simulations','projects') order by table_schema, table_name")) .mappings().all()
        print(f"[probe] db={curr_db} branch={neon_branch} search_path={sp} total={total} max_id={max_id} last5={last5} total_pub={total_pub} max_pub={max_pub} tables={table_info}")
    except Exception as e:
        print(f"[probe] failed: {e}")

    # Lookup with small configurable retry window to handle read-after-write timing
    simulation_query = select(simulations_table).where(simulations_table.c.team_id == team_id).where(simulations_table.c.id == simulation_id)
    retries = int(os.environ.get('LOOKUP_RETRIES', '4'))
    delay_ms = int(os.environ.get('LOOKUP_RETRY_DELAY_MS', '250'))
    attempt = 0
    sim_row = None
    while attempt <= retries:
        sim_row = session.execute(simulation_query).mappings().first()
        if sim_row is not None:
            break
        if attempt == 0:
            print("[lookup] not found on first attempt, retrying...", flush=True)
        attempt += 1
        if attempt <= retries:
            import time
            time.sleep(max(0, delay_ms) / 1000.0)

    if sim_row is None:
        # Extra diagnostics: does the simulation exist by ID at all?
        try:
            by_id = session.execute(select(simulations_table).where(simulations_table.c.id == simulation_id)).mappings().first()
            if by_id is not None:
                # Found by ID but team mismatch
                found_team = by_id.get('team_id') if 'team_id' in by_id else None
                print(f"Simulation exists but team mismatch (expected team_id={team_id}, found team_id={found_team}, simulation_id={simulation_id})")
        except Exception:
            pass
        print(f"Simulation not found (team_id={team_id}, simulation_id={simulation_id})")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Simulation not found', 'team_id': team_id, 'simulation_id': simulation_id})
        }

    if (sim_row['status'] != "pending" and not is_development):
        print("Simulation not pending")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Simulation is not in pending status'})
        }

    project_query = select(projects_table).where(projects_table.c.id == sim_row['project_id'])
    project_row = session.execute(project_query).mappings().first()

    if project_row is None:
        print("Project not found")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Project not found'})
        }

    # Update simulation status and start time
    update_query = update(simulations_table).where(simulations_table.c.id == simulation_id).values(status="running", start_time=func.now())
    session.execute(update_query)
    session.commit()

    # Construct model and map entities safely
    project = Project()
    model = Model()
    s = S(model, project)

    # Add project details
    project.addProjectNumber('!Ptest')
    project.addCC('CC2')
    project.selfweightTrueFalse(True)
    project.addNumberOfLevelsAbove(1)
    project.robustFactorTrueFalse(False)
    project.addDeformationCriteriaSteel(400)
    # defCritWood1 = 400, defCritWood2 = 250 for DA nationalt anneks
    project.addDeformationCriteriaWood(400, 250)

    # Safely parse entities
    entities_val = sim_row.get('entities')
    if isinstance(entities_val, dict):
        entity_set = entities_val
    else:
        try:
            entity_set = json.loads(entities_val) if entities_val else {}
        except Exception:
            entity_set = {}

    try:
        # Add members
        model.addMembers(entity_set)

        # Add supports
        for id, support in (entity_set.get('supports') or {}).items():
            resolved = support.get('resolved') or {}
            x = resolved.get('x')
            y = resolved.get('y')
            stype = support.get('type')
            if x is None or y is None:
                continue
            if stype == 'Fixed':
                model.addSupport([x, y], 'x')
                model.addSupport([x, y], 'y')
                model.addSupport([x, y], 'r')
            elif stype == 'Pinned':
                model.addSupport([x, y], 'x')
                model.addSupport([x, y], 'y')
            elif stype == 'Roller':
                ang = support.get('angle')
                if ang in (0, 180):
                    model.addSupport([x, y], 'y')
                elif ang in (90, 270):
                    model.addSupport([x, y], 'x')

        # Add point loads
        for id, point_load in (entity_set.get('pointLoads') or {}).items():
            ltype = point_load.get('type')
            if ltype == 'Dead': ltype = 'Egenlast'
            elif ltype == 'Live': ltype = 'Nyttelast'
            elif ltype == 'Snow': ltype = 'Snelast'
            elif ltype == 'Wind': ltype = 'Vindlast'
            else: ltype = 'Standard'

            resolved = point_load.get('resolved') or {}
            x = resolved.get('x')
            y = resolved.get('y')
            if x is None or y is None:
                continue
            # TODO: Resolve fx/fy from magnitude/angle (placeholder values)
            fx = 0
            fy = -10000
            s.addPointLoad([x, y], [fx, fy], ltype, id)

        # Add line loads
        for id, line_load in (entity_set.get('distributedLoads') or {}).items():
            resolved = line_load.get('resolved') or {}
            p1 = (resolved.get('point1') or {})
            p2 = (resolved.get('point2') or {})
            if 'x' not in p1 or 'x' not in p2 or 'y' not in p1 or 'y' not in p2:
                continue
            if p1['x'] <= p2['x']:
                x1, y1, x2, y2 = p1['x'], p1['y'], p2['x'], p2['y']
            else:
                x1, y1, x2, y2 = p2['x'], p2['y'], p1['x'], p1['y']

            ltype = line_load.get('type')
            if ltype in ('Standard', 'Dead', 'Live'):
                lx1 = line_load.get('magnitude1') or 0
                lx2 = line_load.get('magnitude2') or 0
                name = {'Standard':'Standard','Dead':'Egenlast','Live':'Nyttelast'}[ltype]
                fx1, fy1, fx2, fy2 = 0, -lx1*10**3, 0, -lx2*10**3
                ltype = name
            elif ltype == 'Snow':
                dx, dy = x2-x1, y2-y1
                c = math.sqrt(dx**2+dy**2) or 1
                scaleSnow = abs((dx)/c)
                m1 = line_load.get('magnitude1') or 0
                m2 = line_load.get('magnitude2') or 0
                fx1, fy1, fx2, fy2 = 0, -scaleSnow*m1*10**3, 0, -scaleSnow*m2*10**3
                ltype = 'Snelast'
            elif ltype == 'Wind':
                dx, dy = x2-x1, y2-y1
                c = math.sqrt(dx**2+dy**2) or 1
                m1 = line_load.get('magnitude1') or 0
                m2 = line_load.get('magnitude2') or 0
                fx1 = m1/c*dy*10**3
                fy1 = -m1/c*dx*10**3
                fx2 = m2/c*dy*10**3
                fy2 = -m2/c*dx*10**3
                ltype = 'Vindlast'
            else:
                # Unknown type
                continue

            s.addLineLoad([x1, y1], [x2, y2], [fx1, fy1], [fx2, fy2], ltype, id)

        # add moment loads
        for id, moment_load in (entity_set.get('momentLoads') or {}).items():
            resolved = moment_load.get('resolved') or {}
            x = resolved.get('x')
            y = resolved.get('y')
            if x is None or y is None:
                continue
            M0 = (moment_load.get('magnitude') or 0) * 10**3
            ltype = moment_load.get('type') or 'Standard'
            s.addMoment([x, y], [M0], ltype, id)

        # add self weight
        if getattr(project, 'selfweightOnOff', False):
            s.addSelfweight()
    except Exception as e:
        # If entity mapping fails, record failure and return gracefully
        try:
            update_query = update(simulations_table).where(simulations_table.c.id == simulation_id).values(
                status="failed", end_time=func.now(), error=f"Entity mapping failed: {e}")
            session.execute(update_query)
            session.commit()
        except Exception:
            pass
        session.close()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Simulation failed during entity mapping', 'message': str(e), 'simulation_id': simulation_id})
        }

    try:
        # Run simulation
        s.run()

        members = {}
        # Build dict of members
        for b in s.member_discr:
            members[b["id"]] = b

        # Prepare results
        FEMModel = { "members": members, "X": s.X_discr, "T": s.T_discr, "R0_coor": s.R0_coordinates, "R0_types": s.R0_type }
        pickled_data = pickle.dumps(s)
        encoded_s = base64.b64encode(pickled_data)
        result = serialize_instance({
            "FEMModel": FEMModel,
            "forces": s.loadCombinationsFE_discr,
            "UR": s.sectionResults,
        })

        update_query = update(simulations_table).where(simulations_table.c.id == simulation_id).values(
            status="completed", end_time=func.now(), result=json.dumps(result, default=default_handler))
        session.execute(update_query)
        session.commit()
        session.close()

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Simulation completed successfully',
                'simulation_id': simulation_id
            })
        }
    
    except Exception as e:
        print(f"Simulation failed: {str(e)}")
        
        # Update simulation status to failed
        try:
            update_query = update(simulations_table).where(simulations_table.c.id == simulation_id).values(
                status="failed", end_time=func.now(), error=str(e))
            session.execute(update_query)
            session.commit()
            session.close()
        except Exception as db_error:
            print(f"Failed to update simulation status: {str(db_error)}")
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Simulation failed',
                'message': str(e),
                'simulation_id': simulation_id
            })
        }

