import { ConflictError, emailRegex, usernameRegex, ValidationError } from ".";
import { userType } from "../userType";
import { db } from "@/src/prisma/db";

export const validateUserCredentials = (data: {email : string , username : string, userRole: userType}) => {
    const {email , username, userRole} = data

    if (!emailRegex.test(email)) {
        throw new ValidationError("Invalid Email: Please enter a valid email address");
    }

    if (!usernameRegex.test(username)) {
        throw new ValidationError("Invalid Username: Username must be between 3 and 30 characters long and can only contain letters, numbers, and underscores");
    }

    if (userRole !== "creator" && userRole !== "recipient") {
        throw new ValidationError("Invalid User Role: User role must be 'creator' or 'recipient'");
    }
};

/**
 * Validates that unique identity fields (email, username) are not already taken
 * in the Users table. Throws a user-friendly ConflictError (409) if duplicate.
 */
export const checkUniqueUserFields = async (params: {
    email?: string;
    username?: string;
    excludeUuid?: string;
}) => {
    const { email, username, excludeUuid } = params;

    // 1. Check email uniqueness
    if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        const userWithEmail = await db.orm.public.Users
            .where({ email: cleanEmail })
            .select('uuid')
            .first();

        if (userWithEmail && (!excludeUuid || userWithEmail.uuid !== excludeUuid)) {
            throw new ConflictError(`An account with the email '${email.trim()}' already exists. Please use a different email.`);
        }
    }

    // 2. Check username uniqueness
    if (username && username.trim()) {
        const cleanUsername = username.trim();
        const userWithUsername = await db.orm.public.Users
            .where({ username: cleanUsername })
            .select('uuid')
            .first();

        if (userWithUsername && (!excludeUuid || userWithUsername.uuid !== excludeUuid)) {
            throw new ConflictError(`The username '${cleanUsername}' is already taken. Please choose a different username.`);
        }
    }
};