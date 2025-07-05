from main import simulations_table, engine
from sqlalchemy.sql import select, update
import numpy as np


def restore_s_from_database(simulation_id, user_id, session):
    """
    Restores an S class instance and its Model from database without re-running the simulation.

    Args:
        simulation_id: ID of the simulation in the database
        user_id: ID of the user who owns the simulation
        session: SQLAlchemy session

    Returns:
        S: Restored S class instance with fully restored Model
    """
    # Query the simulation from database
    simulation_query = select(simulations_table).where(
        simulations_table.c.user_id == user_id,
        simulations_table.c.id == simulation_id
    )
    simulation = session.execute(simulation_query).first()

    if simulation is None:
        raise ValueError("Simulation not found")

    if simulation.result is None:
        raise ValueError("Simulation has no stored results")

    # Parse the stored results
    result = json.loads(simulation.result)

    # Create base instances
    project = Project()
    model = Model()
    wall = Wall(model)

    # Restore the Model data
    fem_model = result["FEMModel"]

    # Restore member data with all its properties
    model.member = []
    for member_data in fem_model["members"].values():
        # Convert all arrays in member data to numpy arrays
        for key, value in member_data.items():
            if isinstance(value, list):
                member_data[key] = np.array(value)
        model.member.append(member_data)

    # Restore model's nodal coordinates and topology matrices
    forces = result["forces"]

    # If X and T are stored in the FEM model
    if "X" in fem_model and "T" in fem_model:
        model.X = np.array(fem_model["X"])
        model.T = np.array(fem_model["T"])

    # Create and restore S instance
    s = S(model, project, wall)

    # Restore the discretized data
    s.T_discr = np.array(fem_model["T"])
    s.X_discr = np.array(fem_model["X"])

    # Restore forces with proper numpy array conversion
    s.loadCombinationsFE_discr = {
        key: {
            lc: np.array(values) if isinstance(values, list) else
            {subkey: np.array(subvalues)
             for subkey, subvalues in values.items()}
            for lc, values in force_data.items()
        }
        for key, force_data in forces.items()
    }

    # Restore section results
    s.sectionResults = result["UR"]

    return s

# Example usage:


def load_simulation_results(simulation_id, user_id):
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        s = restore_s_from_database(simulation_id, user_id, session)
        return s

    finally:
        session.close()
