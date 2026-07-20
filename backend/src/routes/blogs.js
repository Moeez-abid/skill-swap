import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';
import multer from 'multer';
import { uploadFile } from '../lib/cloudinary.js';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir) },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = Router();

// Helper to build recursive comments tree
function buildCommentTree(comments) {
  const map = {};
  const roots = [];
  
  comments.forEach(comment => {
    map[comment.id] = { ...comment, replies: [] };
  });
  
  comments.forEach(comment => {
    if (comment.parentId) {
      if (map[comment.parentId]) {
        map[comment.parentId].replies.push(map[comment.id]);
      }
    } else {
      roots.push(map[comment.id]);
    }
  });
  
  return roots;
}

// GET /api/blogs - Fetch list of all blog posts
router.get('/', async (req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return apiSuccess(res, { posts });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// GET /api/blogs/:id - Fetch single blog post and its nested comments tree
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });
    
    if (!post) {
      return apiError(res, 404, 'Blog post not found');
    }

    const comments = await prisma.blogComment.findMany({
      where: { postId: id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const commentTree = buildCommentTree(comments);

    return apiSuccess(res, { post, comments: commentTree });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/blogs - Create a new blog post (Admin or Manager)
router.post('/', authenticate, requireRole(['SUPER_ADMIN', 'MANAGER']), upload.single('coverImage'), async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return apiError(res, 400, 'Title and content are required');
    }

    let coverImageUrl = null;
    if (req.file) {
      coverImageUrl = await uploadFile(req.file.path, 'blog_covers');
      fs.unlinkSync(req.file.path);
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        content,
        coverImageUrl,
        authorId: req.user.id
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    return apiSuccess(res, { post }, 201);
  } catch (error) {
    console.error('Error creating blog post:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// PUT /api/blogs/:id - Update an existing blog post (Admin or Manager)
router.put('/:id', authenticate, requireRole(['SUPER_ADMIN', 'MANAGER']), upload.single('coverImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content) {
      return apiError(res, 400, 'Title and content are required');
    }

    const updateData = { title, content };

    if (req.file) {
      updateData.coverImageUrl = await uploadFile(req.file.path, 'blog_covers');
      fs.unlinkSync(req.file.path);
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    return apiSuccess(res, { post });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// DELETE /api/blogs/:id - Delete a blog post (Admin or Manager)
router.delete('/:id', authenticate, requireRole(['SUPER_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.blogPost.delete({
      where: { id }
    });
    return apiSuccess(res, { message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/blogs/:id/comments - Add a comment or reply to a post
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { content, parentId } = req.body;
    
    if (!content) {
      return apiError(res, 400, 'Comment content is required');
    }

    const postExists = await prisma.blogPost.findUnique({
      where: { id: postId }
    });
    if (!postExists) {
      return apiError(res, 404, 'Blog post not found');
    }

    if (parentId) {
      const parentExists = await prisma.blogComment.findUnique({
        where: { id: parentId }
      });
      if (!parentExists) {
        return apiError(res, 404, 'Parent comment not found');
      }
    }

    const comment = await prisma.blogComment.create({
      data: {
        content,
        postId,
        authorId: req.user.id,
        parentId: parentId || null
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    return apiSuccess(res, { comment }, 201);
  } catch (error) {
    console.error('Error adding comment:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// DELETE /api/blogs/:id/comments/:commentId - Delete a comment (Author or Admin)
router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return apiError(res, 404, 'Comment not found');
    }

    if (req.user.role !== 'ADMIN' && comment.authorId !== req.user.id) {
      return apiError(res, 403, 'Unauthorized to delete this comment');
    }

    await prisma.blogComment.delete({
      where: { id: commentId }
    });

    return apiSuccess(res, { message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

export default router;
