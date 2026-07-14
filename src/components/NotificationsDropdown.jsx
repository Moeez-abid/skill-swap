import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications, getPusher, getImageUrl } from '../shared/api';
import { getUser } from '../shared/auth';

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return;
    
    notifications.list()
      .then(res => {
        setNotifs(res.notifications);
        setUnreadCount(res.notifications.filter(n => !n.isRead).length);
      })
      .catch(err => console.error('Failed to load notifications', err));
  }, [user?.id]);

  // Subscribe to Pusher
  useEffect(() => {
    if (!user) return;

    const pusher = getPusher();
    if (!pusher) return;

    const channelName = `user-${user.id}`;
    const channel = pusher.subscribe(channelName);

    const handleNewNotification = (data) => {
      // Data might contain the notification directly, or it might be a message event
      let notification = null;

      if (data.notification) {
        notification = data.notification;
      } else if (data.message) {
        // Special case for real-time messages if we don't save them in DB
        notification = {
          id: `msg-${Date.now()}`,
          type: 'MESSAGE',
          title: 'New Message',
          content: data.message.content || 'You received a new message.',
          linkUrl: '/messages',
          isRead: false,
          createdAt: new Date().toISOString(),
          isEphemeral: true // won't persist
        };
      }

      if (notification) {
        setNotifs(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show Toast
        setToast(notification);
        setTimeout(() => setToast(null), 4000);
      }
    };

    channel.bind('match-request', handleNewNotification);
    channel.bind('match-accepted', handleNewNotification);
    channel.bind('session-proposed', handleNewNotification);
    channel.bind('session-updated', handleNewNotification);
    channel.bind('new-message', handleNewNotification);

    return () => {
      channel.unbind('match-request', handleNewNotification);
      channel.unbind('match-accepted', handleNewNotification);
      channel.unbind('session-proposed', handleNewNotification);
      channel.unbind('session-updated', handleNewNotification);
      channel.unbind('new-message', handleNewNotification);
    };
  }, [user?.id]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    
    if (!notif.isRead && !notif.isEphemeral) {
      try {
        await notifications.markRead(notif.id);
        setNotifs(prev => prev.filter(n => n.id !== notif.id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }

    if (notif.linkUrl) {
      navigate(notif.linkUrl);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await notifications.markAllRead();
      setNotifs([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  if (!user) return null;

  return (
    <div className="notifications-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="notifications-trigger" 
        onClick={toggleDropdown}
        style={{ position: 'relative' }}
        aria-label="Notifications"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: 'var(--accent)',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown glass-card animate-dropdown-enter" style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000,
          marginTop: '8px',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px', 
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(to right, rgba(233, 46, 32, 0.08), transparent)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontFamily: 'Fustat,sans-serif', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Notifications
              {notifs.length > 0 && (
                <span style={{ fontSize: '12px', background: 'var(--bg-surface-raised)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                  {notifs.length}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px' }}
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="notifications-list" style={{ padding: '8px 0' }}>
            {notifs.length === 0 ? (
              <p style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                No notifications
              </p>
            ) : (
              notifs.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  style={{ 
                    padding: '12px 16px', 
                    cursor: 'pointer',
                    background: n.isRead ? 'transparent' : 'rgba(255, 62, 0, 0.05)',
                    borderLeft: n.isRead ? '3px solid transparent' : '3px solid var(--accent)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-raised)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(255, 62, 0, 0.05)'}
                >
                  <div style={{ fontSize: '14px', fontWeight: n.isRead ? 'normal' : '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', lineHeight: '1.4' }}>
                    {n.content}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toast Notification Overlay */}
      {toast && (
        <div 
          className="notification-toast glass-card animate-dropdown-enter" 
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            width: '340px',
            zIndex: 9999,
            cursor: 'pointer',
            display: 'flex',
            gap: '12px',
            padding: '16px',
            alignItems: 'flex-start',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            borderLeft: '4px solid var(--accent)',
            background: 'var(--bg-surface)'
          }}
          onClick={() => {
            handleNotificationClick(toast);
            setToast(null);
          }}
        >
          <div style={{ background: 'rgba(233, 46, 32, 0.1)', padding: '10px', borderRadius: '50%', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '15px', color: 'var(--text-primary)' }}>{toast.title}</strong>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{toast.content}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setToast(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0', alignSelf: 'flex-start' }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
