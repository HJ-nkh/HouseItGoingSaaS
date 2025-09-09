from typing import Optional
from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from src.plots import create_sample_plot, save_plot, output_dir, download_plot
import os
import uuid
import io
import boto3

is_development = os.environ.get('API_ENV', 'production') == 'development'

'''
A report has file name format: {team_id}/{project_id}/{report_id}.docx
'''

def make_report_filename(team_id, project_id, report_id):
    return f"{team_id}/{project_id}/{report_id}.docx"

def make_figure_filename(team_id, project_id, report_id, fig_name):
    return f"{team_id}/{project_id}/{report_id}/{fig_name}"

def create_report(team_id, project_id, title: str | None = None):
    template_path = "./src/report_template_steel.docx"
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Report template not found at {template_path}")
    doc = DocxTemplate(template_path)
    report_id = str(uuid.uuid4())

    fig_name_1 = "sample_plot.png"
    fig_name_2 = "sample_plot2.png"

    # Make filenames
    filename_1 = make_figure_filename(team_id, project_id, report_id, fig_name_1)
    filename_2 = make_figure_filename(team_id, project_id, report_id, fig_name_2)

    fig = create_sample_plot()
    save_plot(fig, filename_1)

    fig2  = create_sample_plot()
    save_plot(fig2, filename_2)

    context = {'title': title or 'Report'}

    # Download plots from S3
    temp_filepath_1 = download_plot(filename_1)
    temp_filepath_2 = download_plot(filename_2)

    # Create inline image references
    image = InlineImage(doc, temp_filepath_1, width=Mm(150))
    context[f'IMGstatisksystem'] = image

    image2 = InlineImage(doc, temp_filepath_2, width=Mm(150))
    context[f'IMGsectionForceEnvelope'] = image2

    # Test insert title
    context[f'navn_bjaelke'] = "Bjælke 1"

    # Render template
    doc.render(context)

    filename = make_report_filename(team_id, project_id, report_id)
    storage_ref, presigned_url = save_document(doc, filename)

    return {
        'report_id': report_id,
        's3_key': filename,
        'storage_ref': storage_ref,
        'download_url': presigned_url,
    }

    
def save_document(
    doc: DocxTemplate, 
    filename: str,
) -> tuple[str, str | None]:
    """
    Saves a docx document either locally or to S3 based on API_ENV
    
    Args:
        doc: DocxTemplate to save
        filename: Name of file to save
    
    Returns:
    tuple[path_or_uri, presigned_url_or_none]
    """
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')
    dev_local = not bucket_name  # fallback path for development when bucket missing
    
    # Save to S3
    try:
        if dev_local:
            # Write to /tmp in Lambda (ephemeral) or local filesystem when developing
            local_path = f"/tmp/{os.path.basename(filename)}"
            doc.save(local_path)
            return local_path, None
        else:
            buf = io.BytesIO()
            doc.save(buf)
            buf.seek(0)
            s3_client = boto3.client('s3')
            s3_client.upload_fileobj(buf, bucket_name, filename)
            # Generate short-lived presigned URL for immediate download (15 min)
            presigned = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': filename},
                ExpiresIn=900
            )
            return f"s3://{bucket_name}/{filename}", presigned
    except Exception as e:
        print(f"Error saving report document: {e}")
        raise
    finally:
        if 'buf' in locals():
            buf.close()
