import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { blogs, getImageUrl } from '../shared/api.js';
import { isLoggedIn, getUser, isAdmin } from '../shared/auth.js';

function CommentNode({ comment, onReply, onDelete, loggedIn, currentUser, adminUser, activeReplyId, setActiveReplyId }) {
  const [replyContent, setReplyContent] = useState('');
  const isReplying = activeReplyId === comment.id;

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent);
    setReplyContent('');
  };

  const isAuthor = currentUser && currentUser.id === comment.authorId;
  const canDelete = isAuthor || adminUser;

  const initials = comment.author?.name
    ? comment.author.name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?';

  return (
    <div className="comment-node" style={{ marginTop: '16px', paddingLeft: comment.parentId ? '24px' : '0px', borderLeft: comment.parentId ? '2px solid var(--border)' : 'none' }}>
      <div className="glass-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {comment.author?.avatarUrl ? (
              <img src={getImageUrl(comment.author.avatarUrl)} alt={comment.author?.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span className="avatar avatar--initials" style={{ width: '28px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {initials}
              </span>
            )}
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{comment.author?.name || 'Deleted User'}</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          {canDelete && (
            <button 
              onClick={() => onDelete(comment.id)} 
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
              title="Delete Comment"
            >
              Delete
            </button>
          )}
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: '0 0 12px 0', lineHeight: '1.5' }}>{comment.content}</p>
        
        {loggedIn ? (
          <button 
            onClick={() => setActiveReplyId(isReplying ? null : comment.id)} 
            className="btn nav-btn--ghost" 
            style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '20px', minHeight: 'auto', background: 'var(--bg-surface-raised)' }}
          >
            {isReplying ? 'Cancel' : 'Reply'}
          </button>
        ) : null}
        
        {isReplying && (
          <form onSubmit={handleReplySubmit} style={{ marginTop: '12px' }}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows="2"
              required
              className="form-group textarea"
              style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '8px', minHeight: '60px', resize: 'vertical', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="submit" className="btn" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }}>Submit</button>
              <button type="button" onClick={() => setActiveReplyId(null)} className="btn nav-btn--ghost" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {comment.replies && comment.replies.map(reply => (
        <CommentNode 
          key={reply.id} 
          comment={reply} 
          onReply={onReply} 
          onDelete={onDelete} 
          loggedIn={loggedIn} 
          currentUser={currentUser} 
          adminUser={adminUser}
          activeReplyId={activeReplyId}
          setActiveReplyId={setActiveReplyId}
        />
      ))}
    </div>
  );
}

export default function Blogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const postId = searchParams.get('id');

  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeReplyId, setActiveReplyId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Editor states (Admin only)
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [coverFile, setCoverFile] = useState(null);

  const loggedIn = isLoggedIn();
  const currentUser = loggedIn ? getUser() : null;
  const adminUser = isAdmin();

  useEffect(() => {
    fetchData();
  }, [postId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (postId) {
        const res = await blogs.get(postId);
        setCurrentPost(res.post);
        setComments(res.comments || []);
      } else {
        const res = await blogs.list();
        setPosts(res.posts || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('content', editContent);
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }
      await blogs.create(formData);
      setEditTitle('');
      setEditContent('');
      setCoverFile(null);
      setIsCreating(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('content', editContent);
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }
      const res = await blogs.update(currentPost.id, formData);
      setCurrentPost(res.post);
      setIsEditing(false);
      setCoverFile(null);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await blogs.delete(currentPost.id);
      setSearchParams({});
    } catch (err) {
      setError(err.message || 'Failed to delete post');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await blogs.addComment(postId, { content: newComment });
      setNewComment('');
      // Reload comments
      const updatedPostRes = await blogs.get(postId);
      setComments(updatedPostRes.comments || []);
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyToComment = async (parentId, replyText) => {
    try {
      await blogs.addComment(postId, { content: replyText, parentId });
      setActiveReplyId(null);
      // Reload comments
      const updatedPostRes = await blogs.get(postId);
      setComments(updatedPostRes.comments || []);
    } catch (err) {
      setError(err.message || 'Failed to post reply');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await blogs.deleteComment(postId, commentId);
      // Reload comments
      const updatedPostRes = await blogs.get(postId);
      setComments(updatedPostRes.comments || []);
    } catch (err) {
      setError(err.message || 'Failed to delete comment');
    }
  };

  const startEdit = () => {
    setEditTitle(currentPost.title);
    setEditContent(currentPost.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditTitle('');
    setEditContent('');
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '130px', minHeight: 'calc(100vh - 200px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p className="loading">Loading blogs...</p>
      </div>
    );
  }

  // --- DETAIL VIEW ---
  if (postId && currentPost) {
    return (
      <div className="animate-fade-up" style={{ paddingTop: '130px', minHeight: 'calc(100vh - 200px)', paddingBottom: '64px', maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => setSearchParams({})} className="btn nav-btn--ghost" style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          &larr; Back to Blogs
        </button>

        {error && <div className="form-error" style={{ marginBottom: '20px' }}>{error}</div>}

        {isEditing ? (
          <form onSubmit={handleUpdatePost} className="form-card glass-card">
            <h2 style={{ fontFamily: 'Fustat, sans-serif', marginBottom: '20px' }}>Edit Blog Post</h2>
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input 
                type="text" 
                id="title" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea 
                id="content" 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                required 
                rows="10"
              />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="coverImage">Cover Picture</label>
              <input 
                type="file" 
                id="coverImage" 
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files[0])}
                style={{ width: '100%', background: 'transparent', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="primary-cta" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <article className="glass-card" style={{ padding: '0px', marginBottom: '32px', overflow: 'hidden', borderRadius: '24px' }}>
              {currentPost.coverImageUrl && (
                <img 
                  src={getImageUrl(currentPost.coverImageUrl)} 
                  alt="" 
                  style={{ width: '100%', height: '350px', objectFit: 'cover' }} 
                />
              )}
              <div style={{ padding: '32px' }}>
                <h1 className="page-title" style={{ marginBottom: '16px' }}>
                  {currentPost.title}
                </h1>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {currentPost.author?.avatarUrl ? (
                    <img src={getImageUrl(currentPost.author.avatarUrl)} alt={currentPost.author.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span className="avatar avatar--initials" style={{ width: '40px', height: '40px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {currentPost.author?.name ? currentPost.author.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                    </span>
                  )}
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{currentPost.author?.name}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Published on {new Date(currentPost.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {adminUser && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={startEdit} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', minHeight: 'auto' }}>
                      Edit
                    </button>
                    <button onClick={handleDeletePost} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', minHeight: 'auto', color: '#ef4444', borderColor: '#ef4444' }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '16px', whiteSpace: 'pre-wrap' }}>
                {currentPost.content}
              </div>
              </div>
            </article>

            {/* Comment Section */}
            <section className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ fontFamily: 'Fustat, sans-serif', fontSize: '20px', marginBottom: '20px', color: 'var(--text-primary)' }}>
                Comments ({comments.length ? comments.length : '0'})
              </h3>

              {loggedIn ? (
                <form onSubmit={handleAddComment} style={{ marginBottom: '32px' }}>
                  <div className="form-group">
                    <label htmlFor="newComment">Join the conversation</label>
                    <textarea
                      id="newComment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      required
                      rows="3"
                    />
                  </div>
                  <button type="submit" className="primary-cta" disabled={submitting}>
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </form>
              ) : (
                <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', marginBottom: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
                    You must <Link to="/login" style={{ color: 'var(--accent)', fontWeight: '600' }}>log in</Link> to reply or comment on this article.
                  </p>
                </div>
              )}

              <div className="comments-list">
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <CommentNode
                      key={comment.id}
                      comment={comment}
                      onReply={handleReplyToComment}
                      onDelete={handleDeleteComment}
                      loggedIn={loggedIn}
                      currentUser={currentUser}
                      adminUser={adminUser}
                      activeReplyId={activeReplyId}
                      setActiveReplyId={setActiveReplyId}
                    />
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No comments yet. Be the first to comment!</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="animate-fade-up" style={{ paddingTop: '130px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Community Blogs</h1>
          <p className="page-subtitle">
            Read peer articles and sharing experiences on learning and teaching.
          </p>
        </div>
        {adminUser && !isCreating && (
          <button onClick={() => setIsCreating(true)} className="primary-cta">
            Create Blog Post
          </button>
        )}
      </div>

      {error && <div className="form-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {isCreating ? (
        <form onSubmit={handleCreatePost} className="form-card glass-card" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'Fustat, sans-serif', marginBottom: '20px' }}>Create New Blog Post</h2>
          <div className="form-group">
            <label htmlFor="createTitle">Title</label>
            <input 
              type="text" 
              id="createTitle" 
              value={editTitle} 
              onChange={(e) => setEditTitle(e.target.value)} 
              placeholder="Enter a catchy title..."
              required 
            />
          </div>
          <div className="form-group">
            <label htmlFor="createContent">Content</label>
            <textarea 
              id="createContent" 
              value={editContent} 
              onChange={(e) => setEditContent(e.target.value)} 
              placeholder="Write your article here..."
              required 
              rows="10"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="createCover">Cover Picture</label>
            <input 
              type="file" 
              id="createCover" 
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files[0])}
              style={{ width: '100%', background: 'transparent', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="primary-cta" disabled={submitting}>
              {submitting ? 'Publishing...' : 'Publish Post'}
            </button>
            <button type="button" onClick={cancelEdit} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {posts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {posts.map(post => {
            const dateStr = new Date(post.createdAt).toLocaleDateString();
            const snippet = post.content.length > 120 
              ? post.content.slice(0, 120) + '...' 
              : post.content;
            
            return (
              <div 
                key={post.id} 
                className="glass-card" 
                style={{ display: 'flex', flexDirection: 'column', gap: '0px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', overflow: 'hidden', borderRadius: '16px' }}
                onClick={() => setSearchParams({ id: post.id })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {post.coverImageUrl && (
                  <img 
                    src={getImageUrl(post.coverImageUrl)} 
                    alt="" 
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }} 
                  />
                )}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <div>
                    <h3 style={{ fontFamily: 'Fustat, sans-serif', fontSize: '18px', margin: '0 0 8px 0', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {post.title}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dateStr}</span>
                  </div>
                  
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', flexGrow: 1 }}>
                    {snippet}
                  </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {post.author?.avatarUrl ? (
                      <img src={getImageUrl(post.author.avatarUrl)} alt={post.author.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span className="avatar avatar--initials" style={{ width: '28px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {post.author?.name ? post.author.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                      </span>
                    )}
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{post.author?.name}</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '500' }}>
                    {post._count?.comments || 0} comment{post._count?.comments === 1 ? '' : 's'}
                  </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <h3>No articles published yet</h3>
          <p>Check back later or check with the administrator to write content!</p>
        </div>
      )}
    </div>
  );
}
