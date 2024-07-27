const url = "http://localhost:11434/api/generate";

let chatBox = null;
let userInput = null;
let sendButton = null;
let chatContext = [];
let isRequestPending = false;
let conversations = {};

function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = text;
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
        let buffer = "";
        let newContext = context ? context : [];
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
                    newContext = responseData.context;
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

        const { newContext } = await llama3(userMessage, chatContext);
        chatContext = newContext;
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
    newConversationButton.addEventListener('click', newConversation);
    saveConversationButton.addEventListener('click', saveCurrentConversation);
    deleteButton.addEventListener('click', deleteHistory);

    window.sendMessage = sendMessage;

    updateSendButtonState();
    loadConversations();
    loadMenu();
});

function updateSendButtonState() {
    const isInputEmpty = !userInput.value.trim();
    const isButtonDisabled = isRequestPending || isInputEmpty;

    sendButton.disabled = isButtonDisabled;
    sendButton.classList.toggle('disabled', isButtonDisabled);
}

function deleteHistory() {
    chatBox.innerHTML = '';
    chatContext = [];
    isRequestPending = false;
    sendButton.disabled = false;
    sendButton.classList.remove('disabled');
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
