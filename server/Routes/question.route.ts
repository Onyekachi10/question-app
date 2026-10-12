import express, { Router } from "express";
import { isUserAuthenicated } from "../https/middleware/auth";
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  updateQuestion,
} from "../https/controller/Question/question.controller";
import { cacheMiddleware, clearCache } from "../https/service/cache";


export const question: Router = express.Router();

question.route("/create").post(isUserAuthenicated, clearCache("question", "session", "user"), createQuestion);
question.route("/update/:uuid").patch(isUserAuthenicated, clearCache("question", "session", "user"), updateQuestion);
question.route("/delete/:uuid").delete(isUserAuthenicated, clearCache("question", "session", "user"), deleteQuestion);
question.route("/question/:uuid").get(isUserAuthenicated, cacheMiddleware(60, "question"), getQuestionById);
// GET /question/list?session_id=&category=&type=&user_id=
question.route("/list").get(isUserAuthenicated, cacheMiddleware(30, "question"), getQuestions);


export default question;