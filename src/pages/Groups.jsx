import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { groups, users, notifications, subscribeToGroupEvents, subscribeToUserEvents, getImageUrl } from '../shared/api.js';
import { isLoggedIn, getUser } from '../shared/auth.js';

export default function Groups() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [invitations, setInvitations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserToInvite, setSelectedUserToInvite] = useState('');
  const leaveGroupDialogRef = useRef(null);
  const addMemberDialogRef = useRef(null);
  const groupDetailsDialogRef = useRef(null);

  // Data states
  const [groupList, setGroupList] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('joined');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced messaging states
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [menuConfig, setMenuConfig] = useState({ id: null });

  // Modals / forms
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Loading / UI states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loggedIn = isLoggedIn();
  const currentUser = loggedIn ? getUser() : null;

  useEffect(() => {
    if (!loggedIn) {
      navigate('/login');
      return;
    }
    loadGroups();
    loadInvitations();
  }, [loggedIn, navigate]);

  const loadMessagesRef = useRef();

  const loadMessages = async (groupId) => {
    setLoadingChat(true);
    try {
      const res = await groups.messages(groupId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load messages');
    } finally {
      setLoadingChat(false);
    }
  };
  loadMessagesRef.current = loadMessages;

  // Subscribe to real-time messages when active group changes
  useEffect(() => {
    if (!selectedGroup || !selectedGroup.isMember) {
      setMessages([]);
      return;
    }

    loadMessages(selectedGroup.id);
    setReplyingTo(null);
    setSelectedMessages(new Set());

    // Pusher real-time bind
    const unsubscribe = subscribeToGroupEvents(selectedGroup.id, 'new-group-message', (data) => {
      if (data && data.message) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    const unsubGrpDel = subscribeToGroupEvents(selectedGroup.id, 'group-message-deleted', (data) => {
      loadMessagesRef.current(selectedGroup.id);
    });

    const unsubMyDel = subscribeToUserEvents(currentUser.id, 'group-message-deleted', (data) => {
      if (data.groupId === selectedGroup.id) loadMessagesRef.current(selectedGroup.id);
    });

    const unsubMyBulkDel = subscribeToUserEvents(currentUser.id, 'group-messages-deleted', (data) => {
      if (data.groupId === selectedGroup.id) loadMessagesRef.current(selectedGroup.id);
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubGrpDel) unsubGrpDel();
      if (unsubMyDel) unsubMyDel();
      if (unsubMyBulkDel) unsubMyBulkDel();
    };
  }, [selectedGroup, currentUser?.id]);

  // Scroll  // Clear notifications when group is selected
  useEffect(() => {
    if (selectedGroup) {
      notifications.markRead('group_message').catch(console.error);
    }
  }, [selectedGroup]);

  // Global click listener to close menus
  useEffect(() => {
    if (!menuConfig.id) return;
    const handleClick = () => setMenuConfig({ id: null });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [menuConfig.id]);


  const loadInvitations = async () => {
    try {
      const res = await groups.getInvitations();
      setInvitations(res.invitations || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGroups = async () => {
    setLoadingList(true);
    try {
      const res = await groups.list();
      setGroupList(res.groups || []);
      // If a group was already selected, update its membership status in the current selection
      if (selectedGroup) {
        const updated = res.groups.find(g => g.id === selectedGroup.id);
        if (updated) setSelectedGroup(updated);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load groups');
    } finally {
      setLoadingList(false);
    }
  };



  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDesc.trim()) return;
    setSubmitting(true);
    try {
      const res = await groups.create({ name: newGroupName, description: newGroupDesc });
      setNewGroupName('');
      setNewGroupDesc('');
      setIsCreating(false);
      
      // Reload and auto-select the newly created group (which the backend auto-joins the creator to)
      const listRes = await groups.list();
      setGroupList(listRes.groups || []);
      const created = listRes.groups.find(g => g.name === newGroupName);
      if (created) setSelectedGroup(created);
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (group) => {
    setError(null);
    try {
      await groups.join(group.id);
      await loadGroups();
    loadInvitations();
      // Update local selection to trigger loading chat
      setSelectedGroup({ ...group, isMember: true, memberCount: group.memberCount + 1 });
    } catch (err) {
      setError(err.message || 'Failed to join group');
    }
  };


  const openAddMemberModal = async () => {
    try {
      const data = await users.list();
      setAllUsers(data.users || []);
      if (data.users && data.users.length > 0) setSelectedUserToInvite(data.users[0].id);
      if (addMemberDialogRef.current) addMemberDialogRef.current.showModal();
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const handleInviteUser = async () => {
    if (!selectedGroup || !selectedUserToInvite) return;
    try {
      await groups.invite(selectedGroup.id, selectedUserToInvite);
      if (addMemberDialogRef.current) addMemberDialogRef.current.close();
      alert('Invitation sent successfully!');
    } catch (e) {
      setError(e.message || 'Failed to send invitation');
      if (addMemberDialogRef.current) addMemberDialogRef.current.close();
    }
  };

  const confirmLeaveGroup = async () => {
    setError(null);
    try {
      await groups.leave(selectedGroup.id);
      await loadGroups();
      setSelectedGroup({ ...selectedGroup, isMember: false, memberCount: Math.max(0, selectedGroup.memberCount - 1) });
      setMessages([]);
      if (leaveGroupDialogRef.current) leaveGroupDialogRef.current.close();
    } catch (err) {
      setError(err.message || 'Failed to leave group');
      if (leaveGroupDialogRef.current) leaveGroupDialogRef.current.close();
    }
  };

  const handleAcceptInvite = async (invitationId) => {
    try {
      await groups.acceptInvitation(invitationId);
      await loadInvitations();
      await loadGroups();
    } catch (e) {
      setError(e.message || 'Failed to accept invitation');
    }
  };

  const handleDeclineInvite = async (invitationId) => {
    try {
      await groups.declineInvitation(invitationId);
      await loadInvitations();
    } catch (e) {
      setError(e.message || 'Failed to decline invitation');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;
    if (!selectedGroup) return;

    const content = newMessage.trim();
    const currentFile = file;
    const currentReplyTo = replyingTo;

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      senderId: currentUser.id,
      content,
      fileUrl: currentFile ? URL.createObjectURL(currentFile) : null,
      fileName: currentFile ? currentFile.name : null,
      createdAt: new Date().toISOString(),
      replyTo: currentReplyTo,
      sender: { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl }
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');
    setFile(null);
    setReplyingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    const fd = new FormData();
    if (content) fd.append('content', content);
    if (currentFile) fd.append('file', currentFile);
    if (currentReplyTo) fd.append('replyToId', currentReplyTo.id);

    try {
      const res = await groups.sendMessage(selectedGroup.id, fd);
      setMessages(prev => {
        if (prev.some(m => m.id === res.message.id)) {
          return prev.filter(m => m.id !== optimisticMsg.id);
        }
        return prev.map(m => m.id === optimisticMsg.id ? res.message : m);
      });
    } catch (err) {
      setError('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB');
      return;
    }
    
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      senderId: currentUser.id,
      content: null,
      fileUrl: URL.createObjectURL(f),
      fileName: f.name,
      createdAt: new Date().toISOString(),
      replyTo: null,
      sender: { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl }
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    const fd = new FormData();
    fd.append('file', f);
    try {
      await groups.sendMessage(selectedGroup.id, fd);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadMessagesRef.current(selectedGroup.id);
    } catch (err) {
      setError(err.message || 'Failed to send file');
      loadMessagesRef.current(selectedGroup.id);
    }
  };

  const handleDeleteMessage = async (messageId, forEveryone = false) => {
    if (!window.confirm(`Are you sure you want to delete this message${forEveryone ? ' for everyone' : ' for yourself'}?`)) return;
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleting: true } : m));
    try {
      await groups.deleteMessage(selectedGroup.id, messageId, forEveryone);
      loadMessagesRef.current(selectedGroup.id);
    } catch (err) {
      setError(err.message || 'Failed to delete message');
      loadMessagesRef.current(selectedGroup.id);
    }
  };

  const toggleSelection = (id) => {
    const next = new Set(selectedMessages);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMessages(next);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedMessages.size} selected message(s) for yourself?`)) return;
    setMessages(prev => prev.map(m => selectedMessages.has(m.id) ? { ...m, isDeleting: true } : m));
    try {
      await groups.bulkDeleteMessages(selectedGroup.id, Array.from(selectedMessages));
      setSelectedMessages(new Set());
      loadMessagesRef.current(selectedGroup.id);
    } catch (err) {
      setError(err.message || 'Failed to bulk delete');
      loadMessagesRef.current(selectedGroup.id);
    }
  };

  const filteredGroups = groupList.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const joinedGroups = filteredGroups.filter(g => g.isMember);
  const discoverGroups = filteredGroups.filter(g => !g.isMember);

  return (
    <>
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
        {error && <div className="form-error" style={{ marginBottom: '16px', flexShrink: 0 }}>{error}</div>}
        
        <div className="messages-layout animate-fade-up delay-1" style={{ flex: 1, minHeight: 0 }}>
          {/* SIDEBAR */}
          <aside className={`glass-card messages-sidebar ${selectedGroup ? 'hide-on-mobile' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }} aria-label="Groups">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <strong style={{ fontSize: '1.05rem' }}>Community Groups</strong>
              <button type="button" className="primary-cta" onClick={() => setIsCreating(true)} style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}>+ Create Group</button>
            </div>
            
            <div style={{ padding: '12px' }}>
              <input
                type="search"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div className="tabs" style={{ margin: '0 12px 20px 12px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
              <button 
                className={`tab ${sidebarTab === 'joined' ? 'active' : ''}`} 
                onClick={() => setSidebarTab('joined')}
                style={{ flex: 1, textAlign: 'center', paddingBottom: '16px', borderBottom: 'none', background: 'transparent' }}
              >
                My Groups
              </button>
              <button 
                className={`tab ${sidebarTab === 'discover' ? 'active' : ''}`} 
                onClick={() => setSidebarTab('discover')}
                style={{ flex: 1, textAlign: 'center', paddingBottom: '16px', borderBottom: 'none', background: 'transparent' }}
              >
                Discover
              </button>
              <div style={{ position: 'absolute', bottom: -1, left: sidebarTab === 'joined' ? 0 : '50%', width: '50%', height: '2px', background: 'var(--accent)', transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
            </div>

            {invitations.length > 0 && sidebarTab === 'joined' && (
              <div style={{ padding: '0 12px 12px 12px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '0 8px', display: 'block', marginBottom: '8px' }}>Invitations</strong>
                {invitations.map(inv => (
                  <div key={inv.id} className="conversation-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', cursor: 'default' }}>
                    <div style={{ fontSize: '13px' }}><strong>{inv.inviter?.name}</strong> invited you to <strong>{inv.group?.name}</strong></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="primary-cta" style={{ flex: 1, padding: '4px', fontSize: '12px' }} onClick={(e) => { e.stopPropagation(); handleAcceptInvite(inv.id); }}>Accept</button>
                      <button className="btn-secondary" style={{ flex: 1, padding: '4px', fontSize: '12px', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); handleDeclineInvite(inv.id); }}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="conversation-list" style={{ padding: '0 12px 12px 12px' }}>
              {loadingList ? (
                <p className="loading" style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>Loading channels...</p>
              ) : (
                <div key={sidebarTab} className="animate-fade-up">
                  {sidebarTab === 'joined' ? (
                    joinedGroups.length > 0 ? (
                      joinedGroups.map((group) => {
                        const isCurrent = selectedGroup && selectedGroup.id === group.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            className={`conversation-item ${isCurrent ? 'active' : ''}`}
                            onClick={() => setSelectedGroup(group)}
                          >
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{group.name}</strong>
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                                {group.description}
                              </p>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0', fontSize: '14px' }}>You haven't joined any groups yet.</p>
                    )
                  ) : (
                    discoverGroups.length > 0 ? (
                      discoverGroups.map((group) => {
                        const isCurrent = selectedGroup && selectedGroup.id === group.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            className={`conversation-item ${isCurrent ? 'active' : ''}`}
                            onClick={() => setSelectedGroup(group)}
                          >
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{group.name}</strong>
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                                {group.description}
                              </p>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0', fontSize: '14px' }}>No new groups to discover right now.</p>
                    )
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* MAIN PANEL */}
          <section className={`message-thread glass-card messages-main ${!selectedGroup ? 'hide-on-mobile' : ''}`} aria-label="Group Chat">
            {selectedGroup ? (
              <>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  {selectedMessages.size > 0 ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => setSelectedMessages(new Set())}>Cancel</button>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{selectedMessages.size} selected</strong>
                      </div>
                      <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: '13px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'transparent' }} onClick={handleBulkDelete}>Delete Selected</button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button type="button" className="mobile-back-btn" onClick={() => setSelectedGroup(null)} aria-label="Back to groups">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <div 
                          onClick={() => groupDetailsDialogRef.current?.showModal()} 
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s', margin: '-4px -8px' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-raised)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <strong style={{ fontSize: '1.15rem', display: 'block', color: 'var(--text-primary)' }}>{selectedGroup.name}</strong>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="message-list" style={{ flexGrow: 1, overflowY: 'auto' }}>

                  {selectedGroup.isMember ? (
                    <>
                      {loadingChat ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Loading conversation history...</p>
                      ) : messages.length > 0 ? (
                        messages.map((msg, index) => {
                          const isMe = currentUser && msg.senderId === currentUser.id;
                          const prevMsg = index > 0 ? messages[index - 1] : null;
                          const isConsecutive = prevMsg && prevMsg.senderId === msg.senderId;
                          const hasNextConsecutive = index < messages.length - 1 && messages[index + 1].senderId === msg.senderId;
                          const senderInitials = msg.sender?.name ? msg.sender.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
                          
                          const isHovered = hoveredMsgId === msg.id;
                          const isSelected = selectedMessages.has(msg.id);
                          const isSelecting = selectedMessages.size > 0;

                          return (
                            <div 
                              key={msg.id} 
                              style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: hasNextConsecutive ? '2px' : '16px' }}
                              onMouseEnter={() => setHoveredMsgId(msg.id)}
                              onMouseLeave={() => setHoveredMsgId(null)}
                            >
                              {isSelecting && (
                                <div style={{ alignSelf: 'center', margin: '0 8px' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => toggleSelection(msg.id)}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                  />
                                </div>
                              )}
                              {!isMe && (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0, overflow: 'hidden', opacity: isConsecutive ? 0 : 1 }}>
                                  {!isConsecutive && (
                                    msg.sender?.avatarUrl ? <img src={getImageUrl(msg.sender.avatarUrl)} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : senderInitials
                                  )}
                                </div>
                              )}
                              <div 
                                style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', position: 'relative', opacity: msg.isDeleting ? 0.5 : (isSelecting && !isSelected ? 0.7 : 1) }}
                                onDoubleClick={() => setReplyingTo(msg)}
                              >
                                {!isMe && !isConsecutive && (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', marginLeft: '4px', fontWeight: '500' }}>
                                    {msg.sender?.name || 'Unknown User'}
                                  </span>
                                )}
                                
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                  {(isHovered || menuConfig.id === msg.id) && !isSelecting && !msg.id.startsWith('temp-') && !msg.isDeleting && (
                                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: isMe ? '100%' : 'auto', left: !isMe ? '100%' : 'auto', paddingRight: isMe ? '8px' : '0', paddingLeft: !isMe ? '8px' : '0', zIndex: menuConfig.id === msg.id ? 20 : 1 }}>
                                      <button 
                                        type="button" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (menuConfig.id === msg.id) setMenuConfig({ id: null });
                                          else {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const spaceBelow = window.innerHeight - rect.bottom;
                                            setMenuConfig({ id: msg.id, isUp: spaceBelow < 280 });
                                          }
                                        }}
                                        style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
                                      >
                                        ⋮
                                      </button>
                                      {menuConfig.id === msg.id && (
                                        <div style={{ 
                                          position: 'absolute', 
                                          [menuConfig.isUp ? 'bottom' : 'top']: '100%', 
                                          [menuConfig.isUp ? 'marginBottom' : 'marginTop']: '4px',
                                          [isMe ? 'right' : 'left']: isMe ? '12px' : '0', 
                                          background: 'var(--bg-page)', 
                                          border: '1px solid var(--border)', 
                                          borderRadius: '8px', 
                                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
                                          zIndex: 1001, 
                                          minWidth: '150px', 
                                          overflow: 'hidden' 
                                        }} onClick={(e) => e.stopPropagation()}>
                                          <button type="button" onClick={() => { setReplyingTo(msg); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>Reply to Message</button>
                                          <button type="button" onClick={() => { toggleSelection(msg.id); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>Select Message</button>
                                          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }}></div>
                                          <button type="button" onClick={() => { handleDeleteMessage(msg.id, false); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }}>Delete for me</button>
                                          {(isMe || (selectedGroup && selectedGroup.creatorId === currentUser.id)) && (
                                            <button type="button" onClick={() => { handleDeleteMessage(msg.id, true); setMenuConfig({ id: null }); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }}>Delete for everyone</button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <div style={{ background: isMe ? 'var(--accent)' : 'var(--bg-card)', color: isMe ? 'white' : 'var(--text-primary)', padding: '10px 14px', borderRadius: '16px', borderBottomRightRadius: isMe && hasNextConsecutive ? '4px' : '16px', borderBottomLeftRadius: !isMe && hasNextConsecutive ? '4px' : '16px', border: isMe ? 'none' : '1px solid var(--border-subtle)', fontSize: '14px', lineHeight: '1.4', wordBreak: 'break-word', display: 'flex', flexDirection: 'column' }}>
                                    {msg.replyTo && (
                                      <div style={{ background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '13px', borderLeft: '3px solid rgba(0,0,0,0.2)' }}>
                                        <strong>{msg.replyTo.senderId === currentUser.id ? 'You' : (msg.replyTo.sender?.name || 'User')}</strong>: {msg.replyTo.content || msg.replyTo.fileName}
                                      </div>
                                    )}
                                    {msg.content ? (
                                      <span>{msg.content}</span>
                                    ) : (
                                      <a href={getImageUrl(msg.fileUrl)} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{msg.fileName || 'File'}</a>
                                    )}
                                  </div>
                                </div>
                                {!hasNextConsecutive && (
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {msg.isDeleting ? ' · Deleting...' : ''}
                                    {msg.id.startsWith('temp-') && ' · Sending...'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>No messages yet. Say hello!</p>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  ) : (

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center', height: '100%' }}>
                      <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h4 style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Join this Conversation</h4>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6' }}>
                          You are viewing the details of <strong>{selectedGroup.name}</strong>, but you are not currently a member of this channel. Click the button below to join the chat and connect!
                        </p>
                        <button onClick={() => handleJoinGroup(selectedGroup)} className="primary-cta" style={{ alignSelf: 'center', padding: '12px 32px' }}>
                          Join Group
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedGroup.isMember && (
                  <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
                    {replyingTo && (
                      <div style={{ background: 'var(--bg-surface-raised)', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--accent)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600', marginBottom: '4px' }}>Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : (replyingTo.sender?.name || 'User')}</span>
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
                      <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => setFile(e.target.files[0])} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      </button>
                      <input
                        type="text"
                        placeholder="Type a message to the group..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }}
                      />
                      <button type="submit" className="primary-cta" style={{ borderRadius: '24px', padding: '10px 24px', fontSize: '14px', minHeight: 'auto', opacity: (!newMessage.trim() && !file) ? 0.5 : 1 }} disabled={!newMessage.trim() && !file}>
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <h3>No group selected</h3>
                <p>Choose a community channel from the sidebar or create your own to begin.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* CREATE GROUP MODAL DIALOG */}
      {isCreating && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {/* backdrop */}
          <div onClick={() => setIsCreating(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          
          <form onSubmit={handleCreateGroup} className="form-card glass-card animate-dropdown-enter" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '480px', padding: '32px' }}>
            <h2 style={{ fontFamily: 'Fustat, sans-serif', marginBottom: '20px' }}>Create Community Group</h2>
            
            <div className="form-group">
              <label htmlFor="groupName">Group Name</label>
              <input
                type="text"
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Graphic Designers Meetup"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="groupDesc">Description</label>
              <textarea
                id="groupDesc"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Describe what this community is about..."
                required
                rows="3"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="primary-cta" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create & Join'}
              </button>
              <button type="button" onClick={() => setIsCreating(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modals */}
      <dialog ref={groupDetailsDialogRef} className="glass-card animate-dropdown-enter" style={{ border: 'none', padding: '32px', maxWidth: '400px', width: '100%', margin: 'auto', borderRadius: '16px' }}>
        {selectedGroup && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.5rem', fontFamily: 'Fustat, sans-serif' }}>{selectedGroup.name}</h3>
              <button type="button" onClick={() => groupDetailsDialogRef.current?.close()} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 12px 0' }}>{selectedGroup.description}</p>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedGroup.memberCount} member{selectedGroup.memberCount === 1 ? '' : 's'}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              {selectedGroup.isMember ? (
                <>
                  <button onClick={() => { groupDetailsDialogRef.current?.close(); openAddMemberModal(); }} className="btn-secondary" style={{ width: '100%' }}>
                    Add Member
                  </button>
                  <button onClick={() => { groupDetailsDialogRef.current?.close(); leaveGroupDialogRef.current?.showModal(); }} className="btn-secondary" style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                    Leave Group
                  </button>
                </>
              ) : (
                <button onClick={() => { groupDetailsDialogRef.current?.close(); handleJoinGroup(selectedGroup); }} className="primary-cta" style={{ width: '100%' }}>
                  Join Group
                </button>
              )}
            </div>
          </>
        )}
      </dialog>

      <dialog ref={leaveGroupDialogRef} className="glass-card animate-dropdown-enter" style={{ border: 'none', padding: '32px', maxWidth: '400px', width: '100%', margin: 'auto', borderRadius: '16px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>Leave Group</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you sure you want to leave {selectedGroup?.name}?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn-secondary" onClick={() => leaveGroupDialogRef.current?.close()}>Cancel</button>
          <button type="button" className="primary-cta" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={confirmLeaveGroup}>Leave Group</button>
        </div>
      </dialog>

      <dialog ref={addMemberDialogRef} className="glass-card" style={{ padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', width: '100%', maxWidth: '400px', margin: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Add Member</h2>
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label htmlFor="user-select">Select User</label>
          <select 
            id="user-select" 
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            value={selectedUserToInvite}
            onChange={(e) => setSelectedUserToInvite(e.target.value)}
          >
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button type="button" className="btn-secondary" onClick={() => addMemberDialogRef.current?.close()}>Cancel</button>
          <button type="button" className="primary-cta" onClick={handleInviteUser}>Send Invite</button>
        </div>
      </dialog>
    </>
  );
}
