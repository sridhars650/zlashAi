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
  
      // Encode the user message for URL
      const encodedMessage = encodeURIComponent(userMessage);
  
      try {
        // Send the request to the endpoint
        const response = await fetch(`https://zlashai.zappiziold93.workers.dev/?prompt=${encodedMessage}`);
        const data = await response.json();
  
        // Debugging output
        console.log('Response Data:', data);
  
        // Ensure data is in expected format
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.response && item.response.response) {
              appendMessage('bot', item.response.response);
            } else {
              appendMessage('bot', 'Unexpected response format.');
            }
          });
        } else {
          appendMessage('bot', 'Unexpected response structure.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        appendMessage('bot', 'Error fetching response. Please try again later.');
      }
    }
  
    window.sendMessage = sendMessage; // Make sendMessage available in HTML
  });
  