import express, { Router } from "express";
import { isUserAuthenicated } from "../https/middleware/auth";
import { createAnswer, deleteAnswer, getAnswerById, getAnswersByQuestion, updateAnswer } from "../https/controller/Answer/answer.controller";
import { cacheMiddleware, clearCache } from "../https/service/cache";


export const answer: Router = express.Router();

answer.route("/question/:uuid/answer").post(isUserAuthenicated, clearCache("answer", "question", "session", "user"), createAnswer);
answer.route("/answer/:uuid").patch(isUserAuthenicated, clearCache("answer", "question", "session", "user"), updateAnswer);
answer.route("/question/:uuid/answers").get(isUserAuthenicated, cacheMiddleware(30, "answer"), getAnswersByQuestion);
answer.route("/answer/:uuid").get(isUserAuthenicated, cacheMiddleware(60, "answer"), getAnswerById);
answer.route("/answer/:uuid").delete(isUserAuthenicated, clearCache("answer", "question", "session", "user"), deleteAnswer);


export default answer;