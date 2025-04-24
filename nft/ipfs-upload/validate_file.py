#!/usr/bin/env python3
import json
import sys

if len(sys.argv) != 2:
    print("Usage: python3 validate_file.py <file_path>")
    sys.exit(1)

file_path = sys.argv[1]
try:
    with open(file_path, 'r') as f:
        data = json.load(f)
    print("File is valid JSON!")
    print(json.dumps(data, indent=2))
except json.JSONDecodeError as e:
    print(f"Invalid JSON: {e}")
    sys.exit(1) 