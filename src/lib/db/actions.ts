'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ==================== ACTIVITY ACTIONS ====================

export async function dbCreateActivity(data: {
  id: string;
  title: string;
  type: string;
  description: string;
  createdBy: string;
  delegatedBy?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime?: string;
  location?: string;
  status: string;
  createdAt: string;
  responsibilityIds: string[];
  dailyLogs: { id: string; date: string; status: string }[];
}) {
  await prisma.activity.create({
    data: {
      id: data.id,
      title: data.title,
      type: data.type,
      description: data.description,
      createdById: data.createdBy,
      delegatedById: data.delegatedBy || null,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime || '',
      location: data.location || '',
      status: data.status,
      createdAt: new Date(data.createdAt + 'T00:00:00Z'),
      responsibilities: {
        create: data.responsibilityIds.map(rid => ({
          responsibilityId: rid,
        })),
      },
      dailyLogs: {
        create: data.dailyLogs.map(l => ({
          id: l.id,
          date: l.date,
          status: l.status,
        })),
      },
    },
  });
}

export async function dbSubmitDailyLog(data: {
  activityId: string;
  date: string;
  objectives?: string;
  activityDescription?: string;
  transcript?: string;
  attendanceCount?: string;
  attendanceNotes?: string;
  submittedAt: string;
  attendees?: { name: string; phone: string; email: string; source: string; registeredAt?: string }[];
  attachments?: { name: string; size: number; type: string; url: string }[];
}) {
  const log = await prisma.dailyLog.findFirst({
    where: { activityId: data.activityId, date: data.date },
  });
  if (!log) return;

  await prisma.dailyLog.update({
    where: { id: log.id },
    data: {
      objectives: data.objectives || '',
      activityDescription: data.activityDescription || '',
      transcript: data.transcript || '',
      attendanceCount: data.attendanceCount || '',
      attendanceNotes: data.attendanceNotes || '',
      status: 'submitted',
      submittedAt: new Date(data.submittedAt),
    },
  });

  // Create attendees
  if (data.attendees && data.attendees.length > 0) {
    await prisma.attendee.createMany({
      data: data.attendees.map(a => ({
        dailyLogId: log.id,
        name: a.name,
        phone: a.phone || '',
        email: a.email || '',
        source: a.source,
        registeredAt: a.registeredAt || null,
      })),
    });
  }

  // Create attachments
  if (data.attachments && data.attachments.length > 0) {
    await prisma.attachment.createMany({
      data: data.attachments.map(a => ({
        dailyLogId: log.id,
        name: a.name,
        size: a.size,
        type: a.type,
        url: a.url,
      })),
    });
  }
}

export async function dbUpdateActivityStatus(activityId: string, status: string) {
  await prisma.activity.update({
    where: { id: activityId },
    data: { status },
  });
}

export async function dbUpdateActivityWrapup(activityId: string, data: {
  initiativeTeamwork?: string;
  challenges?: string;
  outcomes?: string;
  nextSteps?: string;
}) {
  const updateData: Record<string, string> = {};
  if (data.initiativeTeamwork?.trim()) updateData.initiativeTeamwork = data.initiativeTeamwork.trim();
  if (data.challenges?.trim()) updateData.challenges = data.challenges.trim();
  if (data.outcomes?.trim()) updateData.outcomes = data.outcomes.trim();
  if (data.nextSteps?.trim()) updateData.nextSteps = data.nextSteps.trim();
  if (Object.keys(updateData).length > 0) {
    await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
    });
  }
}

// ==================== COMMENT ACTIONS ====================

export async function dbAddComment(data: {
  id: string;
  activityId: string;
  authorId: string;
  text: string;
  createdAt: string;
}) {
  await prisma.comment.create({
    data: {
      id: data.id,
      activityId: data.activityId,
      authorId: data.authorId,
      text: data.text,
      createdAt: new Date(data.createdAt),
    },
  });
}

// ==================== MESSAGE ACTIONS ====================

export async function dbSendDm(data: {
  id: string;
  participantA: string;
  participantB: string;
  fromUserId: string;
  text: string;
}) {
  await prisma.directMessage.create({
    data: {
      id: data.id,
      participantA: data.participantA,
      participantB: data.participantB,
      fromUserId: data.fromUserId,
      text: data.text,
    },
  });
}

export async function dbSendCommunityMessage(data: {
  id: string;
  fromUserId: string;
  text: string;
}) {
  await prisma.communityMessage.create({
    data: {
      id: data.id,
      fromUserId: data.fromUserId,
      text: data.text,
    },
  });
}

export async function dbWipeCommunity() {
  await prisma.communityMessage.deleteMany();
}

export async function dbSendBroadcast(data: {
  id: string;
  fromUserId: string;
  text: string;
  createdAt: string;
}) {
  await prisma.broadcast.create({
    data: {
      id: data.id,
      fromUserId: data.fromUserId,
      text: data.text,
      createdAt: new Date(data.createdAt),
    },
  });
}

// ==================== NOTIFICATION ACTIONS ====================

export async function dbPushNotification(data: {
  id: string;
  userId: string;
  type: string;
  text: string;
  activityId?: string | null;
  createdAt: string;
}) {
  await prisma.notification.create({
    data: {
      id: data.id,
      userId: data.userId,
      type: data.type,
      text: data.text,
      activityId: data.activityId || null,
      createdAt: new Date(data.createdAt),
    },
  });
}

export async function dbMarkNotifRead(id: string) {
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
}

export async function dbMarkAllNotifsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

// ==================== USER ACTIONS ====================

export async function dbUpdateUserProfile(userId: string, patch: {
  designation?: string;
  gradeLevel?: string;
  sex?: string;
  phone?: string;
  stateOfOrigin?: string;
  dateJoined?: string;
  photoUrl?: string | null;
}) {
  await prisma.user.update({
    where: { id: userId },
    data: patch,
  });
}

// ==================== RSVP ACTIONS ====================

export async function dbSetLogRsvpToken(logId: string, token: string) {
  await prisma.dailyLog.update({
    where: { id: logId },
    data: { rsvpToken: token },
  });
}

export async function dbAddRsvpAttendee(logId: string, attendee: {
  name: string;
  phone: string;
  email: string;
  source: string;
  registeredAt?: string;
}) {
  await prisma.attendee.create({
    data: {
      dailyLogId: logId,
      name: attendee.name,
      phone: attendee.phone || '',
      email: attendee.email || '',
      source: attendee.source,
      registeredAt: attendee.registeredAt || null,
    },
  });
}

// ==================== DATA LOADING ====================

export async function dbLoadAllData() {
  const [users, activities, dailyLogs, comments, dms, community, broadcasts, notifications, responsibilities, actResp] = await Promise.all([
    prisma.user.findMany(),
    prisma.activity.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.dailyLog.findMany({
      include: { attendees: true, attachments: true },
      orderBy: { date: 'asc' },
    }),
    prisma.comment.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.directMessage.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.communityMessage.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.broadcast.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.responsibility.findMany(),
    prisma.activityResponsibility.findMany(),
  ]);

  // Convert Prisma dates to ISO strings for the client
  return {
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role as 'head' | 'member',
      isSecretary: u.isSecretary,
      isCorps: u.isCorps,
      corpsEnd: u.corpsEnd || undefined,
      color: u.color,
      phone: u.phone,
      designation: u.designation,
      gradeLevel: u.gradeLevel,
      sex: u.sex,
      stateOfOrigin: u.stateOfOrigin,
      dateJoined: u.dateJoined,
      photoUrl: u.photoUrl,
    })),
    activities: activities.map(a => {
      const respIds = actResp.filter(ar => ar.activityId === a.id).map(ar => ar.responsibilityId);
      return {
        id: a.id,
        title: a.title,
        type: a.type as 'Meeting' | 'Project' | 'Program' | 'Task',
        description: a.description,
        createdBy: a.createdById,
        delegatedBy: a.delegatedById,
        startDate: a.startDate,
        endDate: a.endDate,
        startTime: a.startTime,
        endTime: a.endTime,
        responsibilityIds: respIds,
        location: a.location,
        status: a.status as 'pending' | 'completed' | 'missed',
        createdAt: a.createdAt.toISOString().slice(0, 10),
        initiativeTeamwork: a.initiativeTeamwork,
        challenges: a.challenges,
        outcomes: a.outcomes,
        nextSteps: a.nextSteps,
      };
    }),
    dailyLogs: dailyLogs.map(l => ({
      id: l.id,
      activityId: l.activityId,
      date: l.date,
      objectives: l.objectives,
      activityDescription: l.activityDescription,
      transcript: l.transcript,
      attendanceCount: l.attendanceCount,
      attendanceNotes: l.attendanceNotes,
      attendees: l.attendees.map(a => ({
        name: a.name,
        phone: a.phone,
        email: a.email,
        source: a.source as 'unit' | 'manual' | 'link',
        at: a.registeredAt || undefined,
      })),
      rsvpToken: l.rsvpToken,
      attachments: l.attachments.map(a => ({
        name: a.name,
        size: a.size,
        type: a.type,
        url: a.url,
      })),
      status: l.status as 'pending' | 'submitted',
      submittedAt: l.submittedAt ? l.submittedAt.toISOString().slice(0, 10) : null,
    })),
    comments: comments.map(c => ({
      id: c.id,
      activityId: c.activityId,
      authorId: c.authorId,
      text: c.text,
      createdAt: c.createdAt.toISOString().slice(0, 10),
    })),
    dms: dms.map(d => ({
      id: d.id,
      a: d.participantA,
      b: d.participantB,
      from: d.fromUserId,
      text: d.text,
      at: d.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    })),
    community: community.map(c => ({
      id: c.id,
      from: c.fromUserId,
      text: c.text,
      at: c.createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    })),
    broadcasts: broadcasts.map(b => ({
      id: b.id,
      from: b.fromUserId,
      text: b.text,
      at: b.createdAt.toISOString().slice(0, 10),
    })),
    notifications: notifications.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type as 'comment' | 'dm' | 'activity_created' | 'activity_completed' | 'activity_missed' | 'broadcast',
      text: n.text,
      activityId: n.activityId,
      createdAt: n.createdAt.toISOString().slice(0, 10),
      read: n.read,
    })),
  };
}
