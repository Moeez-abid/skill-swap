import { initApp, avatarHtml, showToast } from '../app.js';
import { requireAuth, getUser } from '../shared/auth.js';
import { messages, users, subscribeToUserEvents } from '../shared/api.js';

if (!requireAuth()) throw new Error('auth');
initApp('messages');

let activeConversationId = new URLSearchParams(window.location.search).get('conversation');
const currentUser = getUser();

async function loadConversations() {
  const list = document.getElementById('conversation-list');
  try {
    const { conversations } = await messages.conversations();
    if (!conversations.length) {
      list.innerHTML = '<p class="empty-state">No conversations yet. Start a new chat!</p>';
      return;
    }
    list.innerHTML = conversations.map((c) => `
      <button type="button" class="conversation-item ${c.conversationId === activeConversationId ? 'active' : ''}" data-conversation="${c.conversationId}">
        ${avatarHtml(c.partner, 36)}
        <div style="flex:1;min-width:0"><strong>${c.partner.name}</strong><p style="font-size:13px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.lastMessage?.content || 'No messages'}</p></div>
        ${c.unreadCount ? `<span class="conversation-item__badge">${c.unreadCount}</span>` : ''}
      </button>`).join('');

    list.querySelectorAll('.conversation-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeConversationId = btn.dataset.conversation;
        history.replaceState(null, '', `?conversation=${activeConversationId}`);
        loadConversations();
        loadThread();
      });
    });

    if (!activeConversationId && conversations[0]) activeConversationId = conversations[0].conversationId;
    if (activeConversationId) loadThread();
  } catch {
    list.innerHTML = '<p class="empty-state">Messaging unavailable</p>';
  }
}

async function loadThread() {
  const thread = document.getElementById('message-thread');
  if (!activeConversationId) { thread.innerHTML = '<p class="empty-state">Select a conversation</p>'; return; }

  try {
    const { messages: msgs, partner } = await messages.list(activeConversationId);
    thread.innerHTML = `
      <div style="padding:16px;border-bottom:1px solid var(--glass-border-subtle);display:flex;align-items:center;gap:12px">${avatarHtml(partner, 32)} <strong>${partner.name}</strong></div>
      <div class="message-list" id="message-list">${msgs.map((m) => {
        const sent = m.senderId === currentUser.id;
        return `<div class="message-bubble message-bubble--${sent ? 'sent' : 'received'}">${m.content || `<a href="${m.fileUrl}" target="_blank">${m.fileName || 'File'}</a>`}<div class="message-meta">${new Date(m.createdAt).toLocaleTimeString()}${sent && m.isRead ? ' · Read' : ''}</div></div>`;
      }).join('')}</div>
      <form class="message-compose" id="compose-form">
        <input type="text" id="message-input" placeholder="Type a message…" required aria-label="Message" />
        <label class="btn-secondary" style="cursor:pointer">📎<input type="file" id="file-input" hidden accept="image/*,.pdf" /></label>
        <button type="submit" class="primary-cta">Send</button>
      </form>`;

    document.getElementById('message-list').scrollTop = 99999;
    document.getElementById('compose-form').addEventListener('submit', sendMessage);
    document.getElementById('file-input')?.addEventListener('change', sendFile);
  } catch {
    thread.innerHTML = '<p class="empty-state">Could not load messages</p>';
  }
}

async function sendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('message-input');
  const fd = new FormData();
  fd.append('content', input.value);
  try {
    await messages.send(activeConversationId, fd);
    input.value = '';
    loadThread();
    loadConversations();
  } catch (err) { showToast(err.message, 'error'); }
}

async function sendFile(e) {
  const file = e.target.files[0];
  if (!file || file.size > 5 * 1024 * 1024) { showToast('File must be under 5MB', 'error'); return; }
  const fd = new FormData();
  fd.append('file', file);
  try {
    await messages.send(activeConversationId, fd);
    loadThread();
  } catch (err) { showToast(err.message, 'error'); }
}

// New Chat Modal Logic
const modal = document.getElementById('new-chat-modal');
const select = document.getElementById('user-select');

document.getElementById('new-chat-btn')?.addEventListener('click', async () => {
  try {
    const data = await users.list();
    select.innerHTML = data.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    modal.showModal();
  } catch (err) {
    showToast('Failed to load users', 'error');
  }
});

document.getElementById('close-modal-btn')?.addEventListener('click', () => {
  modal.close();
});

document.getElementById('start-chat-btn')?.addEventListener('click', async () => {
  const partnerId = select.value;
  if (!partnerId) return;
  try {
    const res = await messages.createConversation(partnerId);
    modal.close();
    activeConversationId = res.conversationId;
    history.replaceState(null, '', `?conversation=${activeConversationId}`);
    loadConversations();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

loadConversations();

subscribeToUserEvents(currentUser.id, 'new-message', (data) => {
  loadConversations();
  if (data.conversationId === activeConversationId) {
    loadThread();
  } else {
    showToast('New message received!', 'info');
  }
});
