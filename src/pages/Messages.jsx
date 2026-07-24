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

  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [menuConfig, setMenuConfig] = useState({ id: null });

  // Global click listener to close menus
  useEffect(() => {
    if (!menuConfig.id && !isHeaderMenuOpen) return;
    const handleClick = () => {
      setMenuConfig({ id: null });
      setIsHeaderMenuOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuConfig.id, isHeaderMenuOpen]);

  // We need to keep a ref to the latest loadThread function to avoid stale closures in Pusher callbacks
  const loadThreadRef = useRef(() => {});

  const [messageInput, setMessageInput] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);

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

  const loadConversationsRef = useRef(() => {});

  const loadConversations = async () => {
    try {
      const res = await messages.conversations();
      setConversations(res.conversations);
      setConvError(false);
    } catch (e) {
      setConvError(true);
    } finally {
      setConvLoading(false);
    }
  };

  loadConversationsRef.current = loadConversations;

  const msgCacheRef = useRef({});

  const loadThread = async () => {
    if (!activeConversationId) return;
    
    // Stale-while-revalidate pattern for instant UI
    if (msgCacheRef.current[activeConversationId]) {
      setThreadMsgs(msgCacheRef.current[activeConversationId].messages);
      setPartner(msgCacheRef.current[activeConversationId].partner);
    } else {
      setThreadMsgs([]); // Clear to avoid showing wrong chat
      setThreadLoading(true);
    }

    // Optimistically clear unread count for the active conversation
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c));

    try {
      const res = await messages.list(activeConversationId);
      setThreadMsgs(res.messages);
      setPartner(res.partner);
      setThreadError(false);
      
      // Update cache
      msgCacheRef.current[activeConversationId] = res;

      // Refresh conversations to sync read status and unread count
      loadConversations();

      setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
      }, 50);
    } catch (e) {
      console.error('Error in loadThread:', e);
      setThreadError(e.message || 'Could not load messages');
    } finally {
      setThreadLoading(false);
    }
  };

  loadThreadRef.current = loadThread;

  useEffect(() => {
    if (activeConversationId) {
      loadThreadRef.current();
      setReplyingTo(null);
      setSelectedMessages(new Set());
    }
  }, [activeConversationId]);



  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    loadConversations();
    
    const unsubNew = subscribeToUserEvents(currentUser.id, 'new-message', (data) => {
      loadConversationsRef.current();
      if (data.conversationId === activeConversationIdRef.current) {
        loadThreadRef.current();
      } else {
        showToast('New message received!');
      }
    });

    const unsubDelMsg = subscribeToUserEvents(currentUser.id, 'message-deleted', (data) => {
      loadConversationsRef.current();
      if (data.conversationId === activeConversationIdRef.current) {
        loadThreadRef.current();
      }
    });

    const unsubBulkDelMsg = subscribeToUserEvents(currentUser.id, 'messages-deleted', (data) => {
      loadConversationsRef.current();
      if (data.conversationId === activeConversationIdRef.current) {
        loadThreadRef.current();
      }
    });

    const unsubDelConv = subscribeToUserEvents(currentUser.id, 'conversation-deleted', (data) => {
      loadConversationsRef.current();
      if (data.conversationId === activeConversationIdRef.current) {
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
      const res = await messages.send(activeConversationId, fd);
      setThreadMsgs(prev => {
        const next = prev.map(m => m.id === optimisticMsg.id ? res.message : m);
        if (msgCacheRef.current[activeConversationId]) {
          msgCacheRef.current[activeConversationId].messages = next;
        }
        return next;
      });
      loadConversations();
    } catch (err) {
      showToast(err.message);
      setThreadMsgs(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      showToast('File must be under 5MB');
      return;
    }
    setFile(f);
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

  const handleDeleteMessage = async (messageId, forEveryone = false) => {
    requestConfirm('Delete Message', `Are you sure you want to delete this message${forEveryone ? ' for everyone' : ' for yourself'}? This cannot be undone.`, async () => {
      // Optimistic loading state
      setThreadMsgs(prev => prev.map(m => m.id === messageId ? { ...m, isDeleting: true } : m));
      try {
        await messages.deleteMessage(activeConversationId, messageId, forEveryone);
        loadThread();
        loadConversations();
      } catch (err) {
        showToast(err.message);
        loadThread(); // Rollback
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
      // Optimistic loading state
      setThreadMsgs(prev => prev.map(m => selectedMessages.has(m.id) ? { ...m, isDeleting: true } : m));
      try {
        await messages.bulkDeleteMessages(Array.from(selectedMessages));
        setSelectedMessages(new Set());
        loadThread();
        loadConversations();
      } catch (err) {
        showToast(err.message);
        loadThread(); // Rollback
      }
    });
  };

  return (
    <div className="chat-view-container" style={{ 
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
        <aside className={`glass-card messages-sidebar ${activeConversationId ? 'hide-on-mobile' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }} aria-label="Conversations">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
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
                  key={c.id} 
                  type="button" 
                  className={`conversation-item ${c.id === activeConversationId ? 'active' : ''}`} 
                  onClick={() => setSearchParams({ conversation: c.id })}
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

        <section className={`message-thread glass-card messages-main ${!activeConversationId ? 'hide-on-mobile' : ''}`} aria-label="Message thread">
          {!activeConversationId ? (
            <p className="empty-state">Select a conversation</p>
          ) : threadLoading && threadMsgs.length === 0 ? (
            <p className="loading">Loading thread...</p>
          ) : threadError ? (
            <p className="empty-state">{typeof threadError === 'string' ? threadError : 'Could not load messages'}</p>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button type="button" className="mobile-back-btn" onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('conversation');
                    setSearchParams(newParams);
                  }} aria-label="Back to messages">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  </button>
                  
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setIsHeaderMenuOpen(!isHeaderMenuOpen); }} 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s', marginLeft: '-8px' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-raised)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Avatar user={partner} size={36} />
                      <strong style={{ fontSize: '1.05rem' }}>{partner?.name}</strong>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    {isHeaderMenuOpen && (
                      <>
                        <div style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: '0', 
                          marginTop: '8px',
                          background: 'var(--bg-page)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
                          zIndex: 1001, 
                          minWidth: '200px', 
                          overflow: 'hidden' 
                        }}>
                          <button type="button" onClick={() => { setIsHeaderMenuOpen(false); navigate(`/profile/${partner?.id}`); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            View Profile
                          </button>
                          <div style={{ height: '1px', background: 'var(--border-subtle)' }}></div>
                          <button type="button" onClick={() => { setIsHeaderMenuOpen(false); handleDeleteChat(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#ef4444' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Delete Chat
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="message-list" ref={messageListRef}>
                {threadMsgs.map((m, index) => {
                  const sent = m.senderId === currentUser.id;
                  const isHovered = hoveredMsgId === m.id;
                  const isSelected = selectedMessages.has(m.id);
                  const isSelecting = selectedMessages.size > 0;
                  const hasNextConsecutive = index < threadMsgs.length - 1 && threadMsgs[index + 1].senderId === m.senderId;

                  return (
                    <div 
                      key={m.id} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: sent ? 'flex-end' : 'flex-start', maxWidth: '80%', marginBottom: hasNextConsecutive ? '2px' : '16px' }}
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
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {(isHovered || menuConfig.id === m.id) && !isSelecting && !m.id.startsWith('temp-') && !m.isDeleting && (
                          <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: sent ? '100%' : 'auto', left: !sent ? '100%' : 'auto', paddingRight: sent ? '8px' : '0', paddingLeft: !sent ? '8px' : '0', zIndex: menuConfig.id === m.id ? 20 : 1 }}>
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (menuConfig.id === m.id) {
                                  setMenuConfig({ id: null });
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  setMenuConfig({
                                    id: m.id,
                                    isUp: spaceBelow < 280
                                  });
                                }
                              }}
                              style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                            >
                              ⋮
                            </button>
                            {menuConfig.id === m.id && (
                              <div style={{ 
                                position: 'absolute', 
                                [menuConfig.isUp ? 'bottom' : 'top']: '100%', 
                                [menuConfig.isUp ? 'marginBottom' : 'marginTop']: '4px',
                                [sent ? 'right' : 'left']: sent ? '12px' : 0, 
                                background: 'var(--bg-page)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '8px', 
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
                                zIndex: 1001, 
                                minWidth: '150px', 
                                overflow: 'hidden' 
                              }} onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => { setReplyingTo(m); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>Reply to Message</button>
                                <button type="button" onClick={() => { toggleSelection(m.id); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>Select Message</button>
                                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }}></div>
                                <button type="button" onClick={() => { handleDeleteMessage(m.id, false); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }}>Delete for me</button>
                                {sent && (
                                  <button type="button" onClick={() => { handleDeleteMessage(m.id, true); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }}>Delete for everyone</button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div 
                          className={`message-bubble message-bubble--${sent ? 'sent' : 'received'}`} 
                          style={{ position: 'relative', width: '100%', maxWidth: '100%', marginBottom: 0, opacity: m.isDeleting ? 0.5 : (isSelecting && !isSelected ? 0.7 : 1) }}
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
                              {m.isDeleting ? ' · Deleting...' : (sent && !m.id.startsWith('temp-') && m.isRead ? ' · Read' : '')}
                              {m.id.startsWith('temp-') && ' · Sending...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {selectedMessages.size > 0 ? (
                <div style={{ padding: '16px 24px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedMessages.size} selected</span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn-secondary" onClick={() => setSelectedMessages(new Set())}>Cancel</button>
                    <button type="button" className="primary-cta" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleBulkDelete}>Delete Selected</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
                  {replyingTo && (
                    <div style={{ background: 'var(--bg-surface-raised)', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--accent)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600', marginBottom: '4px' }}>Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : partner?.name}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{replyingTo.content || replyingTo.fileName || 'Attachment'}</span>
                      </div>
                      <button type="button" onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  )}
                  {file && (
                    <div style={{ background: 'var(--bg-surface-raised)', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--accent)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600', marginBottom: '4px' }}>Attachment</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{file.name}</span>
                      </div>
                      <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </button>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                    <button type="submit" className="primary-cta" style={{ borderRadius: '24px', padding: '10px 24px', fontSize: '14px', minHeight: 'auto', opacity: (!messageInput.trim() && !file) ? 0.5 : 1 }} disabled={!messageInput.trim() && !file}>
                      Send
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <dialog ref={modalRef} className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', width: '100%', maxWidth: '400px', margin: 'auto' }}>
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

      <dialog ref={confirmModalRef} className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', width: '100%', maxWidth: '400px', margin: 'auto' }}>
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
