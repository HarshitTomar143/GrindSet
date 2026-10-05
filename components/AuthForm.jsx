"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/**
 * The sign-in and sign-up form. One component for both: sign-up adds the name
 * field and creates the account first, then signs in the same way.
 *
 * `text` is plain strings resolved on the server (a server component cannot
 * hand a client one the functions in lib/ui-text.js). `callbackUrl` has
 * already been checked to be a path on this site.
 */
export default function AuthForm({ mode, text, googleOn, callbackUrl, initialError }) {
  const isSignUp = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);

  const fail = (code) => {
    setError(text.errors[code] || text.errors.generic);
    setBusy(false);
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      if (isSignUp) {
        const res = await fetch("/api/account/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return fail(data.error);
        }
      }

      const result = await signIn("credentials", { redirect: false, email, password });
      if (!result || result.error) {
        return fail(result?.error === "TooManyAttempts" ? "tooMany" : "credentials");
      }
      // A full navigation, so every server-rendered part picks up the session.
      window.location.assign(callbackUrl);
    } catch {
      fail("generic");
    }
  }

  const other = isSignUp ? "/signin" : "/signup";
  const otherHref =
    callbackUrl && callbackUrl !== "/"
      ? `${other}?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : other;

  return (
    <div className="auth-card q-card">
      {googleOn && (
        <>
          <button
            type="button"
            className="auth-google"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              signIn("google", { callbackUrl });
            }}
          >
            <span className="auth-google-mark" aria-hidden="true">G</span>
            {text.google}
          </button>
          <div className="auth-or">
            <span>{text.or}</span>
          </div>
        </>
      )}

      <form onSubmit={onSubmit} noValidate>
        {isSignUp && (
          <>
            <label className="field-label" htmlFor="auth-name">
              {text.name}
            </label>
            <input
              id="auth-name"
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={80}
              required
            />
            <p className="auth-hint">{text.nameHint}</p>
          </>
        )}

        <label className="field-label" htmlFor="auth-email">
          {text.email}
        </label>
        <input
          id="auth-email"
          className="text-input"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          required
        />

        <label className="field-label auth-gap" htmlFor="auth-password">
          {text.password}
        </label>
        <input
          id="auth-password"
          className="text-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={isSignUp ? 8 : undefined}
          required
        />
        {isSignUp && <p className="auth-hint">{text.passwordHint}</p>}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="btn auth-submit"
          type="submit"
          disabled={busy || !email.trim() || !password || (isSignUp && !name.trim())}
        >
          {busy ? text.working : isSignUp ? text.signUp : text.signIn}
        </button>
      </form>

      <p className="auth-switch">
        {isSignUp ? text.haveAccount : text.noAccount}{" "}
        <a href={otherHref}>{isSignUp ? text.signIn : text.signUp}</a>
      </p>
    </div>
  );
}
