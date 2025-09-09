import matplotlib
matplotlib.use('Agg')  # Required to run matplotlib in a non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import boto3
import os
import io
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

output_dir = 'output'
is_development = os.getenv('API_ENV', 'production') == 'development'

def get_img_filepath(filename: str) -> str:
    if is_development:
        return os.path.join('output', filename)
    else:
        return filename

def save_plot(
    fig: plt.Figure,
    filename: str,
    content_type: str = 'image/png',
    dpi: int = 300
) -> str:
    """
    Saves a matplotlib figure either locally or to S3 based on API_ENV
    
    Args:
        fig: matplotlib Figure object to save
        filename: Name of the file to save
        bucket_name: Name of the S3 bucket (required for production)
        content_type: MIME type of the file
        dpi: DPI for the saved image
    
    Returns:
        str: Path where the figure was saved (local path or S3 URL)
    """
    filepath = get_img_filepath(filename)
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')
    dev_local = not bucket_name

    try:
        if dev_local:
            # Local/temp save path
            local_dir = '/tmp' if not is_development else output_dir
            os.makedirs(local_dir, exist_ok=True)
            local_path = os.path.join(local_dir, os.path.basename(filepath))
            fig.savefig(local_path, format='png', dpi=dpi, bbox_inches='tight')
            return local_path
        else:
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=dpi, bbox_inches='tight')
            buf.seek(0)
            s3_client = boto3.client('s3')
            s3_client.upload_fileobj(
                buf,
                bucket_name,
                filepath,
                ExtraArgs={'ContentType': content_type}
            )
            return f"https://{bucket_name}.s3.amazonaws.com/{filepath}"
    except Exception as e:
        print(f"Error saving plot: {e}")
        raise
    finally:
        if 'buf' in locals():
            buf.close()

def download_plot(filename: str) -> str:
    """
    Downloads a matplotlib figure from a file from S3
    
    Args:
        filename: Name of the file to load
    
    Returns:
        str: Path where the figure was saved
    """
    temp_image_path = f"/tmp/{os.path.basename(filename)}"

    filepath = get_img_filepath(filename)
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')
    dev_local = not bucket_name

    try:
        if dev_local:
            # Already saved locally via save_plot
            # Return a path we can open (assume same name in /tmp if Lambda)
            candidate_local = f"/tmp/{os.path.basename(filepath)}"
            if os.path.exists(candidate_local):
                return candidate_local
            # As fallback, if running locally in dev, look inside output_dir
            candidate_dev = os.path.join(output_dir, os.path.basename(filepath))
            if os.path.exists(candidate_dev):
                return candidate_dev
            raise FileNotFoundError(f"Plot not found locally: {candidate_local}")
        else:
            s3_client = boto3.client('s3')
            s3_client.download_file(bucket_name, filepath, temp_image_path)
            return temp_image_path
    except Exception as e:
        print(f"Error loading plot: {e}")
        raise

def create_sample_plot() -> plt.Figure:
    """
    Creates a sample sine wave plot
    
    Returns:
        matplotlib Figure object
    """
    # Create data
    x = np.linspace(0, 10, 100)
    y = np.sin(x)
    
    # Create the plot
    fig = plt.figure(figsize=(8, 6))
    plt.plot(x, y, 'b-', label='sin(x)')
    plt.xlabel('x')
    plt.ylabel('sin(x)')
    plt.title('Simple Sine Wave')
    plt.grid(True)
    plt.legend()
    
    return fig
