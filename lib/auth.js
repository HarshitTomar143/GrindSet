import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
  checkPasswordLogin,
  findUserByGoogleSub,
  upsertGoogleUser,
  normalizeEmail,
  PASSWORD_MAX,
} from "./users";

/**
 * Sign-in for candidates, built on next-auth: email + password always, and
 * Google when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set. Sessions are
 * signed cookies (JWT), so no session table is needed.
 *
 * This is separate from the /admin panel, which keeps its own password
 * (lib/admin.js). Signing in is optional: a candidate can still sit a paper
 * by typing a name, exactly as before.
 */

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function authConfigured() {
  return Boolean(process.env.NEXTAUTH_SECRET);
}

// Slows password guessing: a handful of tries per email per window. Held in
// memory, so it is per server process - a brake, not a wall. Put a shared
// store or the host's own rate limiting in front if that ever matters.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRIES = 8;
const attempts = new Map(); // key -> { count, first }

export function tooManyAttempts(key) {
  const now = Date.now();
  const hit = attempts.get(key);
  if (!hit || now - hit.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) if (now - v.first > WINDOW_MS) attempts.delete(k);
    }
    return false;
  }
  hit.count += 1;
  return hit.count > MAX_TRIES;
}

function clearAttempts(key) {
  attempts.delete(key);
}

const providers = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = normalizeEmail(credentials?.email);
      const password = String(credentials?.password || "");
      if (!email || !password || password.length > PASSWORD_MAX) return null;
      if (tooManyAttempts(`login:${email}`)) throw new Error("TooManyAttempts");
      const user = await checkPasswordLogin(email, password);
      if (!user) return null;
      clearAttempts(`login:${email}`);
      return { id: String(user.id), name: user.name, email: user.email, image: user.image };
    },
  }),
];

if (googleEnabled()) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // Only an address Google has verified may create or link an account.
      if (!profile?.email || profile.email_verified !== true) return false;
      await upsertGoogleUser({
        sub: account.providerAccountId,
        email: normalizeEmail(profile.email),
        name: profile.name,
        picture: profile.picture,
      });
      return true;
    },
    async jwt({ token, user, account }) {
      // Runs with `account` only at sign-in; afterwards the token is reused.
      if (account?.provider === "google") {
        const row = await findUserByGoogleSub(account.providerAccountId);
        if (row) {
          token.uid = String(row.id);
          token.name = row.name;
          token.email = row.email;
          token.picture = row.image;
        }
      } else if (user) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.uid || null;
      return session;
    },
  },
};

/**
 * The signed-in candidate as { id, name, email, image }, or null. Safe to call
 * from any server component or route; never throws, so a page still renders
 * (signed out) if auth is not configured yet.
 */
export async function getAccount() {
  if (!authConfigured()) return null;
  try {
    const session = await getServerSession(authOptions);
    const u = session?.user;
    if (!u?.id) return null;
    return { id: Number(u.id), name: u.name || "", email: u.email || "", image: u.image || null };
  } catch {
    return null;
  }
}

/** Only ever send someone back to a path on this site after signing in. */
export function safeCallbackPath(value, fallback = "/") {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) {
    return fallback;
  }
  return v;
}
