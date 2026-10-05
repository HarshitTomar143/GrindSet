import { firstLetter } from "@/lib/subjects";

/**
 * The header's account control: the candidate's initial (or Google picture)
 * linking to their account when signed in, a "Sign in" link when not.
 * Rendered on the server, so it is right on first paint with no flicker.
 */
export default function AccountButton({ account, T }) {
  if (account) {
    return (
      <a className="account-chip" href="/account" title={account.name} aria-label={T.account}>
        {account.image ? (
          <img src={account.image} alt="" width="38" height="38" referrerPolicy="no-referrer" />
        ) : (
          <span>{firstLetter(account.name)}</span>
        )}
      </a>
    );
  }
  return (
    <a className="account-chip account-signin" href="/signin" aria-label={T.signIn}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.600-6 8-6s8 2 8 6" />
      </svg>
      <span className="account-signin-text">{T.signIn}</span>
    </a>
  );
}
