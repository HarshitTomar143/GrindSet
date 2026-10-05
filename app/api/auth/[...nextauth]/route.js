import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// next-auth's own endpoints: sign-in, the Google callback, sign-out, session.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
