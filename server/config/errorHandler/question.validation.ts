import { ValidationError } from ".";

export type QuestionType = "open" | "multiple-choice";

/**
 * Validates and returns the trimmed question title.
 * Throws ValidationError if blank or not a string.
 */
export function validateQuestionTitle(title: unknown): string {
    if (!title || typeof title !== "string" || !title.trim()) {
        throw new ValidationError("Question title is required and cannot be empty");
    }
    return title.trim();
}

/**
 * Validates that the question type is a recognised value.
 * Throws ValidationError otherwise.
 */
export function validateQuestionType(type: unknown): QuestionType {
    if (!type || (type !== "open" && type !== "multiple-choice")) {
        throw new ValidationError(
            "Invalid question type: must be 'open' or 'multiple-choice'"
        );
    }
    return type as QuestionType;
}

/**
 * Validates and formats the options array for multiple-choice questions.
 * Returns a cleaned string[] with at least 2 non-empty items.
 * Throws ValidationError on any violation.
 */
export function validateMultipleChoiceOptions(options: unknown): string[] {
    if (!Array.isArray(options) || options.length < 2) {
        throw new ValidationError(
            "Multiple-choice questions require an array of at least 2 options"
        );
    }

    const cleaned = (options as unknown[])
        .map((opt) => String(opt).trim())
        .filter(Boolean);

    if (cleaned.length < 2) {
        throw new ValidationError(
            "Multiple-choice questions require at least 2 non-empty options"
        );
    }

    return cleaned;
}

/**
 * Convenience wrapper: validates options only when the resolved type is
 * 'multiple-choice'. Returns the formatted options array or null for 'open'.
 */
export function validateOptions(
    type: QuestionType,
    options: unknown
): string[] | null {
    if (type === "multiple-choice") {
        return validateMultipleChoiceOptions(options);
    }
    return null;
}
