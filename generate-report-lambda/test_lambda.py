#!/usr/bin/env python3
"""Minimal local test harness for generate-report-lambda (mirrors run-simulation-lambda style)."""
import os, sys, json, argparse

# Minimal venv site-packages injection (if running with system Python)
def _inject_site_packages():
    try:
        venv_dir = os.path.join(os.path.dirname(__file__), '.venv')
        sp = os.path.join(venv_dir, 'Lib', 'site-packages') if os.name == 'nt' else os.path.join(venv_dir, 'lib', f"python{sys.version_info.major}.{sys.version_info.minor}", 'site-packages')
        if os.path.isdir(sp) and sp not in sys.path:
            sys.path.insert(0, sp)
    except Exception:
        pass
_inject_site_packages()

# Add src to path (Lambda style)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def parse_args():
    p = argparse.ArgumentParser(description='Test generate-report handler locally.')
    p.add_argument('--title', default='Report')
    p.add_argument('--api-key', default=os.environ.get('API_KEY') or 'dev-test-key')
    p.add_argument('--use-s3', action='store_true', help='Do NOT force local mode (keep REPORTS_BUCKET_NAME if set)')
    return p.parse_args()

def main():
    args = parse_args()
    if not os.getenv('API_KEY'):
        os.environ['API_KEY'] = args.api_key
    # Force local by default unless user opts into S3
    if not args.use_s3 and os.environ.get('REPORTS_BUCKET_NAME'):
        os.environ.pop('REPORTS_BUCKET_NAME', None)
        print('[test_lambda] (default) Using local filesystem storage (REPORTS_BUCKET_NAME unset).')

    from main import handler  # import after potential env adjustments

    event = {
        'headers': {'X-API-Key': os.environ.get('API_KEY')},
        'body': json.dumps({
            'team_id': 1,
            'simulation_id': 25,
            'title': args.title
        })
    }
    print('[test_lambda] Invoking handler with:')
    print(json.dumps(event, indent=2))
    result = handler(event, {})
    print('\n[test_lambda] Handler result:')
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
