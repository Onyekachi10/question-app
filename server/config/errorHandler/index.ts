
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: any;



constructor(message:string, statusCode:number, isOperational = true, details?: any){
    super(message);
       this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;

        Error.captureStackTrace(this)
}

}

export const emailRegex = /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_'+\-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i
export const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/

export class NotFoundError extends AppError{
    constructor(message = "Resources Not Found"){
        super(message, 404);
    }
}

export class ValidationError extends AppError{
    constructor(message = "Invalid Requested Data", details?: any){
        super(message, 400, true, details);
    }
}


export class AuthError extends AppError{
    constructor(message = "Unautorized"){
        super(message, 401)
    }
}

export class ForbiddenError extends AppError{
    constructor(message = "Forbidden Access"){
        super(message, 403)
    }
}


export class BadRequestError extends AppError{
    constructor(message = "Bad Request", details?: any){
        super(message, 400, true, details)
    }
}

export class ConflictError extends AppError{
    constructor(message = "Conflict: Resource already exists", details?: any){
        super(message, 409, true, details);
    }
}


export class DatabaseError extends AppError{
    constructor(message = "Database Error", details?: any){
        super(message, 500, true, details);
    }
}

export class RateLimitError extends AppError{
    constructor(message = "Too many requests, please try again later", details?: any){
        super(message, 429, true, details);
    }
}