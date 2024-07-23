document.addEventListener('DOMContentLoaded', () => {
  const chatBox = document.getElementById('chat-box');
  const userInput = document.getElementById('user-input');

  // Function to append a message to the chat box
  function appendMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
  }

  // Keep track of message history
  let messageHistory = loadConversation();

  // Function to save conversation history to local storage
  function saveConversation(history) {
    localStorage.setItem('conversationHistory', JSON.stringify(history));
  }

  // Function to load conversation history from local storage
  function loadConversation() {
    const history = localStorage.getItem('conversationHistory');
    return history ? JSON.parse(history) : [];
  }

  // Function to update conversation history in the UI
  function updateConversationHistory(conversationHistory) {
    chatBox.innerHTML = ''; // Clear the chat box
    conversationHistory.forEach(item => {
      appendMessage(item.role, item.message);
    });
  }

  // Function to format conversation history for sending to backend
  function formatConversationHistory(conversationHistory) {
    return conversationHistory.map(item => {
      return `${item.role === 'user' ? 'User' : 'Bot'}: ${item.message}`;
    }).join('\n');
  }

  // Load the conversation history on page load
  updateConversationHistory(messageHistory);

  // Function to send a message
  async function sendMessage() {
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    // Append the user's message to the chat box
    appendMessage('user', userMessage);
    messageHistory.push({ role: 'user', message: userMessage });
    userInput.value = '';

    // Format the conversation history
    let formattedHistory = '';
    if (messageHistory.length > 1) { // Check if there's more than just the current message
      formattedHistory = `This was the previous history: ${formatConversationHistory(messageHistory)}. `;
    }
    formattedHistory += `Now the user has asked this question: ${userMessage}`;

    // Prepare the FormData object
    const formData = new FormData();
    formData.append('_wpnonce', '0af71b0b24');
    formData.append('post_id', '7');
    formData.append('url', 'https://chatgbt.one');
    formData.append('action', 'wpaicg_chat_shortcode_message');
    formData.append('message', formattedHistory);
    formData.append('bot_id', '0');

    try {
      const response = await fetch('http://localhost:5001/proxy', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': '*/*',
          'Origin': 'https://chatgbt.one',
          'Referer': 'https://chatgbt.one/',
          'User-Agent': navigator.userAgent,
          'Cookie': document.cookie,
        },
      });

      const rawResponse = await response.text();
      console.log('Raw Response:', rawResponse); // Debugging output

      try {
        const data = JSON.parse(rawResponse);
        if (data.data) {
          // Append the bot's response to the chat box
          appendMessage('bot', data.data);
          messageHistory.push({ role: 'bot', message: data.data });

          // Debugging output
          console.log('Conversation History:', data.conversation_history);
          updateConversationHistory(messageHistory);
          saveConversation(messageHistory);
        } else {
          appendMessage('bot', 'No data available.');
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        appendMessage('bot', 'Error parsing response.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      appendMessage('bot', 'Error fetching response. Please try again later.');
    }
  }

  // Function to delete the conversation history
  function deleteHistory() {
    localStorage.removeItem('conversationHistory');
    messageHistory = [];
    updateConversationHistory(messageHistory);
  }

  // Event listener for keydown events
  userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (!event.shiftKey) {
        event.preventDefault(); // Prevent default Enter behavior
        sendMessage();
      } else {
        userInput.value += '\n'; // Add a new line if Shift+Enter is pressed
      }
    }
  });

  window.sendMessage = sendMessage; // Make sendMessage available in HTML
  window.deleteHistory = deleteHistory; // Make deleteHistory available in HTML
});
