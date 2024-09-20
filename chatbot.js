// Function to toggle the system prompt textarea
function toggleAdditionInfo() {
  document.querySelector('.system-prompt-container').classList.toggle('show');
  document.querySelector('.wordcount-container').classList.toggle('show');
  document.querySelector('.major-event-container').classList.toggle('show');
  document.querySelector('.major-stat-container').classList.toggle('show');
  document.querySelector('.llm-container').classList.toggle('show');
  document.querySelector('.btn-container').classList.toggle('show');
  document.querySelector('.toggle-container').classList.toggle('active');
  const chatHistoryContainer = document.getElementById('chat-history');
    if (chatHistoryContainer) {
      const lastMessage = chatHistoryContainer.lastElementChild;
      if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth' });
      }
    }
}

// Function to format the message text with markdown-like syntax
function formatMessage(message) {
  // Replace bold text
  message = message.replace(/\*(.+?)\*/g, '<strong>$1</strong>');
  // Replace line breaks
  message = message.replace(/\n/g, '<br>');
  return message;
}

// Function to send a message to the chatbot
function sendMessage() {
  const userInput = document.getElementById('user-input').value;
  document.getElementById('user-input').value = '';

  // Disable input and button
  disableInput();

  if (userInput === '') {
    return;
  }

  const systemPrompt = document.getElementById('system-prompt-textarea').value.trim();

  const userMessageElement = document.createElement('div');
  userMessageElement.classList.add('user-message');
  userMessageElement.innerHTML = formatMessage(userInput);
  document.getElementById('chatbot-messages').appendChild(userMessageElement);

  // Scroll to the last user message
  userMessageElement.scrollIntoView({ behavior: 'smooth' });

  // Call the sendMessageToAPI function from the chatbot-api.js file
  sendMessageToAPI(userInput, systemPrompt);
}

function disableInput() {
  const inputField = document.getElementById('user-input');
  const sendButton = document.querySelector('.input-area button'); // Select the button directly

  if (inputField && sendButton) {
    inputField.disabled = true;
    sendButton.disabled = true;

    inputField.classList.add('disabled');
    sendButton.classList.add('disabled');
  } else {
    console.error('Input field or send button not found.');
  }
}

function enableInput() {
  const inputField = document.getElementById('user-input');
  const sendButton = document.querySelector('.input-area button'); // Select the button directly

  if (inputField && sendButton) {
    inputField.disabled = false;
    sendButton.disabled = false;

    inputField.classList.remove('disabled');
    sendButton.classList.remove('disabled');
  } else {
    console.error('Input field or send button not found.');
  }
}


// Load the system prompt from local storage on page load
window.addEventListener('DOMContentLoaded', () => {
  loadSystemPromptFromLocalStorage();
  updateChatHistoryDisplay();

  const chatHistoryContainer = document.getElementById('chat-history');
  if (chatHistoryContainer) {
    const lastMessage = chatHistoryContainer.lastElementChild;
    if (lastMessage) {
      lastMessage.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const inputField = document.getElementById('user-input');
  inputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent the default action (e.g., a new line)
      sendMessage(); // Call the sendMessage function
    }
  });
});

// Replace with your actual OpenRouter API key
const OPENROUTER_API_KEY = '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';

// Replace with your site URL
const YOUR_SITE_URL = 'https://your-site.com';

// Replace with your site name
const YOUR_SITE_NAME = 'MyChatbot';

// Chatbot API endpoint
const chatbotApiUrl = 'https://openrouter.ai/api/v1/chat/completions';

// Function to load the system prompt from local storage
function loadSystemPromptFromLocalStorage() {
  const storedSystemPrompt = localStorage.getItem('system-prompt');
  const systemPromptTextarea = document.getElementById('system-prompt-textarea');

  if (storedSystemPrompt) {
    systemPromptTextarea.value = storedSystemPrompt;
    toggleAdditionInfo(); // Show the system prompt textarea
  } else {
    systemPromptTextarea.value = '';
  }
}

async function storeChatInIndexedDB(userInput, chatbotResponse) {
  try {
    // Open the IndexedDB database
    const dbRequest = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('chatbot-db', 2);
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('chat-messages')) {
          db.createObjectStore('chat-messages', { keyPath: 'id', autoIncrement: true });
        }
      };
    });

    const transaction = dbRequest.transaction(['chat-messages'], 'readwrite');
    const objectStore = transaction.objectStore('chat-messages');
    await objectStore.add({ userInput, chatbotResponse });
    await transaction.complete;

    console.log('Chat data stored in IndexedDB');
  } catch (error) {
    console.error('Error storing chat data in IndexedDB:', error);
  }
}

// Function to send a message to the chatbot API
// Store the API responses with sequential IDs
let apiResponses = [];

async function sendMessageToAPI(userInput, systemPrompt) {
  try {
    // Get the selected LLM model
    const llmSelectElement = document.getElementById('llm-select');
	const llm_selected = 'mistralai/mistral-nemo';
    //const llm_selected = llmSelectElement.value;

    // Get the last 5 chatbot responses
    const lastXResponses = await getLastXResponses(5);
	
	// Get the last 5 major event contents
    const lastXMajorEventContent = await getLastXMajorEventContent();



    // Append 
	
	const updatedSystemPrompt = `${systemPrompt}
\n\nHere are the last 5 responses from the chatbot:
${lastXResponses.join('\n')}

\nHere are the last 5 major event contents:
${lastXMajorEventContent.join('\n')}`;
	


    // Prepare the request payload
    const requestPayload = {
      "model": llm_selected,
      "messages": [
        { "role": "system", "content": updatedSystemPrompt },
        { "role": "user", "content": userInput }
      ]
    };
  console.log('Chat SP: '+updatedSystemPrompt);
    // Make the API call to the OpenRouter API
    const response = await fetch(chatbotApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': YOUR_SITE_URL,
        'X-Title': YOUR_SITE_NAME,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error ${response.status}: ${errorData.error.message}`);
    }

    const data = await response.json();

    // Display the chatbot's response
    const chatbotMessageElement = document.createElement('div');
    chatbotMessageElement.classList.add('chatbot-message');
    chatbotMessageElement.innerHTML = formatMessage(data.choices[0].message.content);
    document.getElementById('chatbot-messages').appendChild(chatbotMessageElement);
	
    // Scroll the last chatbot message into view
    chatbotMessageElement.scrollIntoView({ behavior: 'smooth' });

    // Store the chat data in IndexedDB
    await storeChatInIndexedDB(userInput, data.choices[0].message.content);

    // Update the word counts
    updateWordCount(userInput, data.choices[0].message.content);
	postAPIsystemAction(data.choices[0].message.content,'major-event-content');
	postAPIsystemAction(data.choices[0].message.content,'major-stat-content');
	enableInput();

    // Store the additional data in browser values
    localStorage.setItem('system-prompt', systemPrompt);
	
  } catch (error) {
    console.error('Error:', error);
    const errorMessageElement = document.createElement('div');
    errorMessageElement.classList.add('chatbot-message', 'error-message');
    errorMessageElement.textContent = `Error: ${error.message}`;
    document.getElementById('chatbot-messages').appendChild(errorMessageElement);
	chatbotMessageElement.scrollIntoView({ behavior: 'smooth' });

  }
}


// Function to get the last X responses from the chat history
async function getLastXResponses(x) {
  try {
    const dbRequest = window.indexedDB.open('chatbot-db', 2); // Use version 2

    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = (event) => resolve(event.target.result);
      dbRequest.onerror = (event) => reject(event.target.error);
    });

    const transaction = db.transaction(['chat-messages'], 'readonly');
    const objectStore = transaction.objectStore('chat-messages');

    const allMessages = await new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    const lastXResponses = allMessages.slice(-x).map(message => message.chatbotResponse);
    return lastXResponses;
  } catch (error) {
    console.error('Error getting last X responses:', error);
    return [];
  }
}

// Function to load chat history from IndexedDB
async function loadChatHistoryFromIndexedDB() {
  try {
    const dbRequest = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('chatbot-db', 2);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('Error opening IndexedDB database:', event.target.error);
        reject(event.target.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('chat-messages')) {
          db.createObjectStore('chat-messages', { keyPath: 'id', autoIncrement: true });
        }
      };
    });

    const transaction = dbRequest.transaction(['chat-messages'], 'readonly');
    const objectStore = transaction.objectStore('chat-messages');

    const chatMessages = await new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = (event) => {
        console.log('Chat messages loaded from IndexedDB:', event.target.result);
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        console.error('Error getting chat messages:', event.target.error);
        reject(event.target.error);
      };
    });

    return chatMessages;
  } catch (error) {
    console.error('Error loading chat history from IndexedDB:', error);
    return []; // Return an empty array on error
  }
}


async function updateChatHistoryDisplay() {
  const chatHistory = await loadChatHistoryFromIndexedDB();
  displayChatHistory(chatHistory);
}

// Function to display the chat history
function displayChatHistory(chatHistory) {
  const chatHistoryContainer = document.getElementById('chat-history');
  chatHistoryContainer.innerHTML = '';

  chatHistory.forEach(message => {
    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('chat-message', 'user-message');
    userMessageElement.textContent = message.userInput;
    chatHistoryContainer.appendChild(userMessageElement);

    const botMessageElement = document.createElement('div');
    botMessageElement.classList.add('chat-message', 'chatbot-message');
    botMessageElement.textContent = message.chatbotResponse;
    chatHistoryContainer.appendChild(botMessageElement);
  });
}

// Function to clear the chat history
async function clearChatHistory() {
  try {
    // Open the IndexedDB database
    const dbRequest = window.indexedDB.open('chatbot-db', 2);

    // Clear the 'chat-messages' object store
    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = function(event) {
        resolve(event.target.result);
      };
      dbRequest.onerror = function(event) {
        reject(event.target.errorCode);
      };
    });

    const transaction = db.transaction(['chat-messages'], 'readwrite');
    const objectStore = transaction.objectStore('chat-messages');
    objectStore.clear();
    await transaction.complete;

    // Update the chat history display
    await updateChatHistoryDisplay();

    const chatbotmessagesContainer = document.getElementById('chatbot-messages');
  if (chatbotmessagesContainer) {
    chatbotmessagesContainer.innerHTML = '';
  }

    console.log('Chat history cleared');
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
}

function wordCount(text) {
  if (typeof text === 'string') {
    // Remove leading/trailing whitespace
    text = text.trim();

    // Check if the text is empty
    if (text === '') {
      return 0;
    }

    let wordCount = 0;
    let currentWord = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Check if the current character is a CJK character
      if (/[\u3400-\u9FBF]|[\u4E00-\u9FFF]|[\uF900-\uFAFF]|[\u3040-\u309F]|[\u30A0-\u30FF]|[\uAC00-\uD7AF]|[\u1100-\u11FF]|[\u3130-\u318F]|[\uA960-\uA97F]|[\uD7B0-\uD7FF]/.test(char)) {
        // If the current word is not empty, increment the word count
        if (currentWord.trim() !== '') {
          wordCount += 1;
          currentWord = '';
        }

        // Treat the CJK character as half a word
        wordCount += 0.5;
      } else if (/\s/.test(char)) {
        // If the current character is whitespace and the current word is not empty, increment the word count
        if (currentWord.trim() !== '') {
          wordCount += 1;
          currentWord = '';
        }
      } else {
        // Add the current character to the current word
        currentWord += char;
      }
    }

    // Handle the last word
    if (currentWord.trim() !== '') {
      wordCount += 1;
    }

    return Math.floor(wordCount);
  } else {
    return 0;
  }
}


function updateWordCount(userInput, chatbotResponse) {
  const userInputWordCount = wordCount(userInput);
  const chatbotResponseWordCount = wordCount(chatbotResponse);

  // Update the user input word count
  const userInputStatsElement = document.getElementById('user-input-stats');
  if (userInputStatsElement) {
    userInputStatsElement.textContent = `${userInputWordCount} words`;
  }

  // Update the chatbot response word count
  const chatbotResponseStatsElement = document.getElementById('chatbot-response-stats');
  if (chatbotResponseStatsElement) {
    chatbotResponseStatsElement.textContent = `${chatbotResponseWordCount} words`;
  }
}


async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('chatbot-db', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create the 'chat-messages' object store if it doesn't exist
      if (!db.objectStoreNames.contains('chat-messages')) {
        db.createObjectStore('chat-messages', { keyPath: 'id', autoIncrement: true });
      }

      // Create the 'major-event-content' object store if it doesn't exist
      if (!db.objectStoreNames.contains('major-event-content')) {
        db.createObjectStore('major-event-content', { keyPath: 'id', autoIncrement: true });
      }

      // Create the 'major-stat-content' object store if it doesn't exist
      if (!db.objectStoreNames.contains('major-stat-content')) {
        db.createObjectStore('major-stat-content', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function parseInput(input) {
  // Check for '@@@@' and drop if found
  if (input.includes('@@@@')) {
    console.log('Input dropped due to "@@@@"');
    return null; // Or return an appropriate value indicating drop
  }

  // Use a regex to match the format while ignoring the word "Statistic"
  const regex = /##\s*[^#]*?(\w+):\s*([^#]+?)\s*##/i; // Match any characters but ignore "Statistic"
  const matches = input.match(regex);

  if (matches) {
    // Extract valueName and value
    const valueName = matches[1].trim().toLowerCase().replace(/\s+/g, ''); // Normalize valueName
    const value = matches[2].trim(); // Keep the value as is

    console.log(`Value Name: ${valueName}, Value: ${value}`);
    return { valueName, value }; // Return as an object
  }

  console.log('Invalid input format');
  return null; // Return null if format doesn't match
}

async function postAPIsystemAction(userInput, scenario) {
  try {
    console.log('Post API: ' + scenario + ' \n', userInput);

    const llm_selected = 'mistralai/mistral-nemo';

    // Prepare the updated system prompt based on the scenario
    let updatedSystemPrompt;

    if (scenario === 'major-event-content') {
      const lastXMajorEventContent = await getLastXMajorEventContent();
      updatedSystemPrompt = `You a strict prompt analyzer. Here are some major talking points before. Based on the dialogue, please answer if this is a new event or a continuation of previous dialogue? If it is a new talking point, provide a 10~15 word summary based on existing input. If the dialogue continues the previous point, reply with a ####. Here are the previous events: ${lastXMajorEventContent.join('\n')}`;

    } else if (scenario === 'major-stat-content') {
      const lastXMajorStatContent = await getLastXMajorStatContent();

      if (Array.isArray(lastXMajorStatContent) && lastXMajorStatContent.length > 0) {
        updatedSystemPrompt = `You a strict prompt analyzer. Below are some major statistics between characters in their previous relationship. Based on the dialogue, is there some action that is worth noting as a statistic? For example, number of kisses, number of dinners, locations they have been to? Reply only as ## Statistic Name: Number ##. If the dialogue has no key moment, reply with a @@@@. Here are the previous statistics: ${lastXMajorStatContent.join('\n')}`;
      } else {
        console.log('No valid statistics found. Using default prompt.');
        updatedSystemPrompt = `You a strict prompt analyzer. Below are some major statistics between characters in their previous relationship. Based on the dialogue, is there some action that is worth noting as a statistic? For example, number of kisses, number of dinners, locations they have been to? Reply only as ## Statistic Name: Number ##.`;
      }

    } else {
      throw new Error('Invalid scenario provided');
    }

    // Prepare the request payload
    const requestPayload = {
      "model": llm_selected,
      "messages": [
        { "role": "system", "content": updatedSystemPrompt },
        { "role": "user", "content": userInput }
      ]
    };

    console.log('systemprompt: ' + updatedSystemPrompt);

    // Make the API call to the OpenRouter API
    const response = await fetch(chatbotApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': YOUR_SITE_URL,
        'X-Title': YOUR_SITE_NAME,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error ${response.status}: ${errorData.error.message}`);
    }

    const apiResponse = await response.json();

    console.log('PostAPI Event response:', apiResponse.choices[0].message.content);

    // Store the updated major-event-content or major-stat-content in IndexedDB
    if (scenario === 'major-event-content') {
      await storeMajorEventContentInIndexedDB(apiResponse.choices[0].message.content);
      console.log('Stored major event content in IndexedDB');
    } else if (scenario === 'major-stat-content') {
      console.log('Try to Store Stat: ' + apiResponse.choices[0].message.content);
      const result = parseInput(apiResponse.choices[0].message.content);

      if (result) {
        await storeMajorStatInIndexedDB(result.valueName, result.value);
      } else {
        console.log('No valid data extracted or input dropped.');
      }
      console.log('Stored major stat content in IndexedDB');
    }

    // Update the corresponding HTML element
    if (scenario === 'major-event-content') {
      document.getElementById('major-event-content').textContent = apiResponse.choices[0].message.content;
      console.log('Updated major-event-content element');
    } else if (scenario === 'major-stat-content') {
      document.getElementById('major-stat-content').textContent = apiResponse.choices[0].message.content;
      console.log('Updated major-stat-content element');
    }

    // Return the API response
    return apiResponse;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}


async function loadMajorContentFromIndexedDB() {
  try {
    // Open the IndexedDB database
    const db = await openIndexedDB();

    // Load major event content
    const eventTransaction = db.transaction(['major-event-content'], 'readonly');
    const eventObjectStore = eventTransaction.objectStore('major-event-content');
    const majorEventContent = await new Promise((resolve, reject) => {
      const request = eventObjectStore.getAll();
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });

    // Load major stat content
    const statTransaction = db.transaction(['major-stat-content'], 'readonly');
    const statObjectStore = statTransaction.objectStore('major-stat-content');
    const majorStatContent = await new Promise((resolve, reject) => {
      const request = statObjectStore.getAll();
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });

    return { majorEventContent, majorStatContent };
  } catch (error) {
    console.error('Error loading major content from IndexedDB:', error);
    return { majorEventContent: [], majorStatContent: [] };
  }
}



//Edited from storeChatInIndexedDB

async function storeMajorEventContentInIndexedDB(majorEventContent) {
  try {
	  // Filter out the phrase "New event" (case insensitive)
    majorEventContent = majorEventContent.replace(/new event/gi, '').trim();
	
    // Check if the input contains "##"
    if (majorEventContent.includes("##")) {
      console.log('Previously Event, not stored');
      return; // Exit the function without storing
    }
	
	

    // Trim the content if it exceeds 80 characters
    if (majorEventContent.length > 80) {
      // Trim to the nearest space
      const trimmedContent = majorEventContent.slice(0, 80).trim();
      const lastSpaceIndex = trimmedContent.lastIndexOf(' ');

      // If there's a space, trim to that point
      if (lastSpaceIndex !== -1) {
        majorEventContent = trimmedContent.slice(0, lastSpaceIndex);
      } else {
        // If no space, just trim to 80 characters
        majorEventContent = trimmedContent;
      }
    }

    // Open the IndexedDB database
    const dbRequest = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('chatbot-db', 2);
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('major-event-content')) {
          db.createObjectStore('major-event-content', { keyPath: 'id', autoIncrement: true });
        }
      };
    });

    const transaction = dbRequest.transaction(['major-event-content'], 'readwrite');
    const objectStore = transaction.objectStore('major-event-content');
    await objectStore.add({ majorEventContent });
    await transaction.complete;

    console.log('Major event content stored in IndexedDB');
  } catch (error) {
    console.error('Error storing Major event content in IndexedDB:', error);
  }
}


////////////////////////////////
// Function to get the last X responses from the chat history
async function getLastXMajorEventContent() {
  try {
    const dbRequest = window.indexedDB.open('chatbot-db', 2); // Use version 2

    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = (event) => resolve(event.target.result);
      dbRequest.onerror = (event) => reject(event.target.error);
    });

    const transaction = db.transaction(['major-event-content'], 'readonly');
    const objectStore = transaction.objectStore('major-event-content');

    const allMessages = await new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    // Extract only the content from the returned objects
    const majorEventContents = allMessages.map(message => message.majorEventContent);
    return majorEventContents;
  } catch (error) {
    console.error('Error getting last major event content:', error);
    return [];
  }
}


async function storeMajorStatInIndexedDB(valueName, value) {
  try {
    // Normalize valueName: lowercase and no spaces
    const normalizedValueName = valueName.toLowerCase().replace(/\s+/g, '');

    // Check if the value exceeds 80 characters
    if (value.length > 80) {
      const trimmedValue = value.slice(0, 80).trim();
      const lastSpaceIndex = trimmedValue.lastIndexOf(' ');

      if (lastSpaceIndex !== -1) {
        value = trimmedValue.slice(0, lastSpaceIndex);
      } else {
        value = trimmedValue;
      }
    }

    // Open the IndexedDB database
    const dbRequest = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open('chatbot-db', 2);
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('major-stat-content')) {
          const objectStore = db.createObjectStore('major-stat-content', { keyPath: 'id', autoIncrement: true });
          objectStore.createIndex('valueName', 'valueName', { unique: true }); // Create index
        }
      };
    });

    const transaction = dbRequest.transaction(['major-stat-content'], 'readwrite');
    const objectStore = transaction.objectStore('major-stat-content');

    // Check if the valueName already exists
    const existingEntry = await new Promise((resolve, reject) => {
      const request = objectStore.index('valueName').get(normalizedValueName);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    if (existingEntry) {
      // Update the existing entry
      existingEntry.value = value; // Update the value
      await objectStore.put(existingEntry); // Use put to update
      console.log('Major stat updated in IndexedDB');
    } else {
      // Add a new entry
      await objectStore.add({ valueName: normalizedValueName, value });
      console.log('Major stat stored in IndexedDB');
    }

    await transaction.complete;
  } catch (error) {
    console.error('Error storing Major stat in IndexedDB:', error);
}
  }

async function getLastXMajorStatContent() {
  try {
    const dbRequest = window.indexedDB.open('chatbot-db', 2); // Use version 2

    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = (event) => resolve(event.target.result);
      dbRequest.onerror = (event) => reject(event.target.error);
    });

    const transaction = db.transaction(['major-stat-content'], 'readonly');
    const objectStore = transaction.objectStore('major-stat-content');

    const allStats = await new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    // Ensure that allStats is an array and format the output
    return Array.isArray(allStats) ? allStats.map(stat => `${stat.valueName}:${stat.value}`).join('; ') : [];
  } catch (error) {
    console.error('Error getting last major stat content:', error);
    return []; // Return an empty array on error
  }
}