#!/usr/bin/env bash
# exit on error
set -o errexit

# Print environment variables for debugging (excluding sensitive ones)
echo "Checking environment variables..."
echo "DATABASE_URL configured: $(if [ -n "$EXTERNAL_DATABASE_URL" ]; then echo "Yes"; else echo "No"; fi)"
echo "DEBUG mode: $DEBUG"

# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Apply all migrations explicitly
echo "Applying migrations..."
python manage.py migrate auth
python manage.py migrate contenttypes
python manage.py migrate admin
python manage.py migrate sessions
python manage.py migrate sites
python manage.py migrate

# Show migrations status for debugging
python manage.py showmigrations 