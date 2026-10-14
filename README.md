# ChatNova Firebase MVP

This repo contains a Firebase-based WhatsApp-style chat app starter.

## Features
- Email/password sign-in and account creation
- Real-time chat rooms using Firestore
- Room switching
- Online users list based on current room membership
- Responsive WhatsApp-inspired UI

## Required setup
1. Create a Firebase project: https://console.firebase.google.com/
2. Enable Authentication -> Email/Password
3. Enable Cloud Firestore
4. Replace the values in `public/firebase-config.js` with your real Firebase web config
5. Make sure your Firestore rules allow read/write for authenticated users, for example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Run locally
1. npm install
2. npm start
3. Open http://localhost:3000

## Notes
- This is the fastest working Firebase MVP with email auth.
- If you want a WhatsApp-like phone OTP flow, we can add Firebase Phone Authentication in the next step.
- For production, use Firestore security rules and environment-safe config handling.
