import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { getDashboard } from "@/lib/dashboard";
import { listExams } from "@/lib/exams";
import { uiText } from "@/lib/ui-text";
import { getSiteLang } from "@/lib/site-lang-server";
import BackLink from "@/components/BackLink";
import SignOutButton from "@/components/SignOutButton";
import Dashboard from "@/components/account/Dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const account = await getAccount();
  if (!account) redirect("/signin?callbackUrl=/account");

  const lang = getSiteLang();
  const T = uiText(lang);
  const user = await findUserById(account.id);
  // The cookie outlived the account (deleted, or a different database).
  if (!user) redirect("/signin");
  const data = await getDashboard(account.id, lang);

  const methods = [
    user.has_password && T.accountMethodPassword,
    user.has_google && "Google",
  ].filter(Boolean);

  return (
    <div className="account-page">
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

      <Dashboard data={data} examList={listExams(lang)} T={T} lang={lang} />
    </div>
  );
}
