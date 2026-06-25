import crypto from "crypto";

export const ADMIN_COOKIE = "admin_token";

export function adminConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

export function expectedToken() {
  return crypto
    .createHash("sha256")
    .update(process.env.ADMIN_PASSWORD || "")
    .digest("hex");
}

export function checkPassword(pw) {
  return adminConfigured() && typeof pw === "string" && pw === process.env.ADMIN_PASSWORD;
}

export function isTokenValid(token) {
  return adminConfigured() && !!token && token === expectedToken();
}
