import os
import json
import sys

# Append the path to the "src" folder and its parent folder to the system path
# This is necessary for running on AWS Lambda
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv

from sqlalchemy import create_engine, func, Table, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import select, update
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode, quote_plus

load_dotenv()

is_development = os.environ.get('API_ENV') == 'development'


def build_db_dsn() -> str:
    """Build a Postgres DSN from DATABASE_URL or POSTGRES_* without duplicating sslmode."""
    url = os.getenv('DATABASE_URL')
    if url:
        parsed = urlparse(url)
        # SQLAlchemy expects 'postgresql', normalize if we get 'postgres'
        scheme = parsed.scheme or 'postgresql'
        if scheme == 'postgres':
            scheme = 'postgresql'
        q = dict(parse_qsl(parsed.query, keep_blank_values=True))
        host = parsed.hostname or ''
        if (('neon.tech' in host) or ('aws.neon.tech' in host)) and 'sslmode' not in q:
            q['sslmode'] = 'require'
        return urlunparse((
            scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            urlencode(q),
            parsed.fragment,
        ))

    # Assemble from parts
    host = os.getenv('POSTGRES_HOST') or ''
    user = os.getenv('POSTGRES_USER') or ''
    password = os.getenv('POSTGRES_PASSWORD') or ''
    db_raw = os.getenv('POSTGRES_DB') or 'postgres'
    port = os.getenv('POSTGRES_PORT') or '5432'
    sslmode = os.getenv('POSTGRES_SSLMODE')

    # Allow POSTGRES_DB to include query, e.g., "neondb?sslmode=require"
    if '?' in db_raw:
        db_name, existing_query = db_raw.split('?', 1)
    else:
        db_name, existing_query = db_raw, ''

    # Clean host if someone appended query by mistake
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

# Build DSN and initialize engine
DSN = build_db_dsn()
# Log the actual connection target parsed from the DSN to avoid confusion with local POSTGRES_* vars
try:
    _p = urlparse(DSN)
    _host = _p.hostname or 'unknown'
    _port = _p.port or 5432
    print(f"[db] connecting to host={_host} port={_port} scheme={_p.scheme}")
except Exception:
    print("[db] connecting (unable to parse DSN)")
engine = create_engine(DSN, pool_pre_ping=True)

Session = sessionmaker(bind=engine)

metadata = MetaData()
projects_table = Table('projects', metadata, autoload_with=engine)
simulations_table = Table('simulations', metadata, autoload_with=engine)


def handler(event, context):
    session = Session()
    simulation_id = None
    # Outer logic (removed broad try to avoid nesting issues; inner blocks handle errors)
    # API key validation
    headers = event.get('headers') or {}
    api_key = headers.get('x-api-key') or headers.get('X-API-Key')
    expected_api_key = os.environ.get('API_KEY')
    if not expected_api_key:
        return {'statusCode': 500, 'body': json.dumps({'error': 'Server configuration error'})}
    if not api_key or api_key != expected_api_key:
        return {'statusCode': 401, 'body': json.dumps({'error': 'Unauthorized'})}

    # Parse input
    body = event.get('body')
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid JSON in request body'})}
    if body is None:
        body = {}
    sim_id_raw = body.get('simulation_id') or event.get('simulationId') or event.get('simulation_id')
    team_id_raw = body.get('team_id') or event.get('team_id')
    if sim_id_raw is None or team_id_raw is None:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Missing simulation_id or team_id'})}
    try:
        simulation_id = int(sim_id_raw)
        team_id = int(team_id_raw)
    except (TypeError, ValueError):
        return {'statusCode': 400, 'body': json.dumps({'error': 'simulation_id and team_id must be integers'})}

    # Fetch simulation
    sim_row = session.execute(
        select(simulations_table)
        .where(simulations_table.c.team_id == team_id)
        .where(simulations_table.c.id == simulation_id)
    ).first()
    if sim_row is None:
        return {'statusCode': 404, 'body': json.dumps({'error': 'Simulation not found'})}
    if sim_row.status != 'pending' and not is_development:
        return {'statusCode': 400, 'body': json.dumps({'error': 'Simulation is not in pending status'})}

    # Mark running
    session.execute(
        update(simulations_table)
        .where(simulations_table.c.id == simulation_id)
        .values(status='running', start_time=func.now())
    )
    session.commit()

    # Build and run model
    from lib.serialization import serialize_instance, default_handler
    from Moon2Mars.S import S
    from Moon2Mars.Frame_FEM import Model
    from Moon2Mars.Project import Project
    import math, platform, numpy as np

    entity_set = sim_row.entities if isinstance(sim_row.entities, dict) else json.loads(sim_row.entities)
    project = Project()
    model = Model()
    s = S(model, project)
    project.addProjectNumber('!Ptest')
    project.road = 'Hejvej 2'
    project.city = '5600 Bynavn'
    project.name = 'Lars Larsen' 
    project.addCC('CC2')
    project.selfweightTrueFalse(True)
    project.addNumberOfLevelsAbove(1)
    project.robustFactorTrueFalse(False)
    project.addDeformationCriteriaSteel(400)
    project.addDeformationCriteriaWood(400, 250)

    # Members first, then supports
    model.addMembers(entity_set)
    for id, support in (entity_set.get('supports') or {}).items():
        x = support.get('resolved', {}).get('x')
        y = support.get('resolved', {}).get('y')
        t = support.get('type')
        if t == 'Fixed':
            model.addSupport([x, y], 'x'); model.addSupport([x, y], 'y'); model.addSupport([x, y], 'r')
        elif t == 'Pinned':
            model.addSupport([x, y], 'x'); model.addSupport([x, y], 'y')
        elif t == 'Roller':
            ang = support.get('angle')
            if ang in (0, 180): model.addSupport([x, y], 'y')
            elif ang in (90, 270): model.addSupport([x, y], 'x')

    for id, point_load in (entity_set.get('pointLoads') or {}).items():
            t = point_load.get('type')
            if t == 'Dead': t = 'Egenlast'
            elif t == 'Live': t = 'Nyttelast'
            elif t == 'Snow': t = 'Snelast'
            elif t == 'Wind': t = 'Vindlast'
            x = point_load.get('resolved', {}).get('x')
            y = point_load.get('resolved', {}).get('y')
            s.addPointLoad([x, y], [0, -10000], t, id)

    for id, line_load in (entity_set.get('distributedLoads') or {}).items():
            p1 = line_load.get('resolved', {}).get('point1') or {}
            p2 = line_load.get('resolved', {}).get('point2') or {}
            if (p1.get('x') or 0) <= (p2.get('x') or 0):
                x1,y1,x2,y2 = p1.get('x'),p1.get('y'),p2.get('x'),p2.get('y')
            else:
                x1,y1,x2,y2 = p2.get('x'),p2.get('y'),p1.get('x'),p1.get('y')
            t = line_load.get('type'); dx,dy = (x2)-(x1),(y2)-(y1); c = ((dx)**2+(dy)**2)**0.5
            if t == 'Dead': t,fx1,fy1,fx2,fy2 = 'Egenlast',0,-(line_load.get('magnitude1'))*1e3,0,-(line_load.get('magnitude2'))*1e3
            elif t == 'Live': t,fx1,fy1,fx2,fy2 = 'Nyttelast',0,-(line_load.get('magnitude1'))*1e3,0,-(line_load.get('magnitude2'))*1e3
            elif t == 'Snow':
                t='Snelast'; scale=abs((dx)/c); fx1,fy1,fx2,fy2=0,-scale*(line_load.get('magnitude1'))*1e3,0,-scale*(line_load.get('magnitude2'))*1e3
            elif t == 'Wind':
                if line_load.get('windFlip'):
                    dx,dy = -dx,-dy
                t='Vindlast'; fx1=(line_load.get('magnitude1'))/c*(dy)*1e3; fy1=-(line_load.get('magnitude1'))/c*(dx)*1e3; fx2=(line_load.get('magnitude2'))/c*(dy)*1e3; fy2=-(line_load.get('magnitude2'))/c*(dx)*1e3
            else:
                cosPart = math.cos(math.pi/180*line_load.get('angle').get('value'))
                sinPart = math.sin(math.pi/180*line_load.get('angle').get('value'))
                fx1,fy1,fx2,fy2 = -cosPart*(line_load.get('magnitude1'))*1e3,-sinPart*(line_load.get('magnitude1'))*1e3,-cosPart*(line_load.get('magnitude2'))*1e3,-sinPart*(line_load.get('magnitude2'))*1e3
            s.addLineLoad([x1,y1],[x2,y2],[fx1,fy1],[fx2,fy2],t,id)

    for id, moment_load in (entity_set.get('momentLoads') or {}).items():
            x = (moment_load.get('resolved') or {}).get('x'); y = (moment_load.get('resolved') or {}).get('y'); M0 = (moment_load.get('magnitude'))*1e3
            s.addMoment([x,y],[M0],moment_load.get('type'),id)

    if project.selfweightOnOff:
        s.addSelfweight()

    # Execution phase
    # Run and persist

    try:
        s.run()
        members = { b['id']: b for b in s.member_discr }
        FEMModel = { 'members': members, 'X': s.X_discr, 'T': s.T_discr, 'R0_coor': s.R0_coordinates, 'R0_types': s.R0_type }

        # Serialize core s (object 's') and lightweight results separately
        s_payload = serialize_instance({'s': s})  # returns JSON-serialisable dict
        result_payload = serialize_instance({
            'FEMModel': FEMModel,
            'forces': s.loadCombinationsFE_discr,
            'UR': s.sectionResults
        })

        # Postgres JSONB rejects NaN/Infinity tokens (standard JSON) -> replace with null
        from math import isnan, isinf
        stats = {'nan': 0, 'inf': 0, '-inf': 0}
        def _sanitize(v):
            if isinstance(v, float):
                if isnan(v):
                    stats['nan'] += 1
                    return None
                if isinf(v):
                    if v > 0:
                        stats['inf'] += 1
                    else:
                        stats['-inf'] += 1
                    return None
                return v
            if isinstance(v, dict):
                return {k: _sanitize(x) for k, x in v.items()}
            if isinstance(v, list):
                return [_sanitize(x) for x in v]
            if isinstance(v, tuple):
                return [_sanitize(x) for x in v]
            return v

        s_payload = _sanitize(s_payload)
        result_payload = _sanitize(result_payload)
        if any(stats.values()):
            print(f"[sanitize] replaced NaN/Inf values: {stats}")
        # Attach metadata for forward compatibility/version checks
        meta = {
            'schema_version': 1,
            'python_version': platform.python_version(),
            'numpy_version': np.__version__,
            # Future: add moon2mars_hash, app_version, etc.
        }

        session.execute(
            update(simulations_table)
            .where(simulations_table.c.id == simulation_id)
            .values(status='completed', end_time=func.now(), meta=meta, result=result_payload, encoded_s=s_payload)
        )
        session.commit()
        return {'statusCode': 200, 'body': json.dumps({'message': 'Simulation completed successfully', 'simulation_id': simulation_id})}
    except Exception as e:
        try:
            session.rollback()
        except Exception:
            pass
        try:
            session.execute(
                update(simulations_table)
                .where(simulations_table.c.id == simulation_id)
                .values(status='failed', end_time=func.now(), error=str(e))
            )
            session.commit()
        except Exception:
            pass
        try:
            session.close()
        except Exception:
            pass
        return {'statusCode': 500, 'body': json.dumps({'error': 'Simulation failed', 'message': str(e), 'simulation_id': simulation_id})}
    # Success path already returned; ensure session closed otherwise
    try:
        session.close()
    except Exception:
        pass
