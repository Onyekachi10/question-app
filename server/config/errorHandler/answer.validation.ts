import { ValidationError } from ".";

export interface AnswerPayload {
    text_answer?: string | null;
    selected_option?: string | null;
}

/**
 * Validates that at least one answer field is provided and that both
 * are not supplied at the same time (open vs multiple-choice separation
 * is enforced at the controller level once the question type is known).
 * Returns the cleaned payload ready for DB insertion/update.
 */
export function validateAnswerPayload(body: {
    text_answer?: unknown;
    selected_option?: unknown;
}): AnswerPayload {
    const text = typeof body.text_answer === "string" ? body.text_answer.trim() : null;
    const option = typeof body.selected_option === "string" ? body.selected_option.trim() : null;

    if (!text && !option) {
        throw new ValidationError(
            "An answer must include either 'text_answer' or 'selected_option'"
        );
    }

    if (text && option) {
        throw new ValidationError(
            "Provide either 'text_answer' or 'selected_option', not both"
        );
    }

    return {
        text_answer: text || null,
        selected_option: option || null,
    };
}

/**
 * Validates that the provided answer is appropriate for the question type.
 * - 'open'             → requires text_answer, rejects selected_option
 * - 'multiple-choice'  → requires selected_option, rejects text_answer
 */
export function validateAnswerForQuestionType(
    payload: AnswerPayload,
    questionType: string,
    allowedOptions: readonly string[] | null
): void {
    if (questionType === "open") {
        if (!payload.text_answer) {
            throw new ValidationError(
                "Open questions require a 'text_answer'"
            );
        }
        if (payload.selected_option) {
            throw new ValidationError(
                "Open questions do not accept a 'selected_option'"
            );
        }
    }

    if (questionType === "multiple-choice") {
        if (!payload.selected_option) {
            throw new ValidationError(
                "Multiple-choice questions require a 'selected_option'"
            );
        }
        if (payload.text_answer) {
            throw new ValidationError(
                "Multiple-choice questions do not accept a 'text_answer'"
            );
        }
        if (allowedOptions && !allowedOptions.includes(payload.selected_option)) {
            throw new ValidationError(
                `Invalid option. Allowed options are: ${allowedOptions.join(", ")}`
            );
        }
    }
}
