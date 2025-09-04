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
from urllib.parse import quote_plus

load_dotenv()

is_development = os.environ.get('API_ENV') == 'development'


Base = declarative_base()

# Lazy-initialized DB state
ENGINE = None
SessionLocal = None
metadata = None
projects_table = None
simulations_table = None


def build_db_dsn() -> str:
    """Construct a Postgres DSN from DATABASE_URL or POSTGRES_* env vars.
    Ensures a default port and SSL mode for Neon.
    """
    url = os.getenv("DATABASE_URL")
    if url:
        # Ensure SSL for Neon if not specified
        if ("neon.tech" in url or "aws.neon.tech" in url) and "sslmode=" not in url:
            url += ("&" if "?" in url else "?") + "sslmode=require"
        # Allow either postgresql:// or postgresql+psycopg2://
        return url

    host = os.getenv("POSTGRES_HOST")
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    db = os.getenv("POSTGRES_DB") or "postgres"
    port = os.getenv("POSTGRES_PORT") or "5432"
    sslmode = os.getenv("POSTGRES_SSLMODE")
    if not sslmode and host and ("neon.tech" in host or "aws.neon.tech" in host):
        sslmode = "require"

    missing = [k for k, v in {
        "POSTGRES_HOST": host,
        "POSTGRES_USER": user,
        "POSTGRES_PASSWORD": password,
    }.items() if not v]
    if missing:
        raise RuntimeError(f"Missing DB env vars: {', '.join(missing)}")

    dsn = f"postgresql://{quote_plus(user)}:{quote_plus(password)}@{host}:{int(port)}/{db}"
    if sslmode:
        dsn += f"?sslmode={sslmode}"
    return dsn


def init_db():
    """Initialize SQLAlchemy engine, metadata, and tables lazily and safely."""
    global ENGINE, SessionLocal, metadata, projects_table, simulations_table
    if ENGINE is not None and SessionLocal is not None and projects_table is not None and simulations_table is not None:
        return

    dsn = build_db_dsn()
    # Log non-sensitive connection info for diagnostics
    host = os.getenv("POSTGRES_HOST") or "from-URL"
    port = os.getenv("POSTGRES_PORT") or ("5432" if ("neon.tech" in dsn or "aws.neon.tech" in dsn) else "")
    print(f"[env] connecting host={host} port={port}")

    # Create engine; rely on URL sslmode. Enable pool_pre_ping for resiliency.
    ENGINE = create_engine(dsn, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=ENGINE)

    metadata = MetaData()
    # Autoload tables when engine is ready
    projects_table = Table('projects', metadata, autoload_with=ENGINE)
    simulations_table = Table('simulations', metadata, autoload_with=ENGINE)


def handler(event, context):
    # Validate API key from headers
    headers = event.get('headers', {})
    api_key = headers.get('x-api-key') or headers.get('X-API-Key')
    expected_api_key = os.environ.get('API_KEY')

    
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

    # Extract simulation parameters from body or event
    simulation_id = body.get('simulation_id') or event.get('simulationId') or event.get('simulation_id')
    team_id = body.get('team_id') or event.get('team_id') or event.get('teamId')

    if not simulation_id or not team_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing simulation_id or team_id'})
        }

    # Ensure DB is initialized and get a session
    try:
        init_db()
    except Exception as e:
        print(f"DB initialization failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Server configuration error', 'message': 'DB init failed'})
        }

    session = SessionLocal()
    
    from lib.serialization import serialize_instance, default_handler
    from Moon2Mars.S import S
    from Moon2Mars.Frame_FEM import Model
    from Moon2Mars.Project import Project
    import pickle
    import base64
    import math

    simulation_query = select(simulations_table).where(simulations_table.c.team_id == team_id).where(simulations_table.c.id == simulation_id)
    simulation = session.execute(simulation_query).first()

    if (simulation == None):
        print("Simulation not found")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Simulation not found'})
        }

    if (simulation.status != "pending" and not is_development):
        print("Simulation not pending")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Simulation is not in pending status'})
        }

    project_query = select(projects_table).where(projects_table.c.id == simulation.project_id)
    project = session.execute(project_query).first()

    if (project == None):
        print("Project not found")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Project not found'})
        }

    # Update simulation status and start time
    update_query = update(simulations_table).where(simulations_table.c.id == simulation_id).values(status="running", start_time=func.now())
    session.execute(update_query)
    session.commit()

    # Construct model
    project = Project()
    model = Model()
    s = S(model, project)

    # Add project details
    # TODO: Add project details from database
    project.addProjectNumber('!Ptest')
    project.addCC('CC2')
    project.selfweightTrueFalse(True)
    project.addNumberOfLevelsAbove(1)
    project.robustFactorTrueFalse(False)
    project.addDeformationCriteriaSteel(400)
    # defCritWood1 = 400, defCritWood2 = 250 for DA nationalt anneks
    project.addDeformationCriteriaWood(400, 250)

    # TODO: Add beams, walls, supports, loads from simulation entities
    if isinstance(simulation.entities, dict):
        entity_set = simulation.entities
    else:
        entity_set = json.loads(simulation.entities)

    # Add members
    model.addMembers(entity_set)

    # Add walls
    # wall.addWall(coor1=[0,0], coor2=[0,-2], h=2800, hv=2800, l=2000, t=108, efod=0, e5=10, et=0, t_plade=10, b_plade=100, l_plade=200,
    #              l1=0, t1=0, l2=0, t2=0, Ned=20000, ned=10000, afstand_kraft=0, vind=0, name='M.1', walltype='Gammelt murværk')

    # Add supports
    for id, support in entity_set.get('supports').items():
        x = support.get('resolved').get('x')
        y = support.get('resolved').get('y')
        type = support.get('type')
        if (type == 'Fixed'):
            model.addSupport([x, y], 'x')
            model.addSupport([x, y], 'y')
            model.addSupport([x, y], 'r')
        if (type == 'Pinned'):
            model.addSupport([x, y], 'x')
            model.addSupport([x, y], 'y')
        if (type == 'Roller'):
            # TODO: Get angle and calculate y and x composants
            if support.get('angle') == 0 or support.get('angle') == 180:
                model.addSupport([x, y], 'y')
            elif support.get('angle') == 90 or support.get('angle') == 270:
                model.addSupport([x, y], 'x')

    # Add point loads
    for id, point_load in entity_set.get('pointLoads').items():
        type = point_load.get('type')
        if type == 'Standard': type = 'Standard'
        if type == 'Dead': type = 'Egenlast'
        if type == 'Live': type = 'Nyttelast'
        if type == 'Snow': type = 'Snelast'
        if type == 'Wind': type = 'Vindlast'

        x = point_load.get('resolved').get('x')
        y = point_load.get('resolved').get('y')
        # TODO: Resolve fx and fy from magnitude and angle
        fx = 0
        fy = -10000
        # TODO: Point load type?
        s.addPointLoad([x, y], [fx, fy], type, id)

    # Add line loads
    for id, line_load in entity_set.get('distributedLoads').items():
        if line_load.get('resolved').get('point1').get('x') < line_load.get('resolved').get('point2').get('x'):
            x1 = line_load.get('resolved').get('point1').get('x')
            y1 = line_load.get('resolved').get('point1').get('y')
            x2 = line_load.get('resolved').get('point2').get('x')
            y2 = line_load.get('resolved').get('point2').get('y')
        elif line_load.get('resolved').get('point1').get('x') > line_load.get('resolved').get('point2').get('x'):
            x1 = line_load.get('resolved').get('point2').get('x')
            y1 = line_load.get('resolved').get('point2').get('y')
            x2 = line_load.get('resolved').get('point1').get('x')
            y2 = line_load.get('resolved').get('point1').get('y')
        else:
            print('implementer for lodret din ost')
            # TODO: implement for vertical lines you cheese

        type = line_load.get('type')

        if type == 'Standard': type, fx1, fy1, fx2, fy2 = 'Standard', 0, -line_load.get('magnitude1')*10**3, 0, -line_load.get('magnitude2')*10**3
        if type == 'Dead': type, fx1, fy1, fx2, fy2 = 'Egenlast', 0, -line_load.get('magnitude1')*10**3, 0, -line_load.get('magnitude2')*10**3
        if type == 'Live': type, fx1, fy1, fx2, fy2 = 'Nyttelast', 0, -line_load.get('magnitude1')*10**3, 0, -line_load.get('magnitude2')*10**3
        if type == 'Snow': 
            type = 'Snelast'
            dx, dy = x2-x1, y2-y1
            c = math.sqrt(dx**2+dy**2)
            scaleSnow = abs(dx/c)
            fx1, fy1, fx2, fy2 = 0, -scaleSnow*line_load.get('magnitude1')*10**3, 0, -scaleSnow*line_load.get('magnitude2')*10**3

        if type == 'Wind': 
            type = 'Vindlast'
            dx, dy = x2-x1, y2-y1
            c = math.sqrt(dx**2+dy**2)
            fx1 = line_load.get('magnitude1')/c*dy*10**3
            fy1 = -line_load.get('magnitude1')/c*dx*10**3
            fx2 = line_load.get('magnitude2')/c*dy*10**3
            fy2 = -line_load.get('magnitude2')/c*dx*10**3

        s.addLineLoad([x1, y1], [x2, y2], [fx1, fy1],
                      [fx2, fy2], type, id)
        
    # add momemt loads
    for id, moment_load in entity_set.get('momentLoads').items():
        #type = moment_load.get('type')
        x = moment_load.get('resolved').get('x')
        y = moment_load.get('resolved').get('y')
        M0 = moment_load.get('magnitude')*10**3
        type = moment_load.get('type')
        s.addMoment([x, y], [M0], type, id)

    # add self weight
    if project.selfweightOnOff:
        s.addSelfweight()

    try:
        #Run simulation
        s.run()

        members = {}
        # Build dict of members
        for b in s.member_discr:
            members[b["id"]] = b

        # Update simulation status and start time
        FEMModel = { "members": members, "X": s.X_discr, "T": s.T_discr, "R0_coor": s.R0_coordinates, "R0_types": s.R0_type }
        pickled_data = pickle.dumps(s)
        encoded_s = base64.b64encode(pickled_data)
        result = serialize_instance({
            "FEMModel": FEMModel,
            "forces": s.loadCombinationsFE_discr,
            "UR": s.sectionResults,
        })

        update_query = update(simulations_table).where(simulations_table.c.id == simulation_id).values(
            status="completed", end_time=func.now(), result=json.dumps(result, default=default_handler), encoded_s=encoded_s)
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
        except Exception as db_error:
            print(f"Failed to update simulation status: {str(db_error)}")
        finally:
            try:
                session.close()
            except Exception:
                pass
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Simulation failed',
                'message': str(e),
                'simulation_id': simulation_id
            })
        }

#handler({"body": {"team_id": 1, "simulation_id": 1 }, "headers": { "X-API-Key": os.environ.get("API_KEY") } }, {})
