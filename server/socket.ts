import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

let io: SocketIOServer | null = null;

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
];

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    // Client joins a session room
    socket.on("join_session", ({ sessionId, slug }: { sessionId?: string; slug?: string }) => {
      if (sessionId) {
        socket.join(`session:${sessionId}`);
      }
      if (slug) {
        socket.join(`session:${slug}`);
      }
    });

    // Client leaves a session room
    socket.on("leave_session", ({ sessionId, slug }: { sessionId?: string; slug?: string }) => {
      if (sessionId) {
        socket.leave(`session:${sessionId}`);
      }
      if (slug) {
        socket.leave(`session:${slug}`);
      }
    });

    socket.on("disconnect", () => {
      // socket disconnected
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

/**
 * Emits an event to a session room identified by either its UUID or slug.
 */
export const emitToSession = (identifier: string, event: string, data: any) => {
  if (!io) return;
  io.to(`session:${identifier}`).emit(event, data);
};
