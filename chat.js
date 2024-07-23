document.addEventListener('DOMContentLoaded', () => {
  const chatBox = document.getElementById('chat-box');
  const userInput = document.getElementById('user-input');

  function appendMessage(role, text) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      messageDiv.textContent = text;
      chatBox.appendChild(messageDiv);
      chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
  }

  // Keep track of message history
  let messageHistory = [
      // You can initialize with some previous messages if needed
  ];

  function saveConversation(history) {
    localStorage.setItem('conversationHistory', JSON.stringify(history));
}

function loadConversation() {
    const history = localStorage.getItem('conversationHistory');
    return history ? JSON.parse(history) : [];
}

async function sendMessage() {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Append the user's message to the chat box
  appendMessage('user', userMessage);
  userInput.value = '';

  // Prepare the FormData object
  const formData = new FormData();
  formData.append('_wpnonce', '0af71b0b24');
  formData.append('post_id', '7');
  formData.append('url', 'https://chatgbt.one');
  formData.append('action', 'wpaicg_chat_shortcode_message');
  formData.append('message', userMessage);
  formData.append('bot_id', '0');
  formData.append('user_name', 'Zlash'); // Add the user's name

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

              // Debugging output
              console.log('Conversation History:', data.conversation_history);
              updateConversationHistory(data.conversation_history);
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

function updateConversationHistory(conversationHistory) {
  // This function should update the conversation history in the UI
  // Implementation depends on your UI structure
  console.log('Updated Conversation History:', conversationHistory);
}

function appendMessage(role, message) {
  // Append the message to the chat UI
  // Implementation depends on your UI structure
  const chatBox = document.getElementById('chat-box');
  const messageElement = document.createElement('div');
  messageElement.classList.add(role);
  messageElement.textContent = message;
  chatBox.appendChild(messageElement);
}






  // Utility function to generate UUID
  function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      });
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
});
