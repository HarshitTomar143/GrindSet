import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { getUserSubmissions } from "@/lib/submissions";
import { uiText } from "@/lib/ui-text";
import { getSiteLang } from "@/lib/site-lang-server";
import BackLink from "@/components/BackLink";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export default async function AccountPage() {
  const account = await getAccount();
  if (!account) redirect("/signin?callbackUrl=/account");

  const lang = getSiteLang();
  const T = uiText(lang);
  const user = await findUserById(account.id);
  // The cookie outlived the account (deleted, or a different database).
  if (!user) redirect("/signin");
  const results = await getUserSubmissions(account.id, 30);

  const methods = [
    user.has_password && T.accountMethodPassword,
    user.has_google && "Google",
  ].filter(Boolean);

  return (
    <div className="auth-page account-page">
      <BackLink href="/" label={T.home} />
      <h1 className="page-title">{T.account}</h1>

      <div className="q-card account-card">
        <div className="account-id">
          <div className="account-name">{user.name}</div>
          <div className="account-email">{user.email}</div>
          <div className="muted-sm">
            {T.accountSignsInWith} {methods.join(" · ")}
          </div>
        </div>
        <SignOutButton label={T.signOut} />
      </div>

      <h2 className="strip-title">{T.accountResults}</h2>
      {results.length === 0 ? (
        <p className="page-sub">{T.accountNoResults}</p>
      ) : (
        <div className="account-results">
          {results.map((r) => (
            <div className="account-result" key={r.id}>
              <div className="account-result-main">
                <div className="account-result-title">
                  {r.subject_name} · {T.mockPaper(r.mock_num)}
                </div>
                <div className="muted-sm">
                  {r.section_name} · {dateFmt.format(new Date(r.created_at))}
                </div>
              </div>
              <div className="account-result-score">
                <b>{r.percentage}%</b>
                <span className="muted-sm">
                  {r.correct}/{r.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
