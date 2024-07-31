const url = "http://localhost:11434/api/generate";
const imageUrl = "http://localhost:11434/api/generate";

let chatBox = null;
let userInput = null;
let sendButton = null;
let uploadButton = null;
let imageInput = null;
let chatContext = [];
let isRequestPending = false;
let conversations = {};
let imagePresent = false; // Flag to indicate if an image is present

function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageDiv;
}

async function llama3(prompt, context = []) {
    const data = {
        model: "zlashAi",
        prompt: prompt,
        stream: true,
        context: Array.isArray(context) ? context : [] // Ensure context is always an array
    };

    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        console.log("Sending data:", JSON.stringify(data));

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
        let buffer = "";
        let newContext = context;
        let botMessageDiv = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const decodedLine = decoder.decode(value, { stream: true });
            buffer += decodedLine;

            try {
                const responseData = JSON.parse(buffer);

                if (responseData.response) {
                    buffer = responseData.response;
                    const formattedText = buffer.replace(/\s([.,!?;:])/g, '$1');

                    if (!botMessageDiv) {
                        botMessageDiv = appendMessage('bot', '');
                    }

                    botMessageDiv.textContent += formattedText;
                    buffer = '';
                }

                if (responseData.context) {
                    newContext = Array.isArray(responseData.context) ? responseData.context : [];
                }

                if (responseData.done) {
                    botMessageDiv.innerHTML = marked.parse(botMessageDiv.innerHTML);
                    break;
                }
            } catch (e) {
                console.error("JSON Decode Error:", e);
            }
        }

        return { content: buffer, newContext };
    } catch (e) {
        console.error("Request Error:", e);
        return { content: '', newContext: context };
    } finally {
        isRequestPending = false;
        sendButton.disabled = false;
        sendButton.classList.remove('disabled');
        updateSendButtonState();
    }
}

async function llava(image, prompt, context = []) {
    const data = {
        image: image, // This would be a base64 encoded string or similar representation
        prompt: prompt,
        model: 'llava',
        context: Array.isArray(context) ? context : []
    };

    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        console.log("Sending data:", JSON.stringify(data));

        const response = await fetch(imageUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let botMessageDiv = null;
        let newContext = context;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const decodedLine = decoder.decode(value, { stream: true });
            buffer += decodedLine;

            // Process complete JSON objects from buffer
            while (true) {
                const endIndex = buffer.indexOf('}\n{');
                if (endIndex === -1) break;

                const completeChunk = buffer.slice(0, endIndex + 1);
                buffer = buffer.slice(endIndex + 2);

                try {
                    const responseData = JSON.parse(completeChunk);

                    if (responseData.response) {
                        const formattedText = responseData.response.replace(/\s([.,!?;:])/g, '$1');

                        if (!botMessageDiv) {
                            botMessageDiv = appendMessage('bot', '');
                        }

                        botMessageDiv.textContent += formattedText;
                        botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }

                    if (responseData.context) {
                        newContext = Array.isArray(responseData.context) ? responseData.context : [];
                    }

                    if (responseData.done) {
                        botMessageDiv.innerHTML = marked.parse(botMessageDiv.innerHTML);
                        break;
                    }
                } catch (e) {
                    console.error("JSON Decode Error:", e);
                }
            }
        }

        return { content: buffer, newContext };
    } catch (e) {
        console.error("Request Error:", e);
        return { content: '', newContext: context };
    } finally {
        isRequestPending = false;
        sendButton.disabled = false;
        sendButton.classList.remove('disabled');
        updateSendButtonState();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box');
    userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-button');
    uploadButton = document.getElementById('upload-button');
    imageInput = document.getElementById('image-input');
    const newConversationButton = document.getElementById('new-conversation-button');
    const saveConversationButton = document.getElementById('save-button');
    const deleteButton = document.getElementById('delete-button');

    async function sendMessage() {
        if (isRequestPending || !userInput.value.trim()) {
            return;
        }
    
        const userMessage = userInput.value.trim();
        if (!userMessage) return;
    
        appendMessage('user', userMessage);
        userInput.value = '';
        isRequestPending = true;
        sendButton.disabled = true;
        sendButton.classList.add('disabled');
    
        let result = { content: '', newContext: [] };
        try {
            if (imagePresent) {
                const imageFile = imageInput.files[0];
                // Convert the image file to base64 or appropriate format if required
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Image = reader.result;
                    result = await llava(base64Image, userMessage, chatContext);
                };
                reader.readAsDataURL(imageFile); // Read file as base64
            } else {
                result = await llama3(userMessage, chatContext);
            }
    
            chatContext = result.newContext;
            imagePresent = false; // Reset the flag after processing
            imageInput.value = ''; // Clear the input
    
        } catch (error) {
            console.error("Message Sending Error:", error);
        } finally {
            isRequestPending = false;
            sendButton.disabled = false;
            sendButton.classList.remove('disabled');
            updateSendButtonState();
        }
    }    

    function saveCurrentConversation() {
        const conversationName = prompt('Enter a name for this conversation:', `Conversation ${Object.keys(conversations).length + 1}`);
        if (conversationName) {
            conversations[conversationName] = { context: chatContext, messages: chatBox.innerHTML };
            saveConversations();
            loadMenu();
        }
    }

    userInput.addEventListener('input', updateSendButtonState);

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

    sendButton.addEventListener('click', sendMessage);
    uploadButton.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
        if (imageInput.files.length > 0) {
            imagePresent = true; // Set the flag if an image is selected
            appendMessage('user', `<img src="${URL.createObjectURL(imageInput.files[0])}" alt="Image" style="max-width: 100%;">`);
        }
    });

    newConversationButton.addEventListener('click', newConversation);
    saveConversationButton.addEventListener('click', saveCurrentConversation);
    deleteButton.addEventListener('click', deleteCurrentConversation);

    window.sendMessage = sendMessage;

    updateSendButtonState();
    loadConversations();
    loadMenu();
});

function updateSendButtonState() {
    const isInputEmpty = !userInput.value.trim() && !imagePresent;
    const isButtonDisabled = isRequestPending || isInputEmpty;

    sendButton.disabled = isButtonDisabled;
    sendButton.classList.toggle('disabled', isButtonDisabled);
}

function deleteCurrentConversation() {
    if (confirm('Are you sure you want to delete the current conversation?')) {
        chatBox.innerHTML = '';
        chatContext = [];
        isRequestPending = false;
        sendButton.disabled = false;
        sendButton.classList.remove('disabled');
    }
}

function deleteConversation(name) {
    if (confirm(`Are you sure you want to delete the conversation "${name}"?`)) {
        delete conversations[name];
        saveConversations();
        loadMenu();
    }
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
    while (menuBar.childNodes.length > 1) {
        menuBar.removeChild(menuBar.lastChild);
    }

    Object.keys(conversations).forEach(name => {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const button = document.createElement('button');
        button.className = 'menu-button';
        button.textContent = name;
        button.onclick = () => loadConversation(name);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-button';
        deleteBtn.textContent = 'X';
        deleteBtn.onclick = () => deleteConversation(name);

        buttonContainer.appendChild(button);
        buttonContainer.appendChild(deleteBtn);
        menuBar.appendChild(buttonContainer);
    });
}

function newConversation() {
    deleteCurrentConversation();
    chatContext = [];
}

function loadConversation(name) {
    const conversation = conversations[name];
    if (conversation) {
        chatBox.innerHTML = conversation.messages;
        chatContext = conversation.context;
    }
}
