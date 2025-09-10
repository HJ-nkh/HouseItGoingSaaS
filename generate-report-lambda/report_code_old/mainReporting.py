import sys
import os
import json
import base64, pickle

# Append the path to the "src" folder to the system path
sys.path.append(os.path.dirname(__file__))

sys.path.append('C:/Users/Nicolas/HouseItGoing/reporting/src/lib/')
sys.path.append('C:/Users/Nicolas/HouseItGoing/reporting/venv/Lib/site-packages')
sys.path.append('C:/Users/Nicolas/HouseItGoing/devtools_NKH')
sys.path.append('C:/Users/Nicolas/HouseItGoing/run_simulation/src/')


from serialization import serialize_instance, default_handler
from dotenv import load_dotenv
from sqlalchemy import create_engine, func, Table, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import select, update
from capture_print import capture_print
import numpy as np
from createReport import CreateReport
from matplotlib import pyplot as plt
import dev_plots as devplots

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


def handler(event, context):
    simulation_query = select(simulations_table).where(simulations_table.c.user_id == event.get(
        'user_id')).where(simulations_table.c.id == event.get('simulation_id'))
    simulation = session.execute(simulation_query).first()

    if (simulation == None):
        print("Simulation not found")
        return

    if (simulation.status != "pending" and not is_development):
        print("Simulation not pending")
        return

    project_query = select(projects_table).where(projects_table.c.user_id == event.get(
        'user_id')).where(projects_table.c.id == simulation.project_id)
    project = session.execute(project_query).first()

    if (project == None):
        print("Project not found")
        return

    # Update simulation status and start time
    update_query = update(simulations_table).where(simulations_table.c.id == event.get(
        'simulation_id')).values(status="running", start_time=func.now())
    session.execute(update_query)
    session.commit()
    session.close()

    # Create report
    report = CreateReport()

    result = json.loads(simulation.result)
    encoded_s = result.get("encodedS")
    s = pickle.loads(base64.b64decode(encoded_s))

    report.run(s)


if __name__ == "__main__" and is_development:
    handler({"user_id": "dev-sub", "simulation_id": 57}, {})
