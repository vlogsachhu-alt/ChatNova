# ChatNova

This is a simple WhatsApp-style chat app built with Node.js, Express and Socket.io.

## Features
- Join room with name
- Real-time chat in a room
- Online users list
- Message history in memory
- Live notifications when users join or leave
- Responsive desktop/mobile layout

## Run locally
1. Install dependencies:
   npm install
2. Start the app:
   npm start
3. Open in browser:
   http://localhost:3000

## Notes
- This version stores chat history in memory, so messages reset when the server restarts.
- If you want, I can upgrade it to:
  - Firebase + Auth + Firestore
  - MongoDB + JWT + real persistence
  - private chats, groups, media uploads, typing indicators, online presence, and more
