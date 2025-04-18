import os
import sys
import django
from django.db import connection

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mail_tune_project.settings')
django.setup()

def reset_migrations():
    """
    Reset the migration state in the database.
    Only run this as a last resort if migrations are completely broken.
    """
    with connection.cursor() as cursor:
        # Check if django_migrations table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'django_migrations'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("Clearing django_migrations table...")
            cursor.execute("DELETE FROM django_migrations;")
            print("Migration records cleared.")
        else:
            print("django_migrations table doesn't exist. Creating it...")
            cursor.execute("""
                CREATE TABLE django_migrations (
                    id SERIAL PRIMARY KEY,
                    app VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    applied TIMESTAMP NOT NULL
                );
            """)
            print("django_migrations table created.")

if __name__ == "__main__":
    confirm = input(
        "WARNING: This will reset migration state in the database. "
        "Only do this if migrations are completely broken. "
        "Type 'CONFIRM' to proceed: "
    )
    
    if confirm == "CONFIRM":
        reset_migrations()
        print("Migration state has been reset. Now run 'python manage.py migrate' to apply all migrations.")
    else:
        print("Operation cancelled.") 