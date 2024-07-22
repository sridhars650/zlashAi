from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM

app = Flask(__name__)

# Load the Falcon-7b-Instruct model and tokenizer
tokenizer = AutoTokenizer.from_pretrained('tiiuae/falcon-7b-instruct')
model = AutoModelForCausalLM.from_pretrained('tiiuae/falcon-7b-instruct')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message', '')

    # Encode the input and generate a response
    inputs = tokenizer.encode(user_input, return_tensors='pt')
    outputs = model.generate(inputs, max_length=150, num_return_sequences=1)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)

    return jsonify({'response': response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
