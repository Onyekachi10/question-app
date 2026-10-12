import { checkUniqueUserFields, validateUserCredentials } from "@/server/config/errorHandler/user.error";
import { AuthError, NotFoundError } from "@/server/config/errorHandler";
import { setCookies, clearCookies } from "@/server/config/cookie";
import { userType } from "@/server/config/userType";
import { db } from "@/src/prisma/db";
import { NextFunction, Request, Response } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { AuthenticatedRequest } from "../Question/question.controller";

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const REFRESH_COOKIE_NAMES: Record<userType, string> = {
  creator: "creator_refresh_token",
  recipient: "recipient_refresh_token",
};

/**
 * Generate Access & Refresh tokens and attach them as secure HTTP-only cookies
 */
const setAuthTokensAndCookies = (
  res: Response,
  user: { uuid: string; userRole: string }
) => {
  const role = user.userRole as userType;

  const accessToken = jwt.sign(
    { uuid: user.uuid, userType: role },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { uuid: user.uuid, role },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: "7d" }
  );

  // Set access token cookie
  setCookies(res, "user_access_token", accessToken, ACCESS_TOKEN_EXPIRY_MS);

  // Set role-specific refresh token cookie
  const refreshCookieName = REFRESH_COOKIE_NAMES[role] || "creator_refresh_token";
  setCookies(res, refreshCookieName, refreshToken, REFRESH_TOKEN_EXPIRY_MS);

  return { accessToken, refreshToken };
};

export const createCreator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, userRole } = req.body;
    validateUserCredentials({ email, username, userRole: userRole || "creator" });

    await checkUniqueUserFields({ email, username });

    const user = await db.orm.public.Users.create({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      userRole: "creator",
    });

    const { accessToken } = setAuthTokensAndCookies(res, user);

    return res.status(201).json({
      success: true,
      message: "Creator created successfully",
      user
    });
  } catch (error) {
    return next(error);
  }
};

export const createRecipient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, userRole } = req.body;
    validateUserCredentials({ email, username, userRole: userRole || "recipient" });

    await checkUniqueUserFields({ email, username });

    const user = await db.orm.public.Users.create({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      userRole: "recipient",
    });

    const { accessToken } = setAuthTokensAndCookies(res, user);

    return res.status(201).json({
      success: true,
      message: "Recipient created successfully",
      user
    });
  } catch (error) {
    return next(error);
  }
};


export const updateUserRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.body.userRole;
    const user = req.user;

    if (!user) {
      throw new AuthError("User not found");
    }

    if (userRole === user.userRole) {
      throw new AuthError("User role is already set to " + userRole);
    }

    await db.orm.public.Users.where({ uuid: user.uuid}).update({userRole})

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
    })
  } catch (error) {
    return next(error);
  }
}

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, userRole } = req.body;
    validateUserCredentials({ email, username, userRole });

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Find user by unique email
    const user = await db.orm.public.Users
      .where({ email: cleanEmail })
      .first();

    if (!user) {
      throw new NotFoundError("No account found with this email");
    }

    if (user.username !== cleanUsername) {
      throw new AuthError("Invalid credentials: username does not match");
    }

    if (user.userRole !== userRole) {
      throw new AuthError(`Invalid credentials: user is registered as '${user.userRole}', not '${userRole}'`);
    }

    const { accessToken } = setAuthTokensAndCookies(res, user);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshCookie = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bearer = req.headers.authorization;
    const headerToken = bearer && bearer.startsWith("Bearer ") ? bearer.slice(7) : undefined;

    // Check creator, recipient, or authorization header token
    const token =
      req.cookies["creator_refresh_token"] ||
      req.cookies["recipient_refresh_token"] ||
      headerToken;

    if (!token) {
      throw new AuthError("Unauthorized: Refresh token missing");
    }

    let decoded: { uuid: string; role: userType };
    try {
      decoded = jwt.verify(
        token,
        process.env.REFRESH_TOKEN_SECRET!
      ) as { uuid: string; role: userType };
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new AuthError("Unauthorized: Refresh token expired. Please log in again");
      }
      throw new AuthError("Unauthorized: Invalid refresh token");
    }

    if (!decoded?.uuid || !decoded?.role) {
      throw new AuthError("Unauthorized: Invalid token payload");
    }

    // Verify user still exists in database
    const user = await db.orm.public.Users
      .where({ uuid: decoded.uuid })
      .first();

    if (!user) {
      throw new AuthError("Unauthorized: User account not found");
    }

    if (user.userRole !== decoded.role) {
      throw new AuthError("Unauthorized: User role mismatch. Please log in again");
    }

    // Reissue fresh access and refresh tokens & update cookies
    const { accessToken } = setAuthTokensAndCookies(res, user);

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully",
      user,
      accessToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Clear all access and refresh cookies
    clearCookies(res, "user_access_token");
    clearCookies(res, "creator_refresh_token");
    clearCookies(res, "recipient_refresh_token");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};