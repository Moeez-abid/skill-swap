import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { groups, subscribeToGroupEvents, getImageUrl } from '../shared/api.js';
import { isLoggedIn, getUser } from '../shared/auth.js';

export default function Groups() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Data states
  const [groupList, setGroupList] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
  }, [loggedIn, navigate]);

  // Subscribe to real-time messages when active group changes
  useEffect(() => {
    if (!selectedGroup || !selectedGroup.isMember) {
      setMessages([]);
      return;
    }

    loadMessages(selectedGroup.id);

    // Pusher real-time bind
    const unsubscribe = subscribeToGroupEvents(selectedGroup.id, 'new-group-message', (data) => {
      if (data && data.message) {
        setMessages((prev) => {
          // Prevent duplicates in case HTTP response comes after pusher or vice versa
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedGroup]);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
      // Update local selection to trigger loading chat
      setSelectedGroup({ ...group, isMember: true, memberCount: group.memberCount + 1 });
    } catch (err) {
      setError(err.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async (group) => {
    if (!window.confirm(`Are you sure you want to leave ${group.name}?`)) return;
    setError(null);
    try {
      await groups.leave(group.id);
      await loadGroups();
      setSelectedGroup({ ...group, isMember: false, memberCount: Math.max(0, group.memberCount - 1) });
      setMessages([]);
    } catch (err) {
      setError(err.message || 'Failed to leave group');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;
    const content = newMessage;
    setNewMessage('');
    try {
      const res = await groups.sendMessage(selectedGroup.id, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const filteredGroups = groupList.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <strong style={{ fontSize: '1.05rem' }}>Community Groups</strong>
              <button type="button" className="primary-cta" onClick={() => setIsCreating(true)} style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}>+ Create Group</button>
            </div>
            
            <div style={{ padding: '12px' }}>
              <input
                type="search"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div className="conversation-list" style={{ padding: '0 12px 12px 12px' }}>
              {loadingList ? (
                <p className="loading" style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>Loading channels...</p>
              ) : filteredGroups.length > 0 ? (
                filteredGroups.map((group) => {
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
                          {group.isMember && (
                            <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                              Joined
                            </span>
                          )}
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
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0', fontSize: '14px' }}>No groups found</p>
              )}
            </div>
          </aside>

          {/* MAIN PANEL */}
          <section className={`message-thread glass-card messages-main ${!selectedGroup ? 'hide-on-mobile' : ''}`} aria-label="Group Chat">
            {selectedGroup ? (
              <>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'var(--glass-bg)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" className="mobile-back-btn" onClick={() => setSelectedGroup(null)} aria-label="Back to groups">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <div>
                      <strong style={{ fontSize: '1.05rem', display: 'block' }}>{selectedGroup.name}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedGroup.description}</span>
                    </div>
                  </div>
                  {selectedGroup.isMember ? (
                    <button onClick={() => handleLeaveGroup(selectedGroup)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'transparent' }}>
                      Leave Group
                    </button>
                  ) : (
                    <button onClick={() => handleJoinGroup(selectedGroup)} className="primary-cta" style={{ padding: '6px 16px', fontSize: '12px' }}>
                      Join Group
                    </button>
                  )}
                </div>

                <div className="message-list" style={{ flexGrow: 1, overflowY: 'auto' }}>
                  {selectedGroup.isMember ? (
                    <>
                      {loadingChat ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>Loading conversation history...</p>
                      ) : messages.length > 0 ? (
                        messages.map((msg) => {
                          const isMe = currentUser && msg.senderId === currentUser.id;
                          const senderInitials = msg.sender?.name ? msg.sender.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';
                          
                          return (
                            <div key={msg.id} style={{ display: 'flex', gap: '10px', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                              {!isMe && (
                                msg.sender?.avatarUrl ? (
                                  <img src={getImageUrl(msg.sender.avatarUrl)} alt={msg.sender.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', marginTop: '4px' }} />
                                ) : (
                                  <span className="avatar avatar--initials" style={{ width: '32px', height: '32px', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {senderInitials}
                                  </span>
                                )
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                {!isMe && (
                                  <span style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginLeft: '4px', marginBottom: '4px' }}>
                                    {msg.sender?.name || 'Deleted User'}
                                  </span>
                                )}
                                <div className={`message-bubble message-bubble--${isMe ? 'sent' : 'received'}`} style={{ marginBottom: 0 }}>
                                  {msg.content}
                                </div>
                                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>No messages yet. Send a message to start the conversation!</p>
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
                  <form onSubmit={handleSendMessage} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--glass-border-subtle)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Type a message to the group..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      required
                      style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-primary)', outline: 'none' }}
                    />
                    <button type="submit" className="primary-cta" style={{ borderRadius: '24px', padding: '10px 24px', fontSize: '14px', minHeight: 'auto' }}>
                      Send
                    </button>
                  </form>
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
    </>
  );
}
