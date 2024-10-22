const url = "http://localhost:11434/api/chat";  // API endpoint
let chatBox = document.getElementById('chat-box');
let userInput = document.getElementById('user-input');
let sendButton = document.getElementById('send-button');
let stopButton = document.getElementById('stop-button'); // Add this line
let uploadButton = document.getElementById('upload-button');
let imageInput = document.getElementById('image-input');
let loadingLogo = document.getElementById('loading-logo'); // Loading logo element
let chatContext = []; // Stores conversation history
let isRequestPending = false;
let imagePresent = false; // Flag to indicate if an image is present
let imageData = null; // Store image data
let conversations = {}; // Object to hold saved conversations
let currentConversation = null; // Store the name of the current conversation
let abortController = null; // Controller for aborting requests

// Initialize markdown-it
const md = window.markdownit();

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

async function llama3(prompt, imageData = null) {
    if (abortController) {
        abortController.abort(); // Abort the previous request if any
    }
    abortController = new AbortController(); // Create a new AbortController

    const data = {
        model: imagePresent ? "llava" : "zlashAi",
        messages: chatContext,
        stream: true
    };

    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        console.log("Sending data:", JSON.stringify(data));
        
        // Show loading logo
        loadingLogo.style.display = 'block';

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
            signal: abortController.signal // Pass the AbortSignal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let botMessageDiv = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (loadingLogo.style.display === 'block') {
                loadingLogo.style.display = 'none';
            }

            const decodedLine = decoder.decode(value, { stream: true });
            buffer += decodedLine;

            try {
                const responseData = JSON.parse(buffer);

                if (responseData.message && responseData.message.content) {
                    const content = responseData.message.content.replace(/\s(?<!\n)([.,!?;:])/g, '$1');

                    if (!botMessageDiv) {
                        botMessageDiv = appendMessage('bot', '');
                    }
                    
                    botMessageDiv.textContent += content;

                    // Update scroll position to show new text
                    chatBox.scrollTop = chatBox.scrollHeight;

                    buffer = '';
                }

                if (responseData.done) {
                    botMessageDiv.innerHTML = md.render(botMessageDiv.innerHTML); // Use markdown-it for rendering markdown
                    chatBox.scrollTop = chatBox.scrollHeight; // Ensure it scrolls one last time
                    chatContext.push({
                        role: "assistant",
                        content: botMessageDiv.textContent
                    });
                    break;
                }
            } catch (e) {
                console.error("JSON Decode Error:", e);
            }
        }

        return { content: buffer };
    } catch (e) {
        if (e.name === 'AbortError') {
            console.log('Request was aborted');
        } else {
            console.error("Request Error:", e);
        }
        return { content: '' };
    } finally {
        isRequestPending = false;
        updateButtonState(); // Update button state to show send button
        // Ensure loading logo is hidden if an error occurs
        loadingLogo.style.display = 'none';
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

function updateButtonState() {
    if (isRequestPending) {
        sendButton.classList.add('fade-out');
        stopButton.classList.remove('fade-out');
        stopButton.classList.add('fade-in');
        sendButton.style.display = 'none'; // Hide send button
        stopButton.style.display = 'inline'; // Show stop button
    } else {
        sendButton.classList.remove('fade-out');
        sendButton.classList.add('fade-in');
        stopButton.classList.remove('fade-in');
        stopButton.classList.add('fade-out');
        sendButton.style.display = 'inline'; // Show send button
        stopButton.style.display = 'none'; // Hide stop button
    }

    // Also update the send button state based on the text area content
    if (!userInput.value.trim() || isRequestPending) {
        sendButton.disabled = true;
        sendButton.classList.add('disabled');
    } else {
        sendButton.disabled = false;
        sendButton.classList.remove('disabled');
    }
}


function saveCurrentConversation() {
    if (currentConversation) {
        conversations[currentConversation] = { context: chatContext, messages: chatBox.innerHTML };
        saveConversations();
        loadMenu();
    } else {
        const conversationName = prompt('Enter a name for this conversation:', `Conversation ${Object.keys(conversations).length + 1}`);
        if (conversationName) {
            conversations[conversationName] = { context: chatContext, messages: chatBox.innerHTML };
            currentConversation = conversationName;
            saveConversations();
            loadMenu();
        }
    }
}

function deleteCurrentConversation() {
    if (confirm('Are you sure you want to delete the current conversation?')) {
        chatBox.innerHTML = '';
        chatContext = [];
        isRequestPending = false;
        updateSendButtonState();
        if (currentConversation) {
            delete conversations[currentConversation];
            saveConversations();
            loadMenu();
            currentConversation = null;
        }
    }
}

function deleteConversation(name) {
    if (confirm(`Are you sure you want to delete the conversation "${name}"?`)) {
        delete conversations[name];
        if (currentConversation === name) {
            chatBox.innerHTML = '';
            chatContext = [];
            currentConversation = null;
        }
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
        currentConversation = name; // Set the current conversation name
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chatBox = document.getElementById('chat-box');
    userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-button');
    stopButton = document.getElementById('stop-button'); // Add this line
    uploadButton = document.getElementById('upload-button');
    imageInput = document.getElementById('image-input');
    loadingLogo = document.getElementById('loading-logo'); // Get the loading logo element
    const saveConversationButton = document.getElementById('save-button');
    const newConversationButton = document.getElementById('new-conversation-button');
    const deleteButton = document.getElementById('delete-button');

    sendButton.addEventListener('click', async () => {
        if (isRequestPending) return;
    
        const prompt = userInput.value;
        if (!prompt.trim()) return;
    
        // Add user message to chat context
        chatContext.push({
            role: "user",
            content: prompt,
            images: imageData ? [imageData.split(',')[1]] : []
        });
    
        appendMessage('user', prompt);
        userInput.value = '';
    
        isRequestPending = true;
        updateButtonState(); // Update button state to show stop button
    
        const response = await llama3(prompt, imageData ? imageData.split(',')[1] : null);
    });
    

    stopButton.addEventListener('click', () => {
        if (abortController) {
            abortController.abort(); // Abort the ongoing request
        }
        isRequestPending = false;
        updateButtonState(); // Update button state to show send button
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
                appendMessage('user', md.render('*This image is selected. Type a message to send with this image.*'), imageData); // Append image message immediately
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
            sendButton.click();
        }
    });

    saveConversationButton.addEventListener('click', saveCurrentConversation);

    newConversationButton.addEventListener('click', newConversation);

    deleteButton.addEventListener('click', deleteCurrentConversation);

    loadConversations();
    loadMenu();
});
