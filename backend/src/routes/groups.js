import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';
import { triggerEvent } from '../lib/pusher.js';

const router = Router();

// Apply auth middleware to all group routes
router.use(authenticate);

// GET /api/groups - Get all groups with membership flags and member count
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await prisma.group.findMany({
      include: {
        members: {
          select: { userId: true }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedGroups = groups.map(group => {
      const isMember = group.members.some(m => m.userId === userId);
      const { members, ...groupData } = group;
      return {
        ...groupData,
        isMember,
        memberCount: group._count.members
      };
    });

    return apiSuccess(res, { groups: mappedGroups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups - Create a new group (creator is auto-joined)
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return apiError(res, 400, 'Name and description are required');
    }

    const group = await prisma.group.create({
      data: {
        name,
        description,
        creatorId: req.user.id,
        members: {
          create: {
            userId: req.user.id
          }
        }
      }
    });

    return apiSuccess(res, { group }, 201);
  } catch (error) {
    console.error('Error creating group:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups/:id/join - Join a group
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      return apiError(res, 404, 'Group not found');
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: id, userId }
      }
    });

    if (existingMember) {
      return apiError(res, 400, 'Already a member of this group');
    }

    await prisma.groupMember.create({
      data: { groupId: id, userId }
    });

    return apiSuccess(res, { message: 'Successfully joined group' });
  } catch (error) {
    console.error('Error joining group:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups/:id/leave - Leave a group
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: id, userId }
      }
    });

    if (!existingMember) {
      return apiError(res, 400, 'Not a member of this group');
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId: id, userId }
      }
    });

    return apiSuccess(res, { message: 'Successfully left group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// GET /api/groups/:id/messages - Get chat messages for a group (must be a member)
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: id, userId }
      }
    });

    if (!member) {
      return apiError(res, 403, 'You must join this group to read messages');
    }

    const messages = await prisma.groupMessage.findMany({
      where: { groupId: id },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return apiSuccess(res, { messages });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups/:id/messages - Send a chat message (must be a member, triggers Pusher event)
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) {
      return apiError(res, 400, 'Message content is required');
    }

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: id, userId }
      }
    });

    if (!member) {
      return apiError(res, 403, 'You must join this group to send messages');
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId: id,
        senderId: userId,
        content
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });

    // Trigger real-time message event via Pusher
    await triggerEvent(`group-${id}`, 'new-group-message', { message });

    return apiSuccess(res, { message }, 201);
  } catch (error) {
    console.error('Error sending group message:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

export default router;
