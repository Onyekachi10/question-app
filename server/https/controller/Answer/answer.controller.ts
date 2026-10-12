import { Request, Response, NextFunction } from "express";
import { db } from "@/src/prisma/db";
import {
    AuthError,
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from "@/server/config/errorHandler";
import {
    validateAnswerPayload,
    validateAnswerForQuestionType,
} from "@/server/config/errorHandler/answer.validation";
import { AuthenticatedRequest } from "../Question/question.controller";
import { emitToSession } from "@/server/socket";


/**
 * POST /questions/:uuid/answers
 * Submit an answer to a question (recipients only).
 */
export const createAnswer = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const questionId = req.params.uuid || req.params.id;
        const userId = req.user?.uuid || req.body.user_id;

        if (!questionId) {
            throw new BadRequestError("Question ID is required");
        }

        if (!userId) {
            throw new AuthError("Unauthorized: User ID is required to submit an answer");
        }

        // Resolve the question
        const question = await db.orm.public.Questions
            .where({ uuid: String(questionId) })
            .first();

        if (!question) {
            throw new NotFoundError("Question not found");
        }

        // Validate payload shape
        const payload = validateAnswerPayload(req.body);

        // Validate payload against question type & allowed options
        validateAnswerForQuestionType(payload, question.type, question.options);

        const answer = await db.orm.public.Answers.create({
            question_id: String(questionId),
            user_id: userId,
            text_answer: payload.text_answer ?? null,
            selected_option: payload.selected_option ?? null,
        });

        // Notify session room in real-time
        if (question.session_id) {
            emitToSession(question.session_id, "new_answer", { question_id: String(questionId), answer });
        }

        return res.status(201).json({
            success: true,
            message: "Answer submitted successfully",
            answer,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /questions/:uuid/answers
 * View all answers for a specific question.
 */
export const getAnswersByQuestion = async (
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
            .select("uuid")
            .first();

        if (!question) {
            throw new NotFoundError("Question not found");
        }

        const answers = await db.orm.public.Answers
            .where({ question_id: String(questionId) })
            .orderBy((a) => a.submittedAt.desc())
            .all();

        return res.status(200).json({
            success: true,
            count: answers.length,
            answers,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /answers/:uuid
 * View a single answer by its own UUID.
 */
export const getAnswerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const answerId = req.params.uuid || req.params.id;

        if (!answerId) {
            throw new BadRequestError("Answer ID is required");
        }

        const answer = await db.orm.public.Answers
            .where({ uuid: String(answerId) })
            .first();

        if (!answer) {
            throw new NotFoundError("Answer not found");
        }

        return res.status(200).json({
            success: true,
            answer,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * PATCH /answers/:uuid
 * Update an existing answer (owner only).
 */
export const updateAnswer = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const answerId = req.params.uuid || req.params.id;
        const currentUserId = req.user?.uuid;

        if (!answerId) {
            throw new BadRequestError("Answer ID is required");
        }

        const existingAnswer = await db.orm.public.Answers
            .where({ uuid: String(answerId) })
            .first();

        if (!existingAnswer) {
            throw new NotFoundError("Answer not found");
        }

        if (currentUserId && existingAnswer.user_id !== currentUserId) {
            throw new ForbiddenError(
                "Forbidden: You are not authorized to update this answer"
            );
        }

        // Resolve the parent question to validate the updated payload
        const question = await db.orm.public.Questions
            .where({ uuid: String(existingAnswer.question_id) })
            .first();

        if (!question) {
            throw new NotFoundError("Parent question not found");
        }

        const payload = validateAnswerPayload(req.body);
        validateAnswerForQuestionType(payload, question.type, question.options);

        const updatedAnswer = await db.orm.public.Answers
            .where({ uuid: String(answerId) })
            .update({
                text_answer: payload.text_answer ?? null,
                selected_option: payload.selected_option ?? null,
            });

        if (question.session_id) {
            emitToSession(question.session_id, "answer_updated", { question_id: question.uuid, answer: updatedAnswer });
        }

        return res.status(200).json({
            success: true,
            message: "Answer updated successfully",
            answer: updatedAnswer,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * DELETE /answers/:uuid
 * Delete an answer (owner only).
 */
export const deleteAnswer = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const answerId = req.params.uuid || req.params.id;
        const currentUserId = req.user?.uuid;

        if (!answerId) {
            throw new BadRequestError("Answer ID is required");
        }

        const existingAnswer = await db.orm.public.Answers
            .where({ uuid: String(answerId) })
            .first();

        if (!existingAnswer) {
            throw new NotFoundError("Answer not found");
        }

        if (currentUserId && existingAnswer.user_id !== currentUserId) {
            throw new ForbiddenError(
                "Forbidden: You are not authorized to delete this answer"
            );
        }

        await db.orm.public.Answers
            .where({ uuid: String(answerId) })
            .delete();

        return res.status(200).json({
            success: true,
            message: "Answer deleted successfully",
        });
    } catch (error) {
        return next(error);
    }
};
