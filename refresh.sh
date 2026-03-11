#!/bin/bash
# Refresh MF Portfolio Analysis data
# Run this after adding new XLSX files to the disclosures/ folder

set -e

echo "=== Parsing disclosure files ==="
cd "$(dirname "$0")/backend"
python parse_disclosures.py

echo ""
echo "=== Copying data to frontend ==="
cp "../data/consolidated.json" "../frontend/public/data/consolidated.json"

echo ""
echo "=== Done! Refresh the dashboard in your browser. ==="
