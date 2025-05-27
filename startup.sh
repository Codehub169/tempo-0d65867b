#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting Startup Idea Analyzer Application..."

# Set environment variables
export FLASK_APP=app.py
export FLASK_ENV=development # or 'production' for production deployments

# Set the AI_API_KEY from the value provided by the user
# IMPORTANT: In a real production environment, manage secrets more securely 
# (e.g., through a secrets manager, .env file not committed to repo, or platform-specific environment variable settings).
# For this MVP, we are setting it directly as requested by the user during the initial interaction.
export AI_API_KEY='AIzaSyC4g30zQKAa_BEHMFNPkw8e5AdpVr1XavQ'

echo "AI_API_KEY has been set."

# Check if Python 3 and pip are installed
if ! command -v python3 &> /dev/null
then
    echo "Python 3 could not be found. Please install Python 3."
    exit 1
fi

if ! command -v pip3 &> /dev/null
then
    echo "pip3 could not be found. Please install pip3."
    # Attempt to install pip if python3 is available
    echo "Attempting to install pip for Python 3..."
    python3 -m ensurepip --upgrade || (echo "Failed to install pip. Please install it manually." && exit 1)
    # If ensurepip doesn't add pip3 to PATH, user might need to use python3 -m pip
fi

# Create a virtual environment (optional but recommended)
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate the virtual environment
# Note: 'source' might not be available in all shells/contexts. 
# If this script is run by a CI/CD system or a non-interactive shell, activation might behave differently.
echo "Activating Python virtual environment..."
# Using . instead of source for wider compatibility, though source is more common for interactive shells.
. venv/bin/activate

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies from requirements.txt..."
    pip3 install -r requirements.txt
else
    echo "WARNING: requirements.txt not found. Skipping Python dependency installation."
fi

# (Optional) Initialize database - app.py does this on startup, but can be explicit here too
# echo "Initializing database (if needed)..."
# python3 app.py initdb # Assuming a CLI command for init, or just let app.py handle it.

# Run the Flask application
# The Flask app (app.py) is configured to run on port 9000.
echo "Starting Flask application on port 9000..."
flask run --host=0.0.0.0 --port=9000

echo "Application stopped."
