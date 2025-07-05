import numpy as np

def convert_numpy(obj):
    try:
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.int_, np.intc, np.intp, np.int8, np.int16, np.int32, np.int64, 
                            np.uint8, np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float16, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, (np.complex64, np.complex128)):
            return {'real': obj.real, 'imag': obj.imag}
        elif isinstance(obj, (np.bool_)):
            return bool(obj)
        elif isinstance(obj, np.void):
            return None
        elif isinstance(obj, np.dtype):
            return str(obj)
        elif isinstance(obj, dict):
            return {k: convert_numpy(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_numpy(v) for v in obj]
        elif isinstance(obj, tuple):
            return tuple(convert_numpy(v) for v in obj)
        else:
            return obj
    except TypeError:
        return "Not serializable"

def serialize_instance(obj):
    """Recursively serializes objects to JSON, including nested instances and handling numpy types."""
    try:
        if isinstance(obj, dict):
            return {k: serialize_instance(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [serialize_instance(v) for v in obj]
        elif isinstance(obj, tuple):
            return tuple(serialize_instance(v) for v in obj)
        elif hasattr(obj, "__dict__"):
            d = {}
            for key, value in obj.__dict__.items():
                if not callable(value) and not key.startswith('_'):
                    d[key] = serialize_instance(value)
            return d
        elif hasattr(obj, "__slots__"):
            return {slot: serialize_instance(getattr(obj, slot)) for slot in obj.__slots__
                    if not callable(getattr(obj, slot)) and not slot.startswith('_')}
        else:
            return convert_numpy(obj)
    except TypeError:
        return "Not serializable"

def default_handler(obj):
    # Fallback for any types not handled by serialize_instance
    try:
        # Attempt to serialize known non-serializable objects
        # This could be a more simplified or generic handling based on your requirements
        return str(obj)  # or any other appropriate fallback representation
    except TypeError:
        return "non-serializable object"