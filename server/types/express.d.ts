import { protectedUser, userType } from '../config/userType';

declare global {
    namespace Express {
        interface Request {
            user?: protectedUser;
            role?: userType;
        }
    }
}
