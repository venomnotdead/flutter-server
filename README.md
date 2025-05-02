# Tic-Tac-Toe Server

This is an Express.js server that provides API endpoints and real-time chat functionality for the Tic-Tac-Toe Flutter app.

## Features

- User authentication (register, login)
- User profile management
- Real-time chat using Socket.io
- RESTful API endpoints

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

## Installation

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file with the following variables:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/tic-tac-toe
JWT_SECRET=your_jwt_secret_key
```

## Running the Server

### Development Mode

```bash
npm run dev
```

This will start the server with nodemon, which automatically restarts when you make changes.

### Production Mode

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### User

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Chat

- `GET /api/chat/messages` - Get chat messages
- `POST /api/chat/messages` - Send a chat message

## Socket.io Events

### Client to Server

- `connection` - Client connects to the server
- `message` - Client sends a message

### Server to Client

- `message` - Server broadcasts a message to all clients
- `user_joined` - Server notifies when a user joins
- `user_left` - Server notifies when a user leaves
- `users_update` - Server sends the updated list of online users

## Authentication

All API endpoints (except for registration and login) require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

For Socket.io connections, include the token in the handshake headers:

```javascript
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer <token>'
  }
});
```
# flutter-server
