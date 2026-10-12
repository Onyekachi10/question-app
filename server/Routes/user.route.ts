import express, { Router } from "express";
import { isUserAuthenicated } from "../https/middleware/auth";
import {
  createSession,
  getSessionBySlug,
  joinSession,
  closeSession,
  switchRole,
  getDashboard,
  getSessionMessages,
} from "../https/controller/Session/session.controller";
import {
  createCreator,
  createRecipient,
  loginUser,
  logoutUser,
  refreshCookie,
  updateUserRole,
} from "../https/controller/Auth/user.controller";
import { authRateLimiter } from "../https/service/ratelimit";
import { cacheMiddleware, clearCache } from "../https/service/cache";


export const user: Router = express.Router();

// ─── Auth ──────────────────────────────────────────────────────────────────────
user.route("/create/creator").post(authRateLimiter, createCreator);
user.route("/create/recipient").post(authRateLimiter, createRecipient);
user.route("/login").post(authRateLimiter, loginUser);
user.route("/refresh").post(refreshCookie);
user.route("/logout").post(isUserAuthenicated, clearCache("user"), logoutUser);
user.route("/role").patch(isUserAuthenicated, clearCache("user"), updateUserRole);

// ─── Dashboard ────────────────────────────────────────────────────────────────
user.route("/dashboard").get(isUserAuthenicated, cacheMiddleware(60, "user"), getDashboard);

// ─── Sessions ─────────────────────────────────────────────────────────────────
user.route("/session/create").post(isUserAuthenicated, clearCache("session", "user"), createSession);
user.route("/session/:slug").get(isUserAuthenicated, cacheMiddleware(60, "session"), getSessionBySlug);
user.route("/session/:slug/join").post(isUserAuthenicated, clearCache("session", "user"), joinSession);
user.route("/session/:slug/close").post(isUserAuthenicated, clearCache("session", "user"), closeSession);
user.route("/session/:slug/switch-role").post(isUserAuthenicated, clearCache("session", "user"), switchRole);
user.route("/session/:slug/messages").get(isUserAuthenicated, cacheMiddleware(30, "session"), getSessionMessages);


export default user;