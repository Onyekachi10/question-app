import { Request, Response, NextFunction } from "express";
import { db } from "@/src/prisma/db";
import {
  NotFoundError,
  ForbiddenError,
  AuthError,
  BadRequestError,
} from "@/server/config/errorHandler";
import {
  validateQuestionTitle,
  validateQuestionType,
  validateOptions,
  validateMultipleChoiceOptions,
} from "@/server/config/errorHandler/question.validation";
import { protectedUser } from "@/server/config/userType";
import { emitToSession } from "@/server/socket";


export type AuthenticatedRequest = Request & {
    user?: protectedUser;
};

/**
 * POST /questions
 * Create a new Question (Open or Multiple-Choice)
 */
export const createQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, type, options, category, session_id } = req.body;
    const userId = req.user?.uuid || req.body.user_id;

    if (!userId) {
      throw new AuthError("Unauthorized: User ID is required to create a question");
    }

    const validatedTitle = validateQuestionTitle(title);
    const validatedType = validateQuestionType(type);
    const formattedOptions = validateOptions(validatedType, options);

    // Verify creator exists and has creator role
    const creator = await db.orm.public.Users.where({ uuid: userId }).first();
    if (!creator) {
      throw new NotFoundError("Creator account not found");
    }

    if (creator.userRole !== "creator") {
      throw new ForbiddenError("Forbidden: Only creators can post questions");
    }

    // If session_id provided, verify the session exists and is active (supports UUID or slug)
    let activeSession = null;
    if (session_id) {
      activeSession = await db.orm.public.Sessions
        .where({ uuid: String(session_id) })
        .first();
      if (!activeSession) {
        activeSession = await db.orm.public.Sessions
          .where({ slug: String(session_id) })
          .first();
      }
      if (!activeSession) throw new NotFoundError("Session not found");
      if (activeSession.status === "closed") throw new ForbiddenError("Session is closed");
    }

    const question = await db.orm.public.Questions.create({
      title: validatedTitle,
      type: validatedType,
      options: formattedOptions,
      category: category ? String(category).trim() : null,
      user_id: userId,
      ...(activeSession ? { session_id: activeSession.uuid } : {}),
    });

    if (activeSession) {
      emitToSession(activeSession.uuid, "new_question", question);
      emitToSession(activeSession.slug, "new_question", question);
    }

    return res.status(201).json({
      success: true,
      message: "Question created successfully",
      question,
    });
  } catch (error) {
    return next(error);
  }
};


/**
 * GET /question/list
 * View all questions (with optional session_id, category, type, or user_id filter)
 */
export const getQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, type, user_id, session_id } = req.query;

    let query = db.orm.public.Questions;

    if (session_id && typeof session_id === "string") {
      query = query.where({ session_id: session_id.trim() });
    }

    if (category && typeof category === "string") {
      query = query.where({ category: category.trim() });
    }

    if (
      type &&
      typeof type === "string" &&
      (type === "open" || type === "multiple-choice")
    ) {
      query = query.where({ type });
    }

    if (user_id && typeof user_id === "string") {
      query = query.where({ user_id: user_id.trim() });
    }

    const questions = await query
      .orderBy((q) => q.createdAt.desc())
      .all();

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });

  } catch (error) {
    return next(error);
  }
};

/**
 * GET /questions/:uuid
 * View a single question by UUID along with its submitted answers
 */
export const getQuestionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const questionId = req.params.uuid || req.params.id;

    if (!questionId) {
      throw new BadRequestError("Question ID is required");
    }

    const question = await db.orm.public.Questions
      .where({ uuid: String(questionId) })
      .first();

    if (!question) {
      throw new NotFoundError("Question not found");
    }

    // Retrieve answers submitted for this question
    const answers = await db.orm.public.Answers
      .where({ question_id: String(questionId) })
      .orderBy((a) => a.submittedAt.desc())
      .all();

    return res.status(200).json({
      success: true,
      question,
      answers,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /questions/:uuid
 * Update an existing question
 */
export const updateQuestion = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const questionId = req.params.uuid || req.params.id;
    const currentUserId = req.user?.uuid;

    if (!questionId) {
      throw new BadRequestError("Question ID is required");
    }

    const existingQuestion = await db.orm.public.Questions
      .where({ uuid: String(questionId) })
      .first();

    if (!existingQuestion) {
      throw new NotFoundError("Question not found");
    }

    // Verify creator authorization if req.user is set
    if (currentUserId && existingQuestion.user_id !== currentUserId) {
      throw new ForbiddenError(
        "Forbidden: You are not authorized to update this question"
      );
    }

    const { title, type, options, category } = req.body;

    const updateData: {
      title?: string;
      type?: "open" | "multiple-choice";
      options?: string[] | null;
      category?: string | null;
    } = {};

    if (title !== undefined) {
      updateData.title = validateQuestionTitle(title);
    }

    const resolvedType = type !== undefined
      ? validateQuestionType(type)
      : (existingQuestion.type as "open" | "multiple-choice");

    if (type !== undefined) {
      updateData.type = resolvedType;
    }

    if (options !== undefined) {
      if (resolvedType === "multiple-choice") {
        updateData.options = validateMultipleChoiceOptions(options);
      } else {
        updateData.options = null;
      }
    } else if (type === "open") {
      updateData.options = null;
    }

    if (category !== undefined) {
      updateData.category = category ? String(category).trim() : null;
    }

    const updatedQuestion = await db.orm.public.Questions
      .where({ uuid: String(questionId) })
      .update(updateData);

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      question: updatedQuestion,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /questions/:uuid
 * Delete a question and its associated answers
 */
export const deleteQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const questionId = req.params.uuid || req.params.id;
    const currentUserId = req.user?.uuid;

    if (!questionId) {
      throw new BadRequestError("Question ID is required");
    }

    const existingQuestion = await db.orm.public.Questions
      .where({ uuid: String(questionId) })
      .first();

    if (!existingQuestion) {
      throw new NotFoundError("Question not found");
    }

    // Verify creator authorization if req.user is set
    if (currentUserId && existingQuestion.user_id !== currentUserId) {
      throw new ForbiddenError(
        "Forbidden: You are not authorized to delete this question"
      );
    }

    // Remove any submitted answers for this question first
    await db.orm.public.Answers
      .where({ question_id: String(questionId) })
      .deleteAll();

    // Delete the question
    await db.orm.public.Questions
      .where({ uuid: String(questionId) })
      .delete();

    if (existingQuestion.session_id) {
      emitToSession(existingQuestion.session_id, "question_deleted", { question_id: String(questionId) });
    }

    return res.status(200).json({
      success: true,
      message: "Question and associated answers deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
