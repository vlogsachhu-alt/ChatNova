const socket = io();

const nameInput = document.getElementById('nameInput');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const userList = document.getElementById('userList');
const roomTitle = document.getElementById('roomTitle');
const messageInput = document.getElementById('messageInput');
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');

let currentUser = '';
let currentRoom = 'general';
let joined = false;

function createMessage(msg) {
  const el = document.createElement('div');
  el.className = `message ${msg.system ? 'system' : msg.user === currentUser ? 'me' : ''}`;

  if (msg.system) {
    el.innerHTML = `<div class="message-content">${msg.text}</div>`;
    return el;
  }

  const time = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  el.innerHTML = `
    <div class="message-header">
      <strong>${msg.user}</strong>
      <span>${time}</span>
    </div>
    <div class="message-content">${msg.text}</div>
  `;

  return el;
}

function renderMessages(list) {
  messages.innerHTML = '';
  list.forEach((msg) => {
    messages.appendChild(createMessage(msg));
  });
  messages.scrollTop = messages.scrollHeight;
}

function renderUsers(names) {
  userList.innerHTML = '';
  names.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    userList.appendChild(li);
  });
}

function joinRoom() {
  const name = nameInput.value.trim();
  const room = roomInput.value.trim() || 'general';

  if (!name) {
    alert('Please enter your name first.');
    return;
  }

  currentUser = name;
  currentRoom = room;
  roomTitle.textContent = room;

  if (!joined) {
    socket.emit('join-room', { name, room });
    joined = true;
  } else {
    window.location.reload();
  }
}

joinBtn.addEventListener('click', joinRoom);

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!joined) {
    alert('Join a room before sending messages.');
    return;
  }

  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat-message', text);
  messageInput.value = '';
});

socket.on('history', (history) => {
  renderMessages(history || []);
});

socket.on('message', (msg) => {
  const existing = [...messages.children].map((node) => node.textContent);
  if (existing.length > 200) {
    messages.innerHTML = '';
  }

  messages.appendChild(createMessage(msg));
  messages.scrollTop = messages.scrollHeight;
});

socket.on('room-users', (users) => {
  renderUsers(users || []);
});

nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') joinRoom();
});

roomInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') joinRoom();
});

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
