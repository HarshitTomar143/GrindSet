"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ label }) {
  return (
    <button className="btn btn-ghost" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
      {label}
    </button>
  );
}
