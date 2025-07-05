#!/usr/bin/env python3
"""
Test script for the Lambda function
"""
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from main import handler

# Test event
test_event = {
    "body": {
        "user_id": 1,  # Changed to string to match database varchar type
        "simulation_id": 3
    }, 
    "headers": { 
        "X-API-Key": "your-secure-api-key-here" 
    }
}

# Test context (empty for local testing)
test_context = {}

if __name__ == "__main__":
    print("Testing Lambda function...")
    try:
        result = handler(test_event, test_context)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
