const url = "http://localhost:11434/api/generate";

let chatBox = null; // To hold reference to chat box
let userInput = null; // To hold reference to user input
let sendButton = null; // To hold reference to send button
let chatContext = []; // To hold chat context
let isRequestPending = false; // To track if a request is pending
let conversations = {}; // To hold different conversations

// Define appendMessage globally
function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = text; // Use innerHTML to render HTML content
    console.log(messageDiv.innerHTML);
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
                const responseData = JSON.parse(buffer);

                if (responseData.response) {
                    buffer = responseData.response; // Use only the new response part

                    // Remove spaces before punctuation
                    const formattedText = buffer.replace(/\s([.,!?;:])/g, '$1');

                    if (!botMessageDiv) {
                        botMessageDiv = appendMessage('bot', '');
                    }

                    // Update the message div with formatted text
                    botMessageDiv.textContent += formattedText;

                    buffer = ''; // Clear buffer after updating
                }

                if (responseData.context) {
                    newContext = responseData.context;
                }

                if (responseData.done) {
                    botMessageDiv.innerHTML = marked.parse(botMessageDiv.innerHTML);
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
    } finally {
        isRequestPending = false; // Reset the flag when request is completed
        sendButton.disabled = false; // Enable the button
        sendButton.classList.remove('disabled'); // Remove disabled class
        updateSendButtonState(); // Update send button state
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box');
    userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-button'); // Get reference to send button
    const menuBar = document.getElementById('menu-bar'); // Get reference to menu bar
    const newConversationButton = document.getElementById('new-conversation-button'); // Get reference to new conversation button

    async function sendMessage() {
        if (isRequestPending || !userInput.value.trim()) {
            return; // Prevent sending a new message if a request is pending or input is empty
        }

        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        appendMessage('user', userMessage);
        userInput.value = '';
        isRequestPending = true; // Set the flag when starting a new request
        sendButton.disabled = true; // Disable the button
        sendButton.classList.add('disabled'); // Add disabled class

        const { newContext } = await llama3(userMessage, chatContext);
        chatContext = newContext; // Update the context with the new context

        // Save conversation to localStorage
        const conversationName = prompt('Enter a name for this conversation:', `Conversation ${Object.keys(conversations).length + 1}`);
        if (conversationName) {
            conversations[conversationName] = { context: chatContext, messages: chatBox.innerHTML };
            saveConversations();
            loadMenu();
        }
    }

    userInput.addEventListener('input', updateSendButtonState); // Add input event listener to update button state

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

    sendButton.addEventListener('click', sendMessage); // Add event listener for send button
    newConversationButton.addEventListener('click', newConversation); // Add event listener for new conversation button

    window.sendMessage = sendMessage;

    updateSendButtonState(); // Initial call to update button state
    loadConversations(); // Load saved conversations from localStorage
    loadMenu(); // Load the menu with saved conversations
});

function updateSendButtonState() {
    const isInputEmpty = !userInput.value.trim();
    const isButtonDisabled = isRequestPending || isInputEmpty;

    sendButton.disabled = isButtonDisabled;
    sendButton.classList.toggle('disabled', isButtonDisabled);
}

function deleteHistory() {
    chatBox.innerHTML = ''; // Clear all content in the chat box
    chatContext = []; // Clear the chat context
    isRequestPending = false; // Reset the flag when clearing history
    sendButton.disabled = false; // Enable the button
    sendButton.classList.remove('disabled'); // Remove disabled class
}

function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

function loadConversations() {
    const savedConversations = JSON.parse(localStorage.getItem('conversations'));
    if (savedConversations) {
        conversations = savedConversations;
    }
}

function loadMenu() {
    const menuBar = document.getElementById('menu-bar');
    // Remove existing buttons except "New Conversation"
    while (menuBar.childNodes.length > 1) {
        menuBar.removeChild(menuBar.lastChild);
    }

    Object.keys(conversations).forEach(name => {
        const button = document.createElement('button');
        button.textContent = name;
        button.onclick = () => loadConversation(name);
        menuBar.appendChild(button);
    });
}

function newConversation() {
    deleteHistory();
    chatContext = [];
}

function loadConversation(name) {
    const conversation = conversations[name];
    if (conversation) {
        chatBox.innerHTML = conversation.messages;
        chatContext = conversation.context;
    }
}
