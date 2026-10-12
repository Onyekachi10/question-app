import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "@/src/prisma/db";
import { AuthError, ForbiddenError } from "./errorHandler";

type roles = "creator" | "recipient"


const COOKIE_MAPS = {   
    creator : "creator_refresh_token",
    recipient : "recipient_refresh_token"
}

const fetchAccounts = async (role: roles, uuid: string) => {

    switch (role) {
        case "creator" : 
        return { key : "creators", account : await db.orm.public.Users.where({ uuid }).first() }
        case "recipient" : 
        return { key : "recipients", account : await db.orm.public.Users.where({ uuid }).first() }
    }
}

export const globalRefreshToken = async (req: any, res: Response, next: NextFunction, role: roles) => {
    try {

    const bearer = req.headers.authorization
    const headerToken = bearer && bearer.startsWith("Bearer ") ? bearer.slice(7) : undefined
    const token = req.cookies[COOKIE_MAPS[role]] || headerToken

    if (!token) return next(new AuthError("Unauthorized: token missing"));  


      const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { uuid: string; role: roles };

     if (!decoded?.role || !decoded?.uuid) return next(new AuthError("Unauthorized: invalid token payload"));
    
      const expectedCookie = COOKIE_MAPS[decoded.role];
    if (expectedCookie && req.cookies[expectedCookie] && req.cookies[expectedCookie] !== token) {
      return next(new AuthError("Unauthorized: token/role mismatch"));
    }

     const result = await fetchAccounts(decoded.role, decoded.uuid);

     if (!result.account) return next(new AuthError("Unauthorized: account not found"));

     req[result.key] = result.account;
     req.role = decoded.role

     return next()

    } catch (error : any) {
        if (error.name === "TokenExpiredError") {
      return next(new AuthError("Token expired"))
    }
    return next(new AuthError("Unauthorized: invalid token"))
    }
}

export const RequiredPosition = (...positions: roles[]) => (req: any, res: Response, next: NextFunction) => {
    if (!req.role) {
      return next(new ForbiddenError("Your session is no longer valid. Please log in again."));
    }

    if (!positions.includes(req.role)) {
      return next(new ForbiddenError("Forbidden: insufficient permissions"));
    }

    return next();
  };
