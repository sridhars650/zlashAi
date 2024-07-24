import requests
import json
import sys
import time

url = "http://localhost:11434/api/generate"

def llama3(prompt, context=None):
    data = {
        "model": "zlashAi",
        "prompt": prompt,
    }
    
    if context:
        data["context"] = context
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, stream=True)
        
        content = ""
        new_context = context if context else [] 
        
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                try:
                    response_data = json.loads(decoded_line)
                    
                    if 'response' in response_data and response_data['response']:
                        content += response_data['response']
                        
                        sys.stdout.write("\rzlashAi: " + content)
                        sys.stdout.flush()
                
                    if 'context' in response_data:
                        new_context = response_data['context']
                    
                    if response_data.get('done', False):
                        sys.stdout.write("\n")  
                        sys.stdout.flush()
                        break
                
                except json.JSONDecodeError as e:
                    print("JSON Decode Error:", e)
    
    except requests.RequestException as e:
        print("Request Error:", e)
    
    return content, new_context

def chat_loop():
    previous_context = []  # Initialize with an empty context or context from previous responses
    
    print("Welcome to the chat! Type 'exit' to end the conversation.")
    
    while True:
        user_input = input("You: ")
        
        if user_input.lower() == 'exit':
            print("Ending the conversation. Goodbye!")
            break
        
        # Print initial prompt and then get the response
        sys.stdout.write("zlashAi: ")
        sys.stdout.flush()
        
        response_content, new_context = llama3(user_input, context=previous_context)
        
        # Update context for future requests
        previous_context = new_context

# Run the chat loop
chat_loop()
