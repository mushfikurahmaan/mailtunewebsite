#!/usr/bin/env bash
# exit on error
set -o errexit

# Update pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Collect static files with clear option
python manage.py collectstatic --no-input --clear

# Apply database migrations
python manage.py migrate 