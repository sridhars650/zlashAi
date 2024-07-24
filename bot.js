const url = "http://localhost:11434/api/generate";

let chatBox = null; // To hold reference to chat box
let userInput = null; // To hold reference to user input

// Define appendMessage globally
function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageDiv;
}

async function llama3(prompt, context = null) {
    const data = {
        model: "zlashAi",
        prompt: prompt,
        stream: true,
    };

    if (context) {
        data.context = context;
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ""; // Buffer to accumulate incoming text
        let newContext = context ? context : [];
        let botMessageDiv = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const decodedLine = decoder.decode(value, { stream: true });
            console.log('Received chunk:', decodedLine); // Debugging output
            buffer += decodedLine; // Accumulate buffer

            try {
                const responseData = JSON.parse(decodedLine);

                if (responseData.response) {
                    buffer += responseData.response;
                    const words = buffer.split(/\s+/); // Split buffer into words

                    if (!botMessageDiv) {
                        botMessageDiv = appendMessage('bot', '');
                    }

                    // Update the message div with completed words
                    const lastWord = words.pop(); // Get the last word
                    botMessageDiv.textContent += lastWord + ' ';
                    
                    buffer = ''; // Clear buffer after updating
                }

                if (responseData.context) {
                    newContext = responseData.context;
                }

                if (responseData.done) {
                    console.log('Response done.'); // Debugging output
                    break;
                }
            } catch (e) {
                console.error("JSON Decode Error:", e);
            }
        }

        return { content: buffer, newContext };
    } catch (e) {
        console.error("Request Error:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box');
    userInput = document.getElementById('user-input');

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        appendMessage('user', userMessage);
        userInput.value = '';

        await llama3(userMessage);
    }

    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (!event.shiftKey) {
                event.preventDefault();
                sendMessage();
            } else {
                userInput.value += '\n';
            }
        }
    });

    window.sendMessage = sendMessage;
});
