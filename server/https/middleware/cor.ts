
import cors from "cors";

export const ProtectMiddleware = () => {

 return cors({
    optionsSuccessStatus: 204,
    credentials: true,
    origin: [
      "http://localhost:3001", "http://127.0.0.1:3001",
      "http://localhost:3000", "http://127.0.0.1:3000",
      "http://localhost:3002", "http://127.0.0.1:3002",
    ],
    methods : ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders : ["Content-Type", "Authorization"]
 })

    
}