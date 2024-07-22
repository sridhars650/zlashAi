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

    // Append the user's message to the chat box
    appendMessage('user', userMessage);
    userInput.value = '';

    // Prepare the request payload
    const requestBody = {
        type: "chat",
        messagesHistory: [
            {
                id: "80388426-fa52-40ae-a2e1-dd3003fc3ed3",
                from: "you",
                content: userMessage
            }
        ],
        settings: {
            model: "gpt-4o-mini"
        }
    };

    try {
        // Send the POST request to the proxy server
        const response = await fetch('https://your-render-url.proxy/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        // Handle the response
        const data = await response.json();

        // Debugging output
        console.log('Response Data:', data);

        // Ensure data is in expected format and append the response to the chat box
        if (data && data.messagesHistory) {
            data.messagesHistory.forEach(message => {
                if (message.from === 'bot') {
                    appendMessage('bot', message.content);
                }
            });
        } else {
            appendMessage('bot', 'Unexpected response format.');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        appendMessage('bot', 'Error fetching response. Please try again later.');
    }
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
