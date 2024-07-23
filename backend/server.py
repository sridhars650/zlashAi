from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_session import Session
import requests
import logging
import ssl
import os

app = Flask(__name__)

# Configure session
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = 'your_secret_key'  # Change this to a random secret key
Session(app)

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Allow CORS for all routes
CORS(app)

TARGET_URL = 'https://chatgbt.one/wp-admin/admin-ajax.php'

@app.route('/proxy', methods=['POST'])
def proxy():
    try:
        # Extract the form data from the request
        user_message = request.form.get('message')
        user_name = request.form.get('user_name', 'Unknown')

        # Initialize conversation history if not already present
        if 'conversation_history' not in session:
            session['conversation_history'] = []

        # Append the new user message to the conversation history
        session['conversation_history'].append({'role': 'user', 'content': user_message})

        # Prepare the conversation history string
        if session['conversation_history']:
            history_string = "\n".join(
                f"User: {entry['content']}" if entry['role'] == 'user' else f"ZlashAi: {entry['content']}"
                for entry in session['conversation_history']
            )
        else:
            history_string = ""

        # Prepare the request data
        data = {
            '_wpnonce': request.form.get('_wpnonce'),
            'post_id': request.form.get('post_id'),
            'url': request.form.get('url'),
            'action': request.form.get('action'),
            'message': f"Previous history:\n{history_string}\nNow, the user asks: {user_message}",
            'bot_id': request.form.get('bot_id')
        }

        headers = {
            'Accept': '*/*',
            'Origin': 'https://chatgbt.one',
            'Referer': 'https://chatgbt.one/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Cookie': os.getenv("COOKIE"),
            'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',  
            'Sec-Ch-Ua-Mobile': '?0',  
            'Sec-Ch-Ua-Platform': '"macOS"',  
            'Sec-Fetch-Dest': 'empty',  
            'Sec-Fetch-Mode': 'cors',  
            'Sec-Fetch-Site': 'same-origin',  
        }

        # Log request data and headers
        app.logger.debug('Request data received: %s', data)
        app.logger.debug('Forwarding headers: %s', headers)

        # Forward the request to the target URL
        response = requests.post(TARGET_URL, data=data, headers=headers)
        app.logger.debug('Response from target URL: %s', response.text)

        # Parse the response and update conversation history
        response_json = response.json()
        bot_message = response_json.get('data', 'Something went wrong')

        if response_json.get('status') == 'success':
            session['conversation_history'].append({'role': 'bot', 'content': bot_message})
        else:
            bot_message = 'Something went wrong'

        response.raise_for_status()
        return jsonify({'data': bot_message, 'conversation_history': session['conversation_history']}), response.status_code
    except requests.RequestException as e:
        app.logger.error('Error in proxy request: %s', str(e))
        return jsonify({'error': 'An error occurred while processing the request.'}), 500
    except Exception as e:
        app.logger.error('Unexpected error: %s', str(e))
        return jsonify({'error': 'An unexpected error occurred.'}), 500

@app.route('/clear_history', methods=['POST'])
def clear_history():
    session.pop('conversation_history', None)
    return jsonify({'message': 'Conversation history cleared'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
