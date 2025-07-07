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

def create_report(team_id, project_id):
    template_path = "./src/report_template_steel.docx"
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

    context = {'title': 'Document with Multiple Plots'}

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
    
    # Save to buffer
    save_document(doc, filename)

    return report_id

    
def save_document(
    doc: DocxTemplate, 
    filename: str,
) -> str:
    """
    Saves a docx document either locally or to S3 based on API_ENV
    
    Args:
        doc: DocxTemplate to save
        filename: Name of file to save
    
    Returns:
        str: Path where document was saved (local path or S3 URL)
    """
    bucket_name = os.getenv('REPORTS_BUCKET_NAME')

    if not bucket_name:
        raise ValueError("bucket_name is required for production environment")
    
    # Save to S3
    try:
        # Save to buffer first
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        
        # Upload to S3
        s3_client = boto3.client('s3')
        s3_client.upload_fileobj(
            buf,
            bucket_name,
            filename,
        )
        
        return f"https://{bucket_name}.s3.amazonaws.com/{filename}"
        
    except Exception as e:
        print(f"Error saving to S3: {str(e)}")
        raise
    finally:
        buf.close()
