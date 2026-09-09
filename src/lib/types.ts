export type UserRole = "head" | "member";
export type ActivityType = "Meeting" | "Project" | "Program" | "Task";
export type ActivityStatus = "pending" | "completed" | "missed";
export type ExceptionStatus = "none" | "requested" | "approved" | "rejected" | "expired";
export type SubmissionType = "normal" | "late";
export type DailyLogStatus = "pending" | "submitted";
export type AttendeeSource = "unit" | "manual" | "link" | "guest";
export type AttendeeStatus = "pending" | "verified" | "declined";
export type NotifType =
  | "comment"
  | "dm"
  | "community"
  | "activity_created"
  | "activity_completed"
  | "activity_missed"
  | "activity_reminder"
  | "broadcast"
  | "announcement"
  | "profile_updated"
  | "mention"
  | "library_submitted"
  | "library_new"
  | "library_approved"
  | "library_declined"
  | "innovation_submitted"
  | "innovation_approved"
  | "innovation_declined"
  | "innovation_implemented";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  isSecretary: boolean;
  isCorps: boolean;
  isIntern: boolean;
  corpsEnd?: string;
  color: string;
  phone: string;
  designation: string;
  gradeLevel: string;
  sex: string;
  stateOfOrigin: string;
  dateJoined: string;
  photoUrl: string | null;
  isActive: boolean;
}

/** Server-only credential row — never sent to the client. */
export interface UserCredentials {
  id: string;
  username: string;
  passwordHash: string;
  /** True until the user sets their own password on first login. */
  mustChangePassword: boolean;
}

export interface Responsibility {
  id: string;
  code: string;
  name: string;
  desc: string;
  deliverables: string[];
  isActive: boolean;
}

export interface Attendee {
  userId?: string;
  name: string;
  phone: string;
  email: string;
  source: AttendeeSource;
  status: AttendeeStatus;
  at?: string;
}

export interface SpendingItem {
  description: string;
  amount: number;
}

export interface Attachment {
  name: string;
  size: number;
  type: string;
  url: string;
  kind?: "evidence" | "invoice";
}

export interface Activity {
  id: string;
  title: string;
  type: ActivityType;
  description: string;
  createdBy: string;
  delegatedBy: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  responsibilityIds: string[];
  location: string;
  status: ActivityStatus;
  exceptionStatus: ExceptionStatus;
  exceptionReason: string;
  submissionType: SubmissionType;
  gracePeriodStartedAt: Date | null;
  gracePeriodExpiresAt: Date | null;
  dueAt: string | null;
  reminderStatus: ReminderStatus;
  reminderVersion: number;
  createdAt: string;
  initiativeTeamwork: string;
  challenges: string;
  outcomes: string;
  nextSteps: string;
  hasBudget: boolean;
  estimatedAmountNgn: number | null;
  hidden: boolean;
  softDeletedAt: string | null;
}

export interface ReminderStatus {
  morningSent?: boolean;
  dueSent?: boolean;
  eodSent?: boolean;
  cancelled?: boolean;
}

export interface DailyLog {
  id: string;
  activityId: string;
  date: string;
  objectives: string;
  activityDescription: string;
  transcript: string;
  attendanceCount: string;
  attendanceNotes: string;
  attendees: Attendee[];
  rsvpToken: string | null;
  attachments: Attachment[];
  status: DailyLogStatus;
  submittedAt: string | null;
  amountReleasedNgn: number | null;
  amountSpentNgn: number | null;
  spendingItems: SpendingItem[];
}

export interface Comment {
  id: string;
  activityId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  contentType: string;
  storageKey: string;
  width?: number | null;
  height?: number | null;
}

export interface SendMessageAttachmentInput {
  name: string;
  size: number;
  contentType: string;
  storageKey: string;
  width?: number | null;
  height?: number | null;
}

export interface ReplyPreview {
  id: string;
  from: string;
  text: string;
  at: string;
  attachments?: MessageAttachment[];
  isDeleted?: boolean;
}

export interface LinkPreview {
  url: string;
  domain: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface Dm {
  isDeleted?: boolean;
  id: string;
  a: string;
  b: string;
  from: string;
  text: string;
  at: string;
  attachments?: MessageAttachment[];
  replyToId?: string | null;
  replyTo?: ReplyPreview | null;
  linkPreview?: LinkPreview | null;
}

export interface CallRecord {
  id: string;
  a: string;
  b: string;
  from: string;
  durationSec: number;
  at: string;
}

export interface MessageMention {
  userId: string;
  displayName: string;
  position: number;
  length: number;
}

export interface CommunityMessage {
  isDeleted?: boolean;
  id: string;
  from: string;
  text: string;
  at: string;
  replyToId?: string | null;
  replyTo?: ReplyPreview | null;
  attachments?: MessageAttachment[];
  mentions?: MessageMention[];
  linkPreview?: LinkPreview | null;
}

export interface Broadcast {
  id: string;
  from: string;
  text: string;
  at: string;
}

export interface AnnouncementReaction {
  emoji: string;
  count: number;
  reactors: string[];
  reactedByMe: boolean;
}

export interface Announcement {
  id: string;
  unitId: string;
  from: string;
  text: string;
  at: string;
  reactions: AnnouncementReaction[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotifType;
  text: string;
  activityId: string | null;
  messageId?: string | null;
  createdAt: string;
  read: boolean;
  meta?: Record<string, unknown> | null;
}

export type LibraryCategory = "BOOK" | "VIDEO" | "AUDIO" | "MEMO" | "OTHER";
export type LibraryStatus = "PENDING" | "APPROVED" | "DECLINED";

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  "BOOK",
  "VIDEO",
  "AUDIO",
  "MEMO",
  "OTHER",
];

export const LIBRARY_STATUSES: LibraryStatus[] = [
  "PENDING",
  "APPROVED",
  "DECLINED",
];

export interface LibraryResource {
  id: string;
  title: string;
  description: string;
  category: LibraryCategory;
  externalUrl: string;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  submittedById: string;
  submittedByName: string;
  status: LibraryStatus;
  declineReason: string;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryListParams {
  search?: string;
  category?: LibraryCategory | "ALL";
  sort?: "name-asc" | "name-desc" | "newest" | "oldest";
  status?: LibraryStatus | "ALL";
  page?: number;
  limit?: number;
}

export type InnovationCategory = "PROCESS" | "TECHNOLOGY" | "COMMUNITY" | "TRAINING" | "COMMUNICATION" | "OTHER";
export type InnovationStatus = "PENDING" | "APPROVED" | "IMPLEMENTED" | "DECLINED";

export const INNOVATION_CATEGORIES: InnovationCategory[] = [
  "PROCESS",
  "TECHNOLOGY",
  "COMMUNITY",
  "TRAINING",
  "COMMUNICATION",
  "OTHER",
];

export const INNOVATION_STATUSES: InnovationStatus[] = [
  "PENDING",
  "APPROVED",
  "IMPLEMENTED",
  "DECLINED",
];

export interface Innovation {
  id: string;
  title: string;
  description: string;
  category: InnovationCategory;
  details: string;
  submittedById: string;
  submittedByName: string;
  status: InnovationStatus;
  declineReason: string;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  implementedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InnovationListParams {
  search?: string;
  category?: InnovationCategory | "ALL";
  status?: InnovationStatus | "ALL";
  sort?: "name-asc" | "name-desc" | "newest" | "oldest";
  page?: number;
  limit?: number;
}

export interface TrakDb {
  activities: Activity[];
  dailyLogs: DailyLog[];
  comments: Comment[];
  dms: Dm[];
  calls: CallRecord[];
  community: CommunityMessage[];
  broadcasts: Broadcast[];
  announcements: Announcement[];
  notifications: Notification[];
}

export interface SessionUser {
  /** Authoritative Postgres users.id (UUID). */
  id: string;
  /** Same as id — kept for callers that still reference authUserId. */
  authUserId: string;
  name: string;
  username: string;
  role: UserRole;
  isSecretary: boolean;
  isCorps: boolean;
  isIntern: boolean;
  mustChangePassword: boolean;
}

export interface CreateActivityInput {
  title: string;
  type: ActivityType;
  description: string;
  createdBy: string;
  delegatedBy?: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime?: string;
  responsibilityIds: string[];
  location?: string;
  seedStatus?: string;
  seedDate?: string;
  hasBudget?: boolean;
  estimatedAmountNgn?: number | null;
}

export interface SubmitDailyLogData {
  objectives?: string;
  activityDescription?: string;
  transcript?: string;
  attendanceCount?: string;
  attendanceNotes?: string;
  attendees?: Attendee[];
  attachments?: Attachment[];
  amountReleasedNgn?: number | null;
  amountSpentNgn?: number | null;
  spendingItems?: SpendingItem[];
}

export interface WrapupData {
  initiativeTeamwork?: string;
  challenges?: string;
  outcomes?: string;
  nextSteps?: string;
}
