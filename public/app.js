const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(app);
const db = firebase.firestore(app);

const state = {
  uid: null,
  roomName: 'general',
  unsubscribeMessages: null,
  unsubscribeMembers: null,
  currentUserName: 'Guest'
};

const authCard = document.getElementById('authCard');
const appShell = document.querySelector('.app-shell');
const authForm = document.getElementById('authForm');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const authError = document.getElementById('authError');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');
const roomInput = document.getElementById('roomInput');
const roomTitle = document.getElementById('roomTitle');
const userList = document.getElementById('userList');
const messagesEl = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const chatForm = document.getElementById('chatForm');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const logoutBtn = document.getElementById('logoutBtn');
const statusBanner = document.getElementById('statusBanner');

function showBanner(message) {
  statusBanner.textContent = message;
  statusBanner.classList.remove('hidden');
}

function hideBanner() {
  statusBanner.textContent = '';
  statusBanner.classList.add('hidden');
}

function setAuthError(message) {
  if (!message) {
    authError.classList.add('hidden');
    authError.textContent = '';
    return;
  }

  authError.textContent = message;
  authError.classList.remove('hidden');
}

function formatDisplayName(email) {
  return (email || 'User').split('@')[0] || 'User';
}

function getRoomRef(roomName) {
  return db.collection('rooms').doc(roomName.trim() || 'general');
}

function getMessagesRef(roomName) {
  return getRoomRef(roomName).collection('messages');
}

function formatTime(timestamp) {
  if (!timestamp) return 'Now';

  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderUsers(members) {
  userList.innerHTML = '';

  const names = Array.isArray(members)
    ? members
    : Object.values(members || {}).map((member) => member.name || member.email || 'User');

  if (!names.length) {
    const li = document.createElement('li');
    li.textContent = 'No users yet';
    userList.appendChild(li);
    return;
  }

  names.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    userList.appendChild(li);
  });
}

function renderMessages(messages) {
  messagesEl.innerHTML = '';

  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'message system';
    empty.textContent = 'No messages yet. Start the conversation.';
    messagesEl.appendChild(empty);
    return;
  }

  messages.forEach((msg) => {
    const item = document.createElement('div');
    const isMine = msg.uid === state.uid;

    item.className = `message ${isMine ? 'me' : ''} ${msg.system ? 'system' : ''}`;

    if (msg.system) {
      item.innerHTML = `<div class="message-content">${msg.text}</div>`;
      messagesEl.appendChild(item);
      return;
    }

    item.innerHTML = `
      <div class="message-header">
        <strong>${msg.displayName || 'User'}</strong>
        <span>${formatTime(msg.createdAt)}</span>
      </div>
      <div class="message-content">${msg.text}</div>
    `;

    messagesEl.appendChild(item);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function attachRoomListeners(roomName) {
  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
  }

  if (state.unsubscribeMembers) {
    state.unsubscribeMembers();
  }

  state.unsubscribeMessages = getMessagesRef(roomName).orderBy('createdAt', 'asc').onSnapshot((snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderMessages(data);
  }, (error) => {
    showBanner(`Chat error: ${error.message}`);
  });

  state.unsubscribeMembers = getRoomRef(roomName).onSnapshot((docSnap) => {
    const members = docSnap.data()?.members || {};
    const memberList = Object.values(members)
      .filter((member) => member && member.name)
      .map((member) => member.name);
    renderUsers(memberList);
  }, (error) => {
    showBanner(`Presence error: ${error.message}`);
  });
}

async function joinRoom(roomName) {
  const safeName = (roomName || state.roomName || 'general').trim() || 'general';
  state.roomName = safeName;
  roomInput.value = safeName;
  roomTitle.textContent = `#${safeName}`;

  const roomRef = getRoomRef(safeName);
  await roomRef.set(
    {
      name: safeName,
      members: {
        [state.uid]: {
          name: state.currentUserName,
          email: auth.currentUser.email,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        }
      }
    },
    { merge: true }
  );

  attachRoomListeners(safeName);
  showBanner(`Joined room #${safeName}`);
}

async function leaveRoom(roomName) {
  if (!state.uid || !roomName) return;

  const roomRef = getRoomRef(roomName);
  try {
    await roomRef.update({
      [`members.${state.uid}`]: firebase.firestore.FieldValue.delete()
    });
  } catch (error) {
    // Ignore if room does not exist yet
  }
}

async function performAuth(action) {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    setAuthError('Email and password are required.');
    return;
  }

  try {
    setAuthError('');

    if (action === 'signup') {
      await auth.createUserWithEmailAndPassword(email, password);
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (error) {
    setAuthError(error.message || 'Authentication failed.');
  }
}

async function handleSendMessage(event) {
  event.preventDefault();

  const text = messageInput.value.trim();
  if (!text || !state.uid) return;

  try {
    await getMessagesRef(state.roomName).add({
      uid: state.uid,
      displayName: state.currentUserName,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    messageInput.value = '';
  } catch (error) {
    showBanner(`Send failed: ${error.message}`);
  }
}

function setupAuthUI() {
  authForm.addEventListener('submit', (event) => {
    event.preventDefault();
    performAuth('login');
  });

  loginBtn.addEventListener('click', () => performAuth('login'));
  signupBtn.addEventListener('click', () => performAuth('signup'));

  logoutBtn.addEventListener('click', async () => {
    if (state.uid && state.roomName) {
      await leaveRoom(state.roomName);
    }

    await auth.signOut();
  });

  joinRoomBtn.addEventListener('click', () => joinRoom(roomInput.value));
  chatForm.addEventListener('submit', handleSendMessage);

  roomInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      joinRoom(roomInput.value);
    }
  });

  window.addEventListener('beforeunload', async () => {
    if (state.uid && state.roomName) {
      await leaveRoom(state.roomName);
    }
  });
}

async function initializeUserSession(user) {
  state.uid = user.uid;
  state.currentUserName = formatDisplayName(user.email || user.displayName || 'User');

  userNameEl.textContent = state.currentUserName;
  userEmailEl.textContent = user.email || 'No email';
  userAvatar.textContent = state.currentUserName.charAt(0).toUpperCase();

  authCard.classList.add('hidden');
  appShell.style.display = 'grid';

  await joinRoom(state.roomName);
}

function signOutSession() {
  state.uid = null;
  if (state.unsubscribeMessages) state.unsubscribeMessages();
  if (state.unsubscribeMembers) state.unsubscribeMembers();

  userNameEl.textContent = 'Guest';
  userEmailEl.textContent = 'Not signed in';
  userAvatar.textContent = 'A';
  authCard.classList.remove('hidden');
  appShell.style.display = 'none';
  messagesEl.innerHTML = '';
  renderUsers([]);
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    initializeUserSession(user);
  } else {
    signOutSession();
  }
});

setupAuthUI();
appShell.style.display = 'none';
showBanner('Add your Firebase config in public/firebase-config.js to start chatting.');
