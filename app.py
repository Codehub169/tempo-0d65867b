import os
import sqlite3
from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file if present

app = Flask(__name__, template_folder='templates', static_folder='static')

# Configure Gemini API Key
# The API key is expected to be set as an environment variable 'AI_API_KEY'
AI_API_KEY = os.getenv("AI_API_KEY")
if not AI_API_KEY:
    print("Error: AI_API_KEY environment variable not set.")
    # In a real app, you might want to exit or raise an exception
    # For now, we'll let it proceed, but API calls will fail.
else:
    try:
        genai.configure(api_key=AI_API_KEY)
    except Exception as e:
        print(f"Error configuring Gemini API: {e}")

DATABASE_NAME = 'project_database.db'

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database and creates tables if they don't exist."""
    conn = get_db_connection()
    try:
        with open('schema.sql', 'r') as f:
            conn.executescript(f.read())
        conn.commit()
        print("Database initialized successfully from schema.sql")
    except FileNotFoundError:
        # Fallback: Create a simple table if schema.sql is not found (for MVP)
        # In a full app, schema.sql should define the structure.
        conn.execute('''
            CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                idea_text TEXT NOT NULL,
                swot_analysis TEXT,
                market_fit TEXT,
                competitor_overview TEXT,
                refinement_suggestions TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        print("Database initialized with a default 'ideas' table.")
    except sqlite3.Error as e:
        print(f"SQLite error during DB initialization: {e}")
    finally:
        conn.close()

@app.route('/')
def index():
    """Serves the main page of the application."""
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_idea():
    """Receives a startup idea, analyzes it using AI, and returns the analysis."""
    if not AI_API_KEY:
        return jsonify({'error': 'AI API key not configured. Please set the AI_API_KEY environment variable.'}), 500

    data = request.get_json()
    if not data or 'idea' not in data:
        return jsonify({'error': 'No idea provided'}), 400

    startup_idea = data['idea']

    if not startup_idea.strip():
        return jsonify({'error': 'Idea text cannot be empty'}), 400

    try:
        # For safety and to prevent overly long requests
        if len(startup_idea) > 5000: # Limiting input length
             return jsonify({'error': 'Idea text is too long. Please keep it under 5000 characters.'}), 400

        model = genai.GenerativeModel('gemini-pro')
        
        prompt = f"""Analyze the following startup idea and provide:
1.  SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
2.  Estimated Market Fit (Assess potential alignment with market needs, target audience, and demand)
3.  Competitor Overview (Identify 2-3 potential key competitors or types of competitors)
4.  Refinement Suggestions (Offer 3-5 actionable suggestions to improve or clarify the idea)

Startup Idea: "{startup_idea}"

Present the analysis clearly, with distinct sections for each of the four points above. Be concise yet comprehensive.
"""

        response = model.generate_content(prompt)
        
        # Assuming the response.text contains the full analysis as a single string.
        # The frontend will be responsible for parsing/displaying this if needed, 
        # or we can try to structure it more here if the AI can provide it.
        # For now, sending the whole text.
        analysis_text = response.text

        # Store in database (optional, based on how we want to use the DB)
        # For this MVP, we'll just log the request to the console and return analysis.
        # In a future version, we might store this in the 'ideas' table.
        print(f"Received idea for analysis: {startup_idea}")

        return jsonify({
            'swot_analysis': 'SWOT Analysis will be extracted here (placeholder).',
            'market_fit': 'Market Fit assessment will be extracted here (placeholder).',
            'competitor_overview': 'Competitor Overview will be extracted here (placeholder).',
            'refinement_suggestions': 'Refinement Suggestions will be extracted here (placeholder).',
            'full_ai_response': analysis_text # Send the full response for now
        })

    except Exception as e:
        print(f"Error during AI analysis: {e}")
        # Check for specific Gemini API errors if possible
        if hasattr(e, 'message') and "API key not valid" in e.message:
            return jsonify({'error': 'AI API key is invalid. Please check your configuration.'}), 500
        return jsonify({'error': f'Failed to analyze idea due to an internal error: {str(e)}'}), 500

if __name__ == '__main__':
    init_db() # Initialize the database when the app starts
    # The host '0.0.0.0' makes the server accessible externally, not just on localhost.
    # Port 9000 as requested.
    app.run(host='0.0.0.0', port=9000, debug=True)
