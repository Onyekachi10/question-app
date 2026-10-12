export type userType ='creator' | 'recipient'

export interface protectedUser {
   uuid : string,
   email : string,
   username : string,
   userRole : userType,
}

export interface userJWT{
   uuid : string,
   userType : userType,
   iat?: number;
   exp?: number
}