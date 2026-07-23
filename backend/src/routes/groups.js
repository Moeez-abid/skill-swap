import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { apiError, apiSuccess } from '../utils/helpers.js';
import { triggerEvent } from '../lib/pusher.js';
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = Router();
router.use(authenticate);

// GET /api/groups/invitations - Get pending invitations for logged in user
router.get('/invitations', async (req, res) => {
  try {
    const invitations = await prisma.groupInvitation.findMany({
      where: { inviteeId: req.user.id, status: 'PENDING' },
      include: {
        group: true,
        inviter: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return apiSuccess(res, { invitations });
  } catch (error) {
    console.error('Error fetching group invitations:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups/invitations/:id/accept - Accept an invitation
router.post('/invitations/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const invitation = await prisma.groupInvitation.findFirst({
      where: { id, inviteeId: userId, status: 'PENDING' }
    });
    if (!invitation) return apiError(res, 404, 'Invitation not found or already processed');

    // Update status to accepted
    await prisma.groupInvitation.update({
      where: { id },
      data: { status: 'ACCEPTED' }
    });

    // Join group if not already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: invitation.groupId, userId } }
    });
    if (!existingMember) {
      await prisma.groupMember.create({
        data: { groupId: invitation.groupId, userId }
      });
    }
    return apiSuccess(res, { message: 'Invitation accepted' });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups/invitations/:id/decline - Decline an invitation
router.post('/invitations/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const invitation = await prisma.groupInvitation.findFirst({
      where: { id, inviteeId: userId, status: 'PENDING' }
    });
    if (!invitation) return apiError(res, 404, 'Invitation not found or already processed');

    await prisma.groupInvitation.update({
      where: { id },
      data: { status: 'DECLINED' }
    });
    return apiSuccess(res, { message: 'Invitation declined' });
  } catch (error) {
    console.error('Error declining invitation:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups/:id/invite - Invite a user to the group
router.post('/:id/invite', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const inviterId = req.user.id;

    if (!userId) return apiError(res, 400, 'userId is required');

    // check if inviter is in group
    const inviterMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: inviterId } }
    });
    if (!inviterMember) return apiError(res, 403, 'You must be a member to invite others');

    const invitee = await prisma.user.findUnique({ where: { id: userId } });
    if (!invitee) return apiError(res, 404, 'User to invite not found');

    const existingMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });
    if (existingMember) return apiError(res, 400, 'User is already a member');

    const existingInvite = await prisma.groupInvitation.findFirst({
      where: { groupId: id, inviteeId: userId, status: 'PENDING' }
    });
    if (existingInvite) return apiError(res, 400, 'User has already been invited');

    const invitation = await prisma.groupInvitation.create({
      data: {
        groupId: id,
        inviterId,
        inviteeId: userId,
        status: 'PENDING'
      },
      include: { group: true }
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'GROUP_INVITE',
        title: 'New Group Invitation',
        content: `You have been invited to join the group "${invitation.group.name}"`,
        linkUrl: `/groups`
      }
    });

    return apiSuccess(res, { message: 'Invitation sent successfully', invitation });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// GET /api/groups - Get all groups with membership flags and member count
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await prisma.group.findMany({
      include: {
        members: {
          select: { userId: true, role: true }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const isPlatformAdminOrManager = ['SUPER_ADMIN', 'MANAGER'].includes(req.user.role);
    const mappedGroups = groups.map(group => {
      const memberInfo = group.members.find(m => m.userId === userId);
      const isMember = !!memberInfo || isPlatformAdminOrManager;
      const userGroupRole = memberInfo ? memberInfo.role : (isPlatformAdminOrManager ? 'ADMIN' : null);
      const { members, ...groupData } = group;
      return {
        ...groupData,
        isMember,
        userGroupRole,
        memberCount: group._count.members
      };
    });

    return apiSuccess(res, { groups: mappedGroups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups - Create a new group (creator is auto-joined as ADMIN)
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
            userId: req.user.id,
            role: 'ADMIN'
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
      data: { groupId: id, userId, role: 'MEMBER' }
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

// GET /api/groups/:id/messages - Get chat messages for a group (members or platform admin/managers)
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: id, userId }
      }
    });

    const isPlatformAdminOrManager = ['SUPER_ADMIN', 'MANAGER'].includes(req.user.role);

    if (!member && !isPlatformAdminOrManager) {
      return apiError(res, 403, 'You must join this group to read messages');
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true } }
          }
        }
      }
    });
    if (!group) return apiError(res, 404, 'Group not found');

    const messages = await prisma.groupMessage.findMany({
      where: { 
        groupId: id,
        NOT: { deletedFor: { has: userId } }
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        replyTo: { include: { sender: { select: { id: true, name: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const membersList = group.members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role, // 'ADMIN' or 'MEMBER'
      platformRole: m.user.role
    }));

    return apiSuccess(res, { 
      messages,
      messagingMode: group.messagingMode,
      userGroupRole: member ? member.role : (isPlatformAdminOrManager ? 'ADMIN' : null),
      members: membersList
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// POST /api/groups/:id/messages - Send a chat message (enforce messagingMode and permissions)
router.post('/:id/messages', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, replyToId } = req.body;

    let fileUrl = null;
    let fileName = null;
    let fileType = null;
    
    if (req.file) {
      fileUrl = await uploadFile(req.file.path, 'group_attachments');
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
      fs.unlinkSync(req.file.path);
    }

    if (!content && !fileUrl) {
      return apiError(res, 400, 'Message content or file is required');
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!group) return apiError(res, 404, 'Group not found');

    const isPlatformAdminOrManager = ['SUPER_ADMIN', 'MANAGER'].includes(req.user.role);
    const member = group.members[0];

    if (!member && !isPlatformAdminOrManager) {
      return apiError(res, 403, 'You must join this group to send messages');
    }

    // Verify messagingMode
    if (group.messagingMode === 'ADMINS_ONLY') {
      const isGroupAdmin = member && member.role === 'ADMIN';
      const isGroupCreator = group.creatorId === userId;
      if (!isPlatformAdminOrManager && !isGroupAdmin && !isGroupCreator) {
        return apiError(res, 403, 'Only group admins and platform staff can message in this group');
      }
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId: id,
        senderId: userId,
        content,
        fileUrl,
        fileName,
        fileType,
        replyToId: replyToId || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        replyTo: { include: { sender: { select: { id: true, name: true } } } }
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

// PATCH /api/groups/:id/settings - Update group settings (messagingMode)
router.patch('/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { messagingMode } = req.body;

    if (!['ALL', 'ADMINS_ONLY'].includes(messagingMode)) {
      return apiError(res, 400, 'Invalid messagingMode');
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!group) return apiError(res, 404, 'Group not found');

    const isPlatformAdminOrManager = ['SUPER_ADMIN', 'MANAGER'].includes(req.user.role);
    const member = group.members[0];
    const isGroupAdmin = member && member.role === 'ADMIN';
    const isGroupCreator = group.creatorId === userId;

    if (!isPlatformAdminOrManager && !isGroupAdmin && !isGroupCreator) {
      return apiError(res, 403, 'Not authorized to change group settings');
    }

    const updated = await prisma.group.update({
      where: { id },
      data: { messagingMode }
    });

    // Notify group members
    await triggerEvent(`group-${id}`, 'group-settings-changed', { group: updated });

    return apiSuccess(res, { group: updated });
  } catch (error) {
    console.error('Error updating group settings:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

// PATCH /api/groups/:id/members/:targetUserId/role - Manage group roles (ADMIN / MEMBER)
router.patch('/:id/members/:targetUserId/role', async (req, res) => {
  try {
    const { id, targetUserId } = req.params;
    const userId = req.user.id;
    const { role } = req.body;

    if (!['MEMBER', 'ADMIN'].includes(role)) {
      return apiError(res, 400, 'Invalid role');
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId }
        }
      }
    });

    if (!group) return apiError(res, 404, 'Group not found');

    const isPlatformAdminOrManager = ['SUPER_ADMIN', 'MANAGER'].includes(req.user.role);
    const member = group.members[0];
    const isGroupAdmin = member && member.role === 'ADMIN';
    const isGroupCreator = group.creatorId === userId;

    if (!isPlatformAdminOrManager && !isGroupAdmin && !isGroupCreator) {
      return apiError(res, 403, 'Not authorized to manage group member roles');
    }

    const targetMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: targetUserId } }
    });
    if (!targetMember) return apiError(res, 404, 'Target member not found');

    const updated = await prisma.groupMember.update({
      where: { groupId_userId: { groupId: id, userId: targetUserId } },
      data: { role }
    });

    await triggerEvent(`group-${id}`, 'group-member-role-changed', { groupId: id, userId: targetUserId, role });

    return apiSuccess(res, { member: updated });
  } catch (error) {
    console.error('Error updating member role:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

router.delete('/:id/messages/:messageId', async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const userId = req.user.id;
    const forEveryone = req.query.forEveryone === 'true';

    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      include: { group: true }
    });
    if (!message || message.groupId !== id) return apiError(res, 404, 'Message not found');

    if (forEveryone) {
      const isSender = message.senderId === userId;
      const isGroupCreator = message.group.creatorId === userId;
      const isPlatformAdminOrManager = ['SUPER_ADMIN', 'MANAGER'].includes(req.user.role);
      
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId } }
      });
      const isGroupAdmin = member && member.role === 'ADMIN';

      if (!isSender && !isGroupCreator && !isPlatformAdminOrManager && !isGroupAdmin) {
        return apiError(res, 403, 'Not authorized to delete for everyone');
      }
      
      await prisma.groupMessage.delete({ where: { id: messageId } });
      await triggerEvent(`group-${id}`, 'group-message-deleted', { messageId });
    } else {
      const deletedForArray = message.deletedFor || [];
      if (!deletedForArray.includes(userId)) {
        await prisma.groupMessage.update({
          where: { id: messageId },
          data: { deletedFor: { push: userId } }
        });
      }
      await triggerEvent(`user-${userId}`, 'group-message-deleted', { messageId, groupId: id });
    }

    return apiSuccess(res, { success: true });
  } catch (error) {
    console.error('Error deleting group message:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

router.post('/:id/messages/bulk-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { messageIds } = req.body;
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) return apiError(res, 400, 'Invalid messageIds');

    const messages = await prisma.groupMessage.findMany({
      where: { id: { in: messageIds }, groupId: id }
    });

    await Promise.all(messages.map(m => {
      const deletedForArray = m.deletedFor || [];
      if (!deletedForArray.includes(userId)) {
        return prisma.groupMessage.update({
          where: { id: m.id },
          data: { deletedFor: { push: userId } }
        });
      }
    }));

    await triggerEvent(`user-${userId}`, 'group-messages-deleted', { messageIds, groupId: id });
    return apiSuccess(res, { success: true });
  } catch (error) {
    console.error('Error bulk deleting group messages:', error);
    return apiError(res, 500, 'Internal server error');
  }
});

export default router;
