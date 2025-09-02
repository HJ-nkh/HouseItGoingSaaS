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

load_dotenv()

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
    missing = [k for k in ['POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_HOST','POSTGRES_PORT','POSTGRES_DB'] if not os.environ.get(k)]
    if missing:
        raise RuntimeError(f"Missing DB environment variables: {', '.join(missing)}")
    database_url = (
        'postgresql://' + os.environ['POSTGRES_USER'] +
        ':' + os.environ['POSTGRES_PASSWORD'] +
        '@' + os.environ['POSTGRES_HOST'] +
        ':' + os.environ['POSTGRES_PORT'] + '/' +
        os.environ['POSTGRES_DB']
    )
    # Keep it simple; could set connect timeout via connect_args if needed
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    metadata = MetaData()
    projects_table = Table('projects', metadata, autoload_with=engine)
    simulations_table = Table('simulations', metadata, autoload_with=engine)


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

    # Extract parameters (support multiple field names)
    simulation_id = body.get('simulation_id') or event.get('simulation_id') or event.get('simulationId')
    team_id = body.get('team_id') or event.get('team_id') or event.get('teamId')

    if not simulation_id or not team_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing simulation_id or team_id'})
        }
    
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

    simulation_query = select(simulations_table).where(simulations_table.c.team_id == team_id).where(simulations_table.c.id == simulation_id)
    sim_row = session.execute(simulation_query).mappings().first()

    if sim_row is None:
        print("Simulation not found")
        return {
            'statusCode': 404,
            'body': json.dumps({'error': 'Simulation not found'})
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
    entities_val = sim_row.get('entities')
    if isinstance(entities_val, dict):
        entity_set = entities_val
    else:
        try:
            entity_set = json.loads(entities_val) if entities_val else {}
        except Exception:
            entity_set = {}

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

#handler({"body": {"team_id": 1, "simulation_id": 19 }, "headers": { "X-API-Key": os.environ.get("API_KEY") } }, {})
