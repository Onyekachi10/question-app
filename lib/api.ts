import {
  Question,
  Answer,
  AuthResponse,
  User,
  Session,
  SessionCreateResponse,
  SessionJoinResponse,
  DashboardResponse,
  SessionMessagesResponse,
  QuestionResponse,
  QuestionsListResponse,
  AnswerResponse,
  AnswersListResponse,
  ActionResponse,
} from '../types/qa';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6001';

// ─── Custom API Error ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  public success: false = false;
  public status: number;
  public details?: any;
  public field?: string;
  public data?: any;
  public retryAfter?: number;
  public isRateLimited: boolean;

  constructor(
    message: string,
    status: number = 400,
    details?: any,
    field?: string,
    data?: any,
    retryAfter?: number,
    isRateLimited?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
    this.success = false;
    this.status = status;
    this.details = details;
    this.field = field;
    this.data = data;
    this.retryAfter = retryAfter;
    this.isRateLimited = isRateLimited ?? (status === 429);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class RateLimitApiError extends ApiError {
  constructor(
    message: string = 'Too many requests. Please try again later.',
    retryAfter?: number,
    details?: any,
    data?: any
  ) {
    super(message, 429, details, undefined, data, retryAfter, true);
    this.name = 'RateLimitApiError';
    Object.setPrototypeOf(this, RateLimitApiError.prototype);
  }
}

/** Safely parse response body as JSON, plain text, or null. */
async function parseResponseBody<T = any>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/** Extract the most meaningful error message sent by the backend. */
function extractBackendErrorMessage(data: any, statusText: string, fallback: string): string {
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim().length > 0) {
      return data.message;
    }
    if (typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error;
    }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors
        .map((e: any) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e)))
        .join(', ');
    }
  }
  if (typeof data === 'string' && data.trim().length > 0) {
    return data;
  }
  return statusText || fallback;
}

/** All browser fetches include cookies so auth HTTP-only cookies are sent automatically. */
export const req = (path: string, init: RequestInit = {}): Promise<Response> =>
  fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });

/**
 * Executes a request, checks response status and success flag from backend,
 * and extracts the backend's error message or returns the typed data.
 */
async function execute<T = any>(
  path: string,
  init: RequestInit = {},
  fallbackErrorMessage = 'Request failed'
): Promise<T> {
  let res: Response;
  try {
    res = await req(path, init);
  } catch (netErr: any) {
    throw new ApiError(
      netErr?.message || 'Network error: unable to connect to server',
      0,
      undefined,
      undefined,
      netErr
    );
  }

  const data = await parseResponseBody<any>(res);

  if (!res.ok || (data && typeof data === 'object' && data.success === false)) {
    const isRateLimited = res.status === 429 || data?.statusCode === 429;

    let retryAfter: number | undefined;
    const retryHeader = res.headers.get('retry-after');
    if (retryHeader) {
      const parsed = parseInt(retryHeader, 10);
      if (!isNaN(parsed)) retryAfter = parsed;
    }
    if (retryAfter === undefined && data?.details?.retryAfter) {
      retryAfter = Number(data.details.retryAfter);
    }
    if (retryAfter === undefined && data?.retryAfter) {
      retryAfter = Number(data.retryAfter);
    }

    let defaultFallback = fallbackErrorMessage;
    if (isRateLimited) {
      defaultFallback = retryAfter
        ? `Too many attempts. Please try again in ${retryAfter} seconds.`
        : 'Too many attempts. Please try again later.';
    }

    const message = extractBackendErrorMessage(data, res.statusText, defaultFallback);
    const details = data?.details;
    const field = data?.field;

    if (isRateLimited) {
      throw new RateLimitApiError(message, retryAfter, details, data);
    }

    throw new ApiError(message, res.status, details, field, data, retryAfter, false);
  }

  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  /** Register a creator account */
  async registerCreator(payload: {
    email: string;
    username: string;
  }): Promise<AuthResponse> {
    return execute<AuthResponse>(
      '/users/create/creator',
      {
        method: 'POST',
        body: JSON.stringify({ ...payload, userRole: 'creator' }),
      },
      'Registration failed'
    );
  },

  /** Register a recipient account */
  async registerRecipient(payload: {
    email: string;
    username: string;
  }): Promise<AuthResponse> {
    return execute<AuthResponse>(
      '/users/create/recipient',
      {
        method: 'POST',
        body: JSON.stringify({ ...payload, userRole: 'recipient' }),
      },
      'Registration failed'
    );
  },

  /** Login with email + username + role */
  async login(payload: {
    email: string;
    username: string;
    userRole: 'creator' | 'recipient';
  }): Promise<AuthResponse> {
    return execute<AuthResponse>(
      '/users/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'Login failed'
    );
  },

  /** Logout — clears server-side cookies */
  async logout(): Promise<ActionResponse> {
    return execute<ActionResponse>(
      '/users/logout',
      { method: 'POST' },
      'Logout failed'
    );
  },

  /** Silently refresh tokens; returns the user if still valid */
  async refresh(): Promise<User | null> {
    try {
      const data = await execute<{ success: boolean; user?: User }>(
        '/users/refresh',
        { method: 'POST' },
        'Session refresh failed'
      );
      return data?.user ?? null;
    } catch (err: any) {
      if (err instanceof ApiError && (err.isRateLimited || err.status === 429)) {
        throw err;
      }
      return null;
    }
  },
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionApi = {
  /** POST /users/session/create — creator only */
  async create(): Promise<SessionCreateResponse> {
    return execute<SessionCreateResponse>(
      '/users/session/create',
      { method: 'POST' },
      'Failed to create session'
    );
  },

  /** GET /users/session/:slug — resolve a session by slug */
  async getBySlug(
    slug: string
  ): Promise<Session & { success: boolean; message?: string; session: Session }> {
    const data = await execute<{ success: boolean; session: Session; message?: string }>(
      `/users/session/${encodeURIComponent(slug)}`,
      {},
      'Session not found'
    );
    return Object.assign(data.session, {
      success: data.success,
      message: data.message,
      session: data.session,
    });
  },

  /** POST /users/session/:slug/join */
  async join(slug: string): Promise<SessionJoinResponse> {
    return execute<SessionJoinResponse>(
      `/users/session/${encodeURIComponent(slug)}/join`,
      { method: 'POST' },
      'Failed to join session'
    );
  },

  /** POST /users/session/:slug/close */
  async close(
    slug: string
  ): Promise<ActionResponse & { session?: Session }> {
    return execute<ActionResponse & { session?: Session }>(
      `/users/session/${encodeURIComponent(slug)}/close`,
      { method: 'POST' },
      'Failed to close session'
    );
  },

  /** POST /users/session/:slug/switch-role */
  async switchRole(slug: string): Promise<ActionResponse> {
    return execute<ActionResponse>(
      `/users/session/${encodeURIComponent(slug)}/switch-role`,
      { method: 'POST' },
      'Failed to switch role'
    );
  },

  /** GET /users/dashboard */
  async getDashboard(): Promise<DashboardResponse> {
    return execute<DashboardResponse>(
      '/users/dashboard',
      {},
      'Failed to fetch dashboard'
    );
  },

  /** GET /users/session/:slug/messages */
  async getMessages(slug: string): Promise<SessionMessagesResponse> {
    return execute<SessionMessagesResponse>(
      `/users/session/${encodeURIComponent(slug)}/messages`,
      {},
      'Failed to fetch messages'
    );
  },
};

// ─── Questions ────────────────────────────────────────────────────────────────

export const questionApi = {
  /** POST /question/create — creator only */
  async create(payload: {
    title: string;
    type: 'open' | 'multiple-choice';
    options?: string[];
    category?: string;
    user_id: string;
    session_id?: string;
  }): Promise<Question & { success: boolean; message: string; question: Question }> {
    const data = await execute<QuestionResponse>(
      '/question/create',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'Failed to create question'
    );
    return Object.assign(data.question, {
      success: data.success,
      message: data.message,
      question: data.question,
    });
  },

  /** GET /question/question/:uuid */
  async getById(
    uuid: string
  ): Promise<(Question & { success: boolean; question: Question }) | null> {
    try {
      const res = await req(`/question/question/${encodeURIComponent(uuid)}`);
      if (res.status === 404) return null;

      const data = await parseResponseBody<any>(res);
      if (!res.ok || (data && typeof data === 'object' && data.success === false)) {
        const msg = extractBackendErrorMessage(data, res.statusText, 'Failed to fetch question');
        throw new ApiError(msg, res.status, data?.details, data?.field, data);
      }

      if (!data?.question) return null;
      return Object.assign(data.question, {
        success: data.success ?? true,
        question: data.question,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  /** GET /question/list?session_id=... */
  async listBySession(
    sessionId: string
  ): Promise<Question[] & { success: boolean; count: number; questions: Question[] }> {
    const data = await execute<QuestionsListResponse>(
      `/question/list?session_id=${encodeURIComponent(sessionId)}`,
      {},
      'Failed to fetch questions for session'
    );
    const questions = data.questions ?? [];
    return Object.assign(questions, {
      success: data.success ?? true,
      count: data.count ?? questions.length,
      questions,
    });
  },

  /** PATCH /question/update/:uuid */
  async update(
    uuid: string,
    payload: Partial<Pick<Question, 'title' | 'type' | 'options' | 'category'>>
  ): Promise<Question & { success: boolean; message: string; question: Question }> {
    const data = await execute<QuestionResponse>(
      `/question/update/${encodeURIComponent(uuid)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      'Failed to update question'
    );
    return Object.assign(data.question, {
      success: data.success,
      message: data.message,
      question: data.question,
    });
  },

  /** DELETE /question/delete/:uuid */
  async delete(uuid: string): Promise<ActionResponse> {
    return execute<ActionResponse>(
      `/question/delete/${encodeURIComponent(uuid)}`,
      { method: 'DELETE' },
      'Failed to delete question'
    );
  },
};

// ─── Answers ─────────────────────────────────────────────────────────────────

export const answerApi = {
  /** GET /answer/question/:uuid/answers */
  async getByQuestion(
    questionUuid: string
  ): Promise<Answer[] & { success: boolean; count: number; answers: Answer[] }> {
    const data = await execute<AnswersListResponse>(
      `/answer/question/${encodeURIComponent(questionUuid)}/answers`,
      {},
      'Failed to fetch answers'
    );
    const answers = data.answers ?? [];
    return Object.assign(answers, {
      success: data.success ?? true,
      count: data.count ?? answers.length,
      answers,
    });
  },

  /** POST /answer/question/:uuid/answer */
  async submit(
    questionUuid: string,
    payload: { text_answer?: string; selected_option?: string; user_id: string }
  ): Promise<Answer & { success: boolean; message: string; answer: Answer }> {
    const data = await execute<AnswerResponse>(
      `/answer/question/${encodeURIComponent(questionUuid)}/answer`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'Failed to submit answer'
    );
    return Object.assign(data.answer, {
      success: data.success,
      message: data.message,
      answer: data.answer,
    });
  },

  /** PATCH /answer/answer/:uuid */
  async update(
    answerUuid: string,
    payload: { text_answer?: string; selected_option?: string }
  ): Promise<Answer & { success: boolean; message: string; answer: Answer }> {
    const data = await execute<AnswerResponse>(
      `/answer/answer/${encodeURIComponent(answerUuid)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      'Failed to update answer'
    );
    return Object.assign(data.answer, {
      success: data.success,
      message: data.message,
      answer: data.answer,
    });
  },

  /** DELETE /answer/answer/:uuid */
  async delete(answerUuid: string): Promise<ActionResponse> {
    return execute<ActionResponse>(
      `/answer/answer/${encodeURIComponent(answerUuid)}`,
      { method: 'DELETE' },
      'Failed to delete answer'
    );
  },
};

// ─── Legacy compat shim ───────────────────────────────────────────────────────
/** @deprecated use questionApi / answerApi directly */
export const api = {
  getActiveQuestion: () => Promise.resolve(null),
  createQuestion: () => Promise.resolve(null),
  clearQuestion: () => Promise.resolve(),
  getAnswers: () => Promise.resolve([]),
  submitAnswer: () => Promise.resolve(null),
};
