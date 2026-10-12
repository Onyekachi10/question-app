import { NextFunction, Request, Response } from "express";
import jwt, { TokenExpiredError } from 'jsonwebtoken'
import { AuthError, ForbiddenError } from "../../config/errorHandler/index";
import { protectedUser, userJWT, userType } from "@/server/config/userType";
import { db } from "../../../src/prisma/db"


const verifyUser = async (
    req: Request & { user?: protectedUser; role?: userType },
    res: Response,
    next: NextFunction,
    allowedRole: string[]
) => {

    try {

        const bearer = req.headers.authorization
        const headerToken = typeof bearer === 'string' && bearer.startsWith("Bearer ") ? bearer.slice(7) : undefined
        const token = req.cookies['user_access_token'] || headerToken

        if (!token) return next(new AuthError("Unauthorized: Invalid Token!"))


        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as Partial<userJWT> & { uuid?: string }
        if (!decoded || !decoded.uuid) return next(new AuthError("Unauthorized: Invalid Token!"))

        const user = await db.orm.public.Users.
            where({ uuid: decoded.uuid }).select('uuid', 'email', 'username', 'userRole')
            .first()

        if (!user) return next(new AuthError("Unauthorized: Invalid Token!"))

        // Reject if token role claim is stale (role changed in DB since token was issued)
        if (decoded.userType && decoded.userType !== user.userRole) {
            return next(new ForbiddenError("Forbidden: token role mismatch — please log in again"));
        }

        // Authorize against the persisted DB role (single source of truth)
        if (!allowedRole.includes(user.userRole as userType)) return next(new ForbiddenError("Forbidden: insufficient role"))

        req.user = user as protectedUser
        req.role = user.userRole as userType

        return next()

    } catch (error) {
        if (error instanceof TokenExpiredError) {
            return next(new AuthError("Unauthorized: Token Expired!"))
        }
        return next(new AuthError("Unauthorized: Invalid Token!"))
    }

}

export const isUserAuthenicated = (
    req: Request & { user?: protectedUser; role?: userType },
    res: Response,
    next: NextFunction
) => {
    verifyUser(req, res, next, ['creator', 'recipient'])
}