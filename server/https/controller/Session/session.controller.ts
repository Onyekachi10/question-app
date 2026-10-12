import { Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "@/src/prisma/db";
import {
  AuthError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  } from "@/server/config/errorHandler";
import { AuthenticatedRequest } from "../Question/question.controller";
import { emitToSession } from "@/server/socket";

// ─── Slug generator ───────────────────────────────────────────────────────────

function generateSlug(): string {
  return crypto.randomBytes(4).toString("hex");
}

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const slug = generateSlug();
    const existing = await db.orm.public.Sessions.where({ slug: String(slug) }).first();
    if (!existing) return slug;
  }
  // Fallback: add timestamp suffix
  return `${generateSlug()}-${Date.now()}`;
}

// ─── POST /users/session/create ───────────────────────────────────────────────

/**
 * Creator creates a new session.
 * Returns { session, shareUrl }
 */
export const createSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) throw new AuthError("Unauthorized");

    if (user.userRole !== "creator") {
      throw new ForbiddenError("Only creators can open sessions");
    }

    const slug = await uniqueSlug();

    const session = await db.orm.public.Sessions.create({
      slug,
      status: "active",
      creatorId: user.uuid,
    });

    const frontendBase =
      process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3002";
    const shareUrl = `${frontendBase}/join/${slug}`;

    return res.status(201).json({
      success: true,
      message: "Session created",
      session,
      shareUrl,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── GET /users/session/:slug ─────────────────────────────────────────────────

/**
 * Resolve a session by its slug.
 * Public — recipients use this to preview before joining.
 */
export const getSessionBySlug = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;
    if (!slug) throw new BadRequestError("Slug is required");

    const session = await db.orm.public.Sessions.where({ slug: String(slug) }).first();
    if (!session) throw new NotFoundError("Session not found");

    return res.status(200).json({ success: true, session });
  } catch (error) {
    return next(error);
  }
};

// ─── POST /users/session/:slug/join ──────────────────────────────────────────

/**
 * Recipient joins a session.
 * A session can only have one recipient at a time.
 */
export const joinSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) throw new AuthError("Unauthorized");

    const { slug } = req.params;
    if (!slug) throw new BadRequestError("Slug is required");

    const session = await db.orm.public.Sessions.where({ slug: String(slug) }).first();
    if (!session) throw new NotFoundError("Session not found");

    if (session.status === "closed") {
      throw new ForbiddenError("This session is closed");
    }

    if (session.creatorId === user.uuid) {
      throw new ForbiddenError("You cannot join your own session as a recipient");
    }

    // Already joined — idempotent
    if (session.recipientId === user.uuid) {
      const frontendBase =
        process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3002";
      return res.status(200).json({
        success: true,
        message: "Already joined",
        session,
        sessionUrl: `${frontendBase}/?session=${slug}`,
      });
    }

    if (session.recipientId) {
      throw new ForbiddenError("Session already has a recipient");
    }

    const updated = await db.orm.public.Sessions.where({ uuid: session.uuid }).update({
      recipientId: user.uuid,
    });

    emitToSession(session.uuid, "recipient_joined", { recipientId: user.uuid, session: updated });
    emitToSession(session.slug, "recipient_joined", { recipientId: user.uuid, session: updated });

    const frontendBase =
      process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3002";

    return res.status(200).json({
      success: true,
      message: "Joined session successfully",
      session: updated,
      sessionUrl: `${frontendBase}/?session=${slug}`,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── POST /users/session/:slug/close ─────────────────────────────────────────

/**
 * Creator closes a session.
 */
export const closeSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) throw new AuthError("Unauthorized");

    const { slug } = req.params;
    if (!slug) throw new BadRequestError("Slug is required");

    const session = await db.orm.public.Sessions.where({ slug: String(slug) }).first();
    if (!session) throw new NotFoundError("Session not found");

    if (session.creatorId !== user.uuid) {
      throw new ForbiddenError("Only the session creator can close it");
    }

    const updated = await db.orm.public.Sessions.where({ uuid: session.uuid }).update({
      status: "closed",
    });

    emitToSession(session.uuid, "session_closed", { session: updated });
    emitToSession(session.slug, "session_closed", { session: updated });

    return res.status(200).json({
      success: true,
      message: "Session closed",
      session: updated,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── POST /users/session/:slug/switch-role ────────────────────────────────────

/**
 * A recipient in a session switches to the creator role.
 * Updates the user's global role and re-issues auth tokens via the standard
 * updateUserRole path is avoided here — we handle cookies inline.
 */
export const switchRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) throw new AuthError("Unauthorized");

    const { slug } = req.params;
    if (!slug) throw new BadRequestError("Slug is required");

    const session = await db.orm.public.Sessions.where({ slug: String(slug) }).first();
    if (!session) throw new NotFoundError("Session not found");

    const isMember =
      session.creatorId === user.uuid || session.recipientId === user.uuid;
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this session");
    }

    if (user.userRole === "creator") {
      throw new BadRequestError("You are already a creator");
    }

    // Promote to creator globally
    await db.orm.public.Users.where({ uuid: user.uuid }).update({
      userRole: "creator",
    });

    return res.status(200).json({
      success: true,
      message: "Role switched to creator — please log in again to refresh your token",
    });
  } catch (error) {
    return next(error);
  }
};

// ─── GET /users/dashboard ────────────────────────────────────────────────────

/**
 * List all sessions the authenticated user created or joined.
 */
export const getDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) throw new AuthError("Unauthorized");

    // Sessions created by user
    const created = await db.orm.public.Sessions
      .where({ creatorId: user.uuid })
      .orderBy((s) => s.createdAt.desc())
      .all();

    // Sessions joined as recipient
    const joined = await db.orm.public.Sessions
      .where({ recipientId: user.uuid })
      .orderBy((s) => s.createdAt.desc())
      .all();

    return res.status(200).json({
      success: true,
      created,
      joined,
    });
  } catch (error) {
    return next(error);
  }
};

// ─── GET /users/session/:slug/messages ───────────────────────────────────────

/**
 * Get the full Q&A conversation history for a session.
 */
export const getSessionMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    if (!user) throw new AuthError("Unauthorized");

    const { slug } = req.params;
    if (!slug) throw new BadRequestError("Slug is required");

    const session = await db.orm.public.Sessions.where({ slug: String(slug) }).first();
    if (!session) throw new NotFoundError("Session not found");

    const isMember =
      session.creatorId === user.uuid || session.recipientId === user.uuid;
    if (!isMember) {
      throw new ForbiddenError("You are not a member of this session");
    }

    // Fetch all questions in this session
    const questions = await db.orm.public.Questions
      .where({ session_id: session.uuid })
      .orderBy((q) => q.createdAt.asc())
      .all();

    // Fetch answers for all questions in parallel
    const questionsWithAnswers = await Promise.all(
      questions.map(async (question) => {
        const answers = await db.orm.public.Answers
          .where({ question_id: question.uuid })
          .orderBy((a) => a.submittedAt.asc())
          .all();
        return { ...question, answers };
      })
    );

    return res.status(200).json({
      success: true,
      session,
      messages: questionsWithAnswers,
    });
  } catch (error) {
    return next(error);
  }
};
