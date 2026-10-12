import { Response } from "express"

/**
 * Set an httpOnly secure cookie.
 * @param maxAgeMs  Optional. Milliseconds until cookie expiry.
 *                  Omit (or pass undefined) for a session-scoped cookie
 *                  that is wiped when the browser tab/window closes.
 */
export const setCookies = (res: Response, name: string, value: string, maxAgeMs?: number) => {
    const isProduction = process.env.NODE_ENV === "production"

    res.cookie(name, value, {
      httpOnly: true,
      secure : isProduction,
      sameSite : isProduction ? "none" : "lax",
      ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {})
    })
} 

export const clearCookies = (res: Response, name: string) => {
    const isProduction = process.env.NODE_ENV === "production"

    res.clearCookie(name, {
      httpOnly: true,
      secure : isProduction,
      sameSite : isProduction ? "none" : "lax",
    })
}