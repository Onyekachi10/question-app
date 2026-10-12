export type QuestionType = 'open' | 'multiple-choice';
export type UserRole = 'creator' | 'recipient';
export type SessionStatus = 'active' | 'closed';

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  uuid: string;
  email: string;
  username: string;
  userRole: UserRole;
  createdAt: string;
}

export interface Question {
  uuid: string;
  title: string;
  type: QuestionType;
  options?: string[] | null;
  category?: string | null;
  user_id: string;
  session_id?: string | null;
  createdAt: string;
}

export interface Answer {
  uuid: string;
  question_id: string;
  user_id: string;
  text_answer?: string | null;
  selected_option?: string | null;
  submittedAt?: string;
  createdAt: string;
}

export interface Session {
  uuid: string;
  slug: string;
  status: SessionStatus;
  creatorId: string;
  recipientId?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface QuestionWithAnswers extends Question {
  answers: Answer[];
}

// ─── API wrapper shapes ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken?: string;
}

export interface SessionCreateResponse {
  success: boolean;
  message: string;
  session: Session;
  shareUrl: string;
}

export interface SessionJoinResponse {
  success: boolean;
  message: string;
  session: Session;
  sessionUrl: string;
}

export interface DashboardResponse {
  success: boolean;
  created: Session[];
  joined: Session[];
}

export interface SessionMessagesResponse {
  success: boolean;
  session: Session;
  messages: QuestionWithAnswers[];
}

export interface QuestionResponse {
  success: boolean;
  message: string;
  question: Question;
}

export interface QuestionsListResponse {
  success: boolean;
  count: number;
  questions: Question[];
}

export interface AnswerResponse {
  success: boolean;
  message: string;
  answer: Answer;
}

export interface AnswersListResponse {
  success: boolean;
  count: number;
  answers: Answer[];
}

export interface ActionResponse {
  success: boolean;
  message: string;
}
