const url = "http://localhost:11434/api/chat";  // API endpoint
let chatBox = document.getElementById('chat-box');
let userInput = document.getElementById('user-input');
let sendButton = document.getElementById('send-button');
let uploadButton = document.getElementById('upload-button');
let imageInput = document.getElementById('image-input');
let chatContext = [];
let isRequestPending = false;
let imagePresent = false; // Flag to indicate if an image is present
let imageData = null; // Store image data
let conversations = {}; // Object to hold saved conversations

function appendMessage(role, text, imageData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    if (imageData) {
        const image = document.createElement('img');
        image.src = imageData;
        image.alt = 'Uploaded Image';
        image.style.maxWidth = '200px';
        image.style.maxHeight = '200px';
        messageDiv.appendChild(image);
    }

    if (text) {
        const textDiv = document.createElement('div');
        textDiv.innerHTML = text;
        messageDiv.appendChild(textDiv);
    }

    chatBox.appendChild(messageDiv);

    // Ensure the chat box scrolls to the bottom
    chatBox.scrollTop = chatBox.scrollHeight;

    return messageDiv;
}


async function llama3(prompt, context = [], imageData = null) {
    const data = {
        model: imagePresent ? "llava" : "zlashAi",
        messages: [
            {
                role: "user",
                content: prompt,
                images: imageData ? [imageData] : []
            }
        ],
        stream: true
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
        
                if (responseData.message && responseData.message.content) {
                    const content = responseData.message.content.replace(/\s([.,!?;:])/g, '$1');
        
                    if (!botMessageDiv) {
                        botMessageDiv = appendMessage('bot', '');
                    }
        
                    botMessageDiv.textContent += content;
        
                    // Update scroll position to show new text
                    chatBox.scrollTop = chatBox.scrollHeight;
        
                    buffer = '';
                }
        
                if (responseData.done) {
                    botMessageDiv.innerHTML = marked.parse(botMessageDiv.innerHTML);
                    chatBox.scrollTop = chatBox.scrollHeight; // Ensure it scrolls one last time
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
        updateSendButtonState();
    }
}

function updateSendButtonState() {
    if (!userInput.value.trim() || isRequestPending) {
        sendButton.disabled = true;
        sendButton.classList.add('disabled');
    } else {
        sendButton.disabled = false;
        sendButton.classList.remove('disabled');
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

function deleteCurrentConversation() {
    if (confirm('Are you sure you want to delete the current conversation?')) {
        chatBox.innerHTML = '';
        chatContext = [];
        isRequestPending = false;
        updateSendButtonState();
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

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box');
    userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-button');
    uploadButton = document.getElementById('upload-button');
    imageInput = document.getElementById('image-input');
    const saveConversationButton = document.getElementById('save-button');
    const newConversationButton = document.getElementById('new-conversation-button');
    const deleteButton = document.getElementById('delete-button');

    sendButton.addEventListener('click', async () => {
        if (isRequestPending) return;

        const prompt = userInput.value;
        if (!prompt.trim()) return;

        appendMessage('user', prompt);
        userInput.value = '';

        isRequestPending = true;
        updateSendButtonState();

        const response = await llama3(prompt, chatContext, imageData ? imageData.split(',')[1] : null);
        chatContext = response.newContext;
    });

    uploadButton.addEventListener('click', () => {
        imageInput.click();
    });

    imageInput.addEventListener('change', () => {
        imagePresent = imageInput.files.length > 0;

        if (imagePresent) {
            const file = imageInput.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                imageData = e.target.result;
                appendMessage('user', marked.parse('*This image is selected. Type a message to send with this image.*'), imageData); // Append image message immediately
            };

            reader.readAsDataURL(file);
        } else {
            imageData = null;
        }
    });

    userInput.addEventListener('input', updateSendButtonState);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendButton.disabled) {
                sendButton.click();
            }
        }
    });

    saveConversationButton.addEventListener('click', saveCurrentConversation);
    newConversationButton.addEventListener('click', newConversation);
    deleteButton.addEventListener('click', deleteCurrentConversation);

    updateSendButtonState();
    loadConversations();
    loadMenu();
});
