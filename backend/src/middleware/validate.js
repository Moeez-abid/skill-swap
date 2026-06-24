import { ZodError, z } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      next(err);
    }
  };
}

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const skillSchema = z.object({
  title: z.string().min(5).max(100),
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  shortDescription: z.string().min(20).max(200),
  fullDescription: z.string().min(50).max(5000),
  learningOutcomes: z.string().min(10).max(2000),
  prerequisites: z.string().max(1000).optional(),
  sessionDurations: z.array(z.number()).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  availability: z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE']).optional(),
  schedules: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
  })).optional(),
});

export const matchRequestSchema = z.object({
  offeredSkillId: z.string().min(1),
  wantedSkillId: z.string().min(1),
  message: z.string().min(10).max(1000),
});

export const messageSchema = z.object({
  content: z.string().max(5000).optional(),
});

export const sessionSchema = z.object({
  scheduledStart: z.string().datetime(),
  durationMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
  agenda: z.string().max(2000).optional(),
  meetingMethod: z.enum(['VIDEO', 'IN_PERSON', 'PHONE']).optional(),
  meetingDetails: z.string().max(500).optional(),
});

export const reviewSchema = z.object({
  ratingOverall: z.number().int().min(1).max(5),
  ratingTeaching: z.number().int().min(1).max(5),
  ratingCommunication: z.number().int().min(1).max(5),
  ratingPunctuality: z.number().int().min(1).max(5),
  feedback: z.string().min(1).max(1000),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  headline: z.string().max(150).optional(),
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  linkedinUrl: z.string().url().max(255).optional().or(z.literal('')),
  githubUrl: z.string().url().max(255).optional().or(z.literal('')),
  portfolioUrl: z.string().url().max(255).optional().or(z.literal('')),
  timezone: z.string().max(64).optional(),
  availabilityStatus: z.enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE']).optional(),
  notifyMatches: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifySessions: z.boolean().optional(),
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
