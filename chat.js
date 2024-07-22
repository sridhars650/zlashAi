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

  async function sendMessage() {
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    appendMessage('user', userMessage);
    userInput.value = '';

    try {
      // Send the POST request to the chatbot endpoint
      const response = await fetch('https://zlashai.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      // Handle the response
      const data = await response.json();

      // Debugging output
      console.log('Response Data:', data);

      // Ensure data is in expected format
      if (data && data.response) {
        appendMessage('bot', data.response);
      } else {
        appendMessage('bot', 'Unexpected response format.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      appendMessage('bot', 'Error fetching response. Please try again later.');
    }
  }

  window.sendMessage = sendMessage; // Make sendMessage available in HTML
});
