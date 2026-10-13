import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
  checkPasswordLogin,
  findUserByGoogleSub,
  findUserByPhone,
  findUserByEmail,
  upsertGoogleUser,
  upsertPhoneUser,
  upsertEmailOtpUser,
  normalizeEmail,
  PASSWORD_MAX,
  NAME_MAX,
} from "./users";
import { otpTarget, verifyOtp, OTP_LENGTH } from "./otp";
import { phoneSignInEnabled } from "./sms";
import { emailOtpEnabled } from "./mail";
import { LIMITS, rateLimit, clearRateLimit } from "./rate-limit";

/**
 * Sign-in for candidates, built on next-auth: email + password always, Google
 * when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set, and a one-time code -
 * by SMS when a gateway is configured (lib/sms.js), by email when Resend is
 * (lib/mail.js). Sessions are
 * signed cookies (JWT), so no session table is needed.
 *
 * This is separate from the /admin panel, which keeps its own password
 * (lib/admin.js). Signing in is optional: a candidate can still sit a paper
 * by typing a name, exactly as before.
 */

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function otpChannelEnabled(channel) {
  if (channel === "phone") return phoneSignInEnabled();
  return channel === "email" && emailOtpEnabled();
}

export function authConfigured() {
  return Boolean(process.env.NEXTAUTH_SECRET);
}

// Slows password and code guessing: a handful of tries per email or number per
// window, counted in the database (lib/rate-limit.js).
async function tooManyAttempts(who) {
  return !(await rateLimit(LIMITS.login, who)).ok;
}

function clearAttempts(who) {
  return clearRateLimit(LIMITS.login, who);
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
      if (await tooManyAttempts(email)) throw new Error("TooManyAttempts");
      const user = await checkPasswordLogin(email, password);
      if (!user) return null;
      await clearAttempts(email);
      return { id: String(user.id), name: user.name, email: user.email, image: user.image };
    },
  }),
];

if (phoneSignInEnabled() || emailOtpEnabled()) {
  providers.push(
    CredentialsProvider({
      id: "otp",
      name: "One-time code",
      credentials: {
        channel: { label: "Channel", type: "text" },
        to: { label: "Mobile number or email", type: "text" },
        code: { label: "OTP", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const dest = otpTarget(credentials?.channel, credentials?.to);
        const code = String(credentials?.code || "").trim();
        if (!dest || !otpChannelEnabled(dest.channel)) return null;
        if (code.length !== OTP_LENGTH || !/^\d+$/.test(code)) return null;
        if (await tooManyAttempts(dest.target)) throw new Error("TooManyAttempts");

        const byPhone = dest.channel === "phone";
        // A first sign-in needs the candidate's name; ask before the code is
        // spent, so the same code still works once the name is filled in.
        const name = String(credentials?.name || "").trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
        if (!name) {
          const existing = byPhone ? await findUserByPhone(dest.to) : await findUserByEmail(dest.to);
          if (!existing) throw new Error("NameRequired");
        }

        if (!(await verifyOtp(dest.target, code))) return null;
        const user = byPhone
          ? await upsertPhoneUser({ phone: dest.to, name })
          : await upsertEmailOtpUser({ email: dest.to, name });
        await clearAttempts(dest.target);
        return { id: String(user.id), name: user.name, email: user.email || undefined, image: user.image };
      },
    })
  );
}

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
