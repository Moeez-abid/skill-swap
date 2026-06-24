import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { messages, users, subscribeToUserEvents, getImageUrl } from '../shared/api';
import { isLoggedIn, getUser } from '../shared/auth';

function Avatar({ user, size = 36 }) {
  const initials = (user?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);
  if (user?.avatarUrl) {
    return <img src={getImageUrl(user.avatarUrl)} alt="" className="avatar" width={size} height={size} style={{ objectFit: 'cover' }} />;
  }
  return (
    <span className="avatar avatar--initials" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get('conversation');

  const currentUser = getUser();

  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState(false);

  const [threadMsgs, setThreadMsgs] = useState([]);
  const [partner, setPartner] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState(false);

  const [messageInput, setMessageInput] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);

  const messageListRef = useRef(null);
  const modalRef = useRef(null);
  const confirmModalRef = useRef(null);
  
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  
  const [confirmData, setConfirmData] = useState({ title: '', message: '', onConfirm: null });

  const requestConfirm = (title, message, onConfirm) => {
    setConfirmData({ title, message, onConfirm });
    if (confirmModalRef.current) confirmModalRef.current.showModal();
  };

  const closeConfirm = () => {
    if (confirmModalRef.current) confirmModalRef.current.close();
  };

  const handleConfirmAction = () => {
    if (confirmData.onConfirm) confirmData.onConfirm();
    closeConfirm();
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadConversations = async () => {
    try {
      const res = await messages.conversations();
      setConversations(res.conversations);
      setConvError(false);
      
      // If no active conversation but we have some, set the first one
      if (!activeConversationId && res.conversations.length > 0) {
        setSearchParams({ conversation: res.conversations[0].conversationId });
      }
    } catch (e) {
      setConvError(true);
    } finally {
      setConvLoading(false);
    }
  };

  const loadThread = async () => {
    if (!activeConversationId) return;
    setThreadLoading(true);
    try {
      const res = await messages.list(activeConversationId);
      setThreadMsgs(res.messages);
      setPartner(res.partner);
      setThreadError(false);
      // Scroll to bottom
      setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      }, 50);
    } catch (e) {
      setThreadError(true);
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    loadConversations();
    
    const unsubNew = subscribeToUserEvents(currentUser.id, 'new-message', (data) => {
      loadConversations();
      if (data.conversationId === activeConversationId) {
        loadThread();
      } else {
        showToast('New message received!');
      }
    });

    const unsubDelMsg = subscribeToUserEvents(currentUser.id, 'message-deleted', (data) => {
      loadConversations();
      if (data.conversationId === activeConversationId) {
        loadThread();
      }
    });

    const unsubBulkDelMsg = subscribeToUserEvents(currentUser.id, 'messages-deleted', (data) => {
      loadConversations();
      if (data.conversationId === activeConversationId) {
        loadThread();
      }
    });

    const unsubDelConv = subscribeToUserEvents(currentUser.id, 'conversation-deleted', (data) => {
      loadConversations();
      if (data.conversationId === activeConversationId) {
        setSearchParams({});
      }
    });

    return () => {
      if (unsubNew) unsubNew();
      if (unsubDelMsg) unsubDelMsg();
      if (unsubBulkDelMsg) unsubBulkDelMsg();
      if (unsubDelConv) unsubDelConv();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (activeConversationId) {
      loadThread();
      setReplyingTo(null);
      setSelectedMessages(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !file) return;

    const content = messageInput.trim();
    const currentFile = file;
    const currentReplyTo = replyingTo;
    
    // Optimistic UI update
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      senderId: currentUser.id,
      content,
      fileUrl: currentFile ? URL.createObjectURL(currentFile) : null,
      fileName: currentFile ? currentFile.name : null,
      createdAt: new Date().toISOString(),
      isRead: false,
      replyTo: currentReplyTo
    };

    setThreadMsgs(prev => [...prev, optimisticMsg]);
    setMessageInput('');
    setFile(null);
    setReplyingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Scroll to bottom immediately
    setTimeout(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
    }, 50);

    const fd = new FormData();
    if (content) fd.append('content', content);
    if (currentFile) fd.append('file', currentFile);
    if (currentReplyTo) fd.append('replyToId', currentReplyTo.id);

    try {
      await messages.send(activeConversationId, fd);
      loadThread();
      loadConversations();
    } catch (err) {
      showToast(err.message);
      loadThread(); // Refresh on error to rollback
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      showToast('File must be under 5MB');
      return;
    }
    
    // Auto send if it's just a file upload
    const fd = new FormData();
    fd.append('file', f);
    try {
      await messages.send(activeConversationId, fd);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadThread();
      loadConversations();
    } catch (err) {
      showToast(err.message);
    }
  };

  const openNewChatModal = async () => {
    try {
      const data = await users.list();
      setAllUsers(data.users);
      if (data.users.length > 0) setSelectedUser(data.users[0].id);
      if (modalRef.current) modalRef.current.showModal();
    } catch (err) {
      showToast('Failed to load users');
    }
  };

  const closeNewChatModal = () => {
    if (modalRef.current) modalRef.current.close();
  };

  const handleStartChat = async () => {
    if (!selectedUser) return;
    try {
      const res = await messages.createConversation(selectedUser);
      closeNewChatModal();
      setSearchParams({ conversation: res.conversationId });
      loadConversations();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteChat = () => {
    requestConfirm('Delete Chat', 'Are you sure you want to delete this chat? This cannot be undone.', async () => {
      try {
        await messages.deleteConversation(activeConversationId);
        setSearchParams({});
        loadConversations();
        showToast('Chat deleted');
      } catch (err) {
        showToast(err.message);
      }
    });
  };

  const handleDeleteMessage = (msgId) => {
    requestConfirm('Delete Message', 'Are you sure you want to delete this message? This cannot be undone.', async () => {
      try {
        await messages.deleteMessage(activeConversationId, msgId);
        loadThread();
        loadConversations();
      } catch (err) {
        showToast(err.message);
      }
    });
  };

  const toggleSelection = (id) => {
    const next = new Set(selectedMessages);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMessages(next);
  };

  const handleBulkDelete = () => {
    requestConfirm('Delete Selected', `Are you sure you want to delete ${selectedMessages.size} selected message(s)?`, async () => {
      try {
        await messages.bulkDeleteMessages(Array.from(selectedMessages));
        setSelectedMessages(new Set());
        loadThread();
        loadConversations();
      } catch (err) {
        showToast(err.message);
      }
    });
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '110px', 
      bottom: '24px', 
      left: '50%', 
      transform: 'translateX(-50%)', 
      width: '90%', 
      maxWidth: '1500px', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      zIndex: 40 
    }}>
      <div className="messages-layout animate-fade-up delay-1" style={{ flex: 1, minHeight: 0 }}>
        <aside className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }} aria-label="Conversations">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
            <strong style={{ fontSize: '1.05rem' }}>Messages</strong>
            <button type="button" className="primary-cta" onClick={openNewChatModal} style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}>New Chat</button>
          </div>
          <div className="conversation-list" style={{ padding: '12px' }}>
            {convLoading ? (
              <p className="loading">Loading...</p>
            ) : convError ? (
              <p className="empty-state">Messaging unavailable</p>
            ) : conversations.length === 0 ? (
              <p className="empty-state">No conversations yet. Start a new chat!</p>
            ) : (
              conversations.map(c => (
                <button 
                  key={c.conversationId} 
                  type="button" 
                  className={`conversation-item ${c.conversationId === activeConversationId ? 'active' : ''}`} 
                  onClick={() => setSearchParams({ conversation: c.conversationId })}
                >
                  <Avatar user={c.partner} size={36} />
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <strong>{c.partner.name}</strong>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.lastMessage?.content || 'No messages'}
                    </p>
                  </div>
                  {c.unreadCount > 0 && <span className="conversation-item__badge">{c.unreadCount}</span>}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="message-thread glass-card" aria-label="Message thread">
          {!activeConversationId ? (
            <p className="empty-state">Select a conversation</p>
          ) : threadLoading && threadMsgs.length === 0 ? (
            <p className="loading">Loading thread...</p>
          ) : threadError ? (
            <p className="empty-state">Could not load messages</p>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'var(--glass-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar user={partner} size={36} /> <strong style={{ fontSize: '1.05rem' }}>{partner?.name}</strong>
                </div>
                <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'transparent' }} onClick={handleDeleteChat}>Delete Chat</button>
              </div>
              <div className="message-list" ref={messageListRef}>
                {threadMsgs.map(m => {
                  const sent = m.senderId === currentUser.id;
                  const isHovered = hoveredMsgId === m.id;
                  const isMenuOpen = openMenuId === m.id;
                  const isSelected = selectedMessages.has(m.id);
                  const isSelecting = selectedMessages.size > 0;

                  return (
                    <div 
                      key={m.id} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: sent ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: '16px' }}
                      onMouseEnter={() => setHoveredMsgId(m.id)}
                      onMouseLeave={() => setHoveredMsgId(null)}
                    >
                      {isSelecting && (
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelection(m.id)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px', flexShrink: 0 }}
                        />
                      )}
                      <div 
                        className={`message-bubble message-bubble--${sent ? 'sent' : 'received'}`} 
                        style={{ position: 'relative', width: '100%', maxWidth: '100%', marginBottom: 0, opacity: isSelecting && !isSelected ? 0.7 : 1 }}
                        onDoubleClick={() => setReplyingTo(m)}
                      >
                        {m.replyTo && (
                          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', borderLeft: '3px solid rgba(0,0,0,0.2)' }}>
                            <strong>{m.replyTo.senderId === currentUser.id ? 'You' : partner?.name}</strong>: {m.replyTo.content || m.replyTo.fileName}
                          </div>
                        )}
                        {m.content ? (
                          m.content
                        ) : (
                          <a href={getImageUrl(m.fileUrl)} target="_blank" rel="noreferrer">{m.fileName || 'File'}</a>
                        )}
                        <div className="message-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString()}
                            {sent && m.isRead ? ' · Read' : ''}
                          </span>
                        </div>

                        {(isHovered || isMenuOpen) && !m.id.startsWith('temp-') && (
                          <div style={{ position: 'absolute', top: '8px', right: sent ? '100%' : '8px', paddingRight: sent ? '12px' : '0', zIndex: isMenuOpen ? 20 : 1 }}>
                            <button 
                              type="button" 
                              onClick={() => setOpenMenuId(isMenuOpen ? null : m.id)}
                              style={{ background: 'var(--glass-bg-subtle)', border: '1px solid var(--glass-border-subtle)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                            >
                              ⋮
                            </button>
                            {isMenuOpen && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                                <div style={{ position: 'absolute', top: '100%', right: sent ? '12px' : 0, marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--glass-border-subtle)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20, minWidth: '150px', overflow: 'hidden' }}>
                                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }} onClick={() => { setReplyingTo(m); setOpenMenuId(null); }}>Reply to Message</button>
                                  <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }} onClick={() => { toggleSelection(m.id); setOpenMenuId(null); }}>Select Message</button>
                                  {sent && (
                                    <button type="button" style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }} onClick={() => { handleDeleteMessage(m.id); setOpenMenuId(null); }}>Delete message</button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {selectedMessages.size > 0 ? (
                <div style={{ padding: '16px 24px', background: 'var(--glass-bg)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedMessages.size} selected</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setSelectedMessages(new Set())}>Cancel</button>
                    <button type="button" className="primary-cta" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleBulkDelete}>Delete Selected</button>
                  </div>
                </div>
              ) : (
                <form className="message-compose" onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', padding: '16px 24px' }}>
                  {replyingTo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg-subtle)', padding: '8px 12px', borderRadius: '8px 8px 0 0', border: '1px solid var(--glass-border-subtle)', borderBottom: 'none', fontSize: '13px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--brand-blue)' }}>Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : partner?.name}:</strong> {replyingTo.content || replyingTo.fileName}
                      </div>
                      <button type="button" onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>✕</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <input 
                      type="text" 
                      placeholder="Type a message…" 
                      required={!file} 
                      aria-label="Message" 
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      style={{ borderRadius: '24px', flex: 1, padding: '12px 16px', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}
                    />
                    <label className="btn-secondary" style={{ cursor: 'pointer', borderRadius: '50%', width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      📎
                      <input 
                        type="file" 
                        hidden 
                        accept="image/*,.pdf" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                    </label>
                    <button type="submit" className="primary-cta" style={{ borderRadius: '24px', padding: '0 24px', width: 'auto' }}>Send</button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>

      <dialog ref={modalRef} className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '400px', margin: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Start a new chat</h2>
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label htmlFor="user-select">Select User</label>
          <select 
            id="user-select" 
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" className="btn-secondary" onClick={closeNewChatModal}>Cancel</button>
          <button type="button" className="primary-cta" onClick={handleStartChat}>Start Chat</button>
        </div>
      </dialog>

      <dialog ref={confirmModalRef} className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--glass-border)', width: '100%', maxWidth: '400px', margin: 'auto' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>{confirmData.title}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{confirmData.message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn-secondary" onClick={closeConfirm}>Cancel</button>
          <button type="button" className="primary-cta" style={{ background: '#ef4444' }} onClick={handleConfirmAction}>Delete</button>
        </div>
      </dialog>

      {toastMsg && (
        <div className="toast toast--info toast--visible" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
