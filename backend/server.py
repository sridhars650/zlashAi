from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)  # Allow all origins by default

# Replace this URL with the actual URL you want to proxy requests to
TARGET_URL = 'https://talkai.info/chat/send/'

@app.route('/proxy', methods=['POST'])
def proxy():
    try:
        # Forward the incoming request to the target URL
        response = requests.post(TARGET_URL, json=request.json)

        # Return the response from the target URL
        return jsonify(response.json()), response.status_code
    except requests.RequestException as e:
        # Handle errors and return a generic error message
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
