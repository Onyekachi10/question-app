import express, { Response } from "express";
import http from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { ProtectMiddleware } from "./https/middleware/cor";
import { errorMiddleware } from "./https/middleware/error";
import { initSocket } from "./socket";
import user from "./Routes/user.route";
import answer from "./Routes/answer.route";
import question from "./Routes/question.route";
import { globalRateLimiter } from "./https/service/ratelimit";

const HOST = "0.0.0.0";
const PORT = parseInt(process.env.PORT || "6001", 10);

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(cookieParser());

app.use(ProtectMiddleware());
app.use(globalRateLimiter)

app.get("/", (req, res: Response) => {
  res.send({ message: "Hello API" });
});

app.use("/users", user);
app.use("/answer", answer);
app.use("/question", question);

app.use(errorMiddleware);

server.listen(PORT, HOST, () => {
  console.log(`Server is live on http://${HOST}:${PORT} (with WebSockets)`);
});