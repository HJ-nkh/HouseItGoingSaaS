import sys
import os
import json

# Append the path to the "src" folder and its parent folder to the system path
# This is necessary for running on AWS Lambda
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from src.create_report import create_report
from sqlalchemy.sql import select, insert
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine, Table, MetaData
from dotenv import load_dotenv

load_dotenv()

is_development = os.environ.get('API_ENV') == 'development'


DATABASE_URL = 'postgresql://' + os.environ.get('POSTGRES_USER') + \
    ':' + os.environ.get('POSTGRES_PASSWORD') + \
    '@' + os.environ.get('POSTGRES_HOST') + ':5432/' + \
    os.environ.get('POSTGRES_DB')

Base = declarative_base()

engine = create_engine(DATABASE_URL)

Session = sessionmaker(bind=engine)
session = Session()

metadata = MetaData()
projects_table = Table('projects', metadata, autoload_with=engine)
simulations_table = Table('simulations', metadata, autoload_with=engine)
reports_table = Table("reports", metadata, autoload_with=engine)


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

    user_id = event.get("user_id")
    simulation_id = event.get("simulation_id")

    simulation_query = select(simulations_table).where(simulations_table.c.user_id == 
        user_id).where(simulations_table.c.id == simulation_id)
    simulation = session.execute(simulation_query).first()

    if simulation is None:
        print(f"Simulation {simulation_id} not found")
        return

    project_query = select(projects_table).where(projects_table.c.user_id == 
        user_id).where(projects_table.c.id == simulation.project_id)
    project = session.execute(project_query).first()

    print(f"Found project: {project.id}")

    # Create the report and get the id
    report_id = create_report(user_id, project.id)

    print(f"report_id: {report_id}")

    # Temp
    title = "Sample report"

    # Create the report in the database
    insert_query = insert(reports_table).values(
        simulation_id=simulation_id, id=report_id, title=title, user_id=user_id,
        project_id=simulation.project_id, drawing_id=simulation.drawing_id
    )
    session.execute(insert_query)
    session.commit()

    return {"report_id": report_id}


if __name__ == "__main__" and is_development:
    handler({"user_id": "dev-sub", "simulation_id": 1}, {})
