from contextlib import contextmanager
import sys
from io import StringIO

@contextmanager
def capture_print():
    """
    Context manager that captures the output of print statements.

    Within the context block, all output to stdout (e.g., from print statements) 
    is captured and not printed to the console. Once the block is exited, normal 
    stdout functionality resumes.

    Returns:
        StringIO: An object capturing all printed output within the context block.

    Example:
        with capture_print() as captured:
            print("This won't be printed to the console")
        print("Captured output:", captured.getvalue())

    """
    old_stdout = sys.stdout
    captured_output = StringIO()
    sys.stdout = captured_output
    try:
        yield captured_output
    finally:
        sys.stdout = old_stdout
