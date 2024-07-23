from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_session import Session
import requests
import logging
import ssl

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

        # Prepare the request data
        data = {
            '_wpnonce': request.form.get('_wpnonce'),
            'post_id': request.form.get('post_id'),
            'url': request.form.get('url'),
            'action': request.form.get('action'),
            'message': user_message,
            'bot_id': request.form.get('bot_id'),
            'conversation_history': session['conversation_history']
        }

        headers = {
            'Accept': '*/*',
            'Origin': 'https://chatgbt.one',
            'Referer': 'https://chatgbt.one/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Cookie': 'cf_clearance=Yg0BQHk9g3eOn8OJ1Z2GQpeCmz1E7ygn3x1jlUMmWJA-1721691622-1.0.1.1-eDB6SpH4UPrW802dSn4A2Q0aCIygWpAhSRNorHNaz0PBthUc0Ru2N1v1sg9SNOINiZSZ1mIWJBANu973SS0M9g; cookieyes-consent=consentid:cTRsNDh0aWhpbWN0aGVGcnFrcDdKYjF4ZFpCcDJiT3k,consent:no,action:yes,necessary:yes,functional:no,analytics:no,performance:no,advertisement:no,other:no; wpaicg_chat_client_id=t_b8760ca3b13366449de0adfc55658d; wpaicg_conversation_url_shortcode=38631a275182c211de2a6a4406b67203; 38631a275182c211de2a6a4406b67203=a%3A2%3A%7Bi%3A0%3Bs%3A15%3A%22Human%3A%20hey%0AAI%3A%20%22%3Bi%3A1%3Bs%3A34%3A%22Hello%21%20How%20can%20I%20assist%20you%20today%3F%22%3B%7D',
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
