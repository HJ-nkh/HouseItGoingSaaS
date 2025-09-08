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
        "team_id": 1,  # Changed from user_id to team_id to match main.py
        "simulation_id": 14
    }, 
    "headers": { 
        "X-API-Key": os.environ.get("API_KEY") 
    }
}

# Test context (empty for local testing)
test_context = {}

if __name__ == "__main__":
    print("Testing Lambda function...")

    result = handler(test_event, test_context)

    # try:
    #     result = handler(test_event, test_context)
    #     print(f"Result: {result}")
    # except Exception as e:
    #     print(f"Error: {e}")
    #     import traceback
    #     traceback.print_exc()
