export type UserRole = "head" | "member";
export type ActivityType = "Meeting" | "Project" | "Program" | "Task";
export type ActivityStatus = "pending" | "completed" | "missed";
export type DailyLogStatus = "pending" | "submitted";
export type AttendeeSource = "unit" | "manual" | "link";
export type NotifType =
  | "comment"
  | "dm"
  | "activity_created"
  | "activity_completed"
  | "activity_missed"
  | "broadcast";

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isSecretary: boolean;
  isCorps: boolean;
  corpsEnd?: string;
  color: string;
  phone: string;
  designation: string;
  gradeLevel: string;
  sex: string;
  stateOfOrigin: string;
  dateJoined: string;
  photoUrl: string | null;
}

/** Server-only credential row — never sent to the client. */
export interface UserCredentials {
  id: string;
  username: string;
  passwordHash: string;
}

export interface Responsibility {
  id: string;
  code: string;
  name: string;
  desc: string;
  deliverables: string[];
}

export interface Attendee {
  name: string;
  phone: string;
  email: string;
  source: AttendeeSource;
  at?: string;
}

export interface Attachment {
  name: string;
  size: number;
  type: string;
  url: string;
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
  createdAt: string;
  initiativeTeamwork: string;
  challenges: string;
  outcomes: string;
  nextSteps: string;
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
}

export interface Comment {
  id: string;
  activityId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Dm {
  id: string;
  a: string;
  b: string;
  from: string;
  text: string;
  at: string;
}

export interface CommunityMessage {
  id: string;
  from: string;
  text: string;
  at: string;
}

export interface Broadcast {
  id: string;
  from: string;
  text: string;
  at: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotifType;
  text: string;
  activityId: string | null;
  createdAt: string;
  read: boolean;
}

export interface TrakDb {
  activities: Activity[];
  dailyLogs: DailyLog[];
  comments: Comment[];
  dms: Dm[];
  community: CommunityMessage[];
  broadcasts: Broadcast[];
  notifications: Notification[];
}

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  isSecretary: boolean;
  isCorps: boolean;
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
}

export interface SubmitDailyLogData {
  objectives?: string;
  activityDescription?: string;
  transcript?: string;
  attendanceCount?: string;
  attendanceNotes?: string;
  attendees?: Attendee[];
  attachments?: Attachment[];
}

export interface WrapupData {
  initiativeTeamwork?: string;
  challenges?: string;
  outcomes?: string;
  nextSteps?: string;
}
