import { Request, Response, NextFunction } from "express"
import { AppError } from "../../config/errorHandler/index";


export const errorMiddleware = (err : Error, req : Request, res : Response, next : NextFunction) => {

    if (err instanceof AppError) {
        console.log(`Error ${req.method} ${req.url} - ${err.message}`)

        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.details && { details: err.details })
        });
    }

    // Handle Prisma unique constraint violation (P2002)
    if ((err as any)?.code === 'P2002') {
        const target = (err as any)?.meta?.target;
        let fieldName = 'field';
        if (Array.isArray(target) && target.length > 0) {
            fieldName = target.join(', ');
        } else if (typeof target === 'string') {
            fieldName = target;
        }

        let cleanMessage = `An account or record with this ${fieldName} already exists. Please choose a different ${fieldName}.`;
        const lowerField = fieldName.toLowerCase();
        if (lowerField.includes('email')) {
            cleanMessage = 'An account with this email address already exists. Please use a different email.';
        } else if (lowerField.includes('username')) {
            cleanMessage = 'The username is already taken. Please choose a different username.';
        } 

        return res.status(409).json({
            success: false,
            message: cleanMessage,
            field: fieldName
        });
    }

    const isProduction = process.env.NODE_ENV === "production";

    return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: (!isProduction && (err as any)?.message) || "Something went wrong. Please try again later."
    });

}