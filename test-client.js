const io = require('socket.io-client');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to the server
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  query: { token: 'test-token' },
  auth: { token: 'test-token' },
  extraHeaders: { Authorization: 'Bearer test-token' }
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  console.log('Type a message and press Enter to send. Type "exit" to quit.');
  
  // Prompt for user input
  promptUser();
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server. Reason:', reason);
});

// Handle incoming messages
socket.on('message', (data) => {
  console.log('\nReceived message:', data);
  console.log('Type a message and press Enter to send:');
});

// Handle message sent acknowledgment
socket.on('message_sent', (data) => {
  console.log('Message sent acknowledgment:', data);
});

// Handle user joined event
socket.on('user_joined', (user) => {
  console.log('\nUser joined:', user);
});

// Handle user left event
socket.on('user_left', (user) => {
  console.log('\nUser left:', user);
});

// Handle users update event
socket.on('users_update', (users) => {
  console.log('\nOnline users:', users);
});

// Function to prompt for user input
function promptUser() {
  rl.question('Type a message: ', (message) => {
    if (message.toLowerCase() === 'exit') {
      console.log('Disconnecting...');
      socket.disconnect();
      rl.close();
      process.exit(0);
    } else {
      // Send the message
      socket.emit('message', { message });
      
      // Continue prompting
      promptUser();
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nDisconnecting...');
  socket.disconnect();
  rl.close();
  process.exit(0);
});
