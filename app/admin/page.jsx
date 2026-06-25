import { cookies } from "next/headers";
import { isTokenValid, adminConfigured, ADMIN_COOKIE } from "@/lib/admin";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  if (!adminConfigured()) {
    return (
      <div>
        <h1 className="page-title">Admin not configured</h1>
        <p className="page-sub">
          Set <code>ADMIN_PASSWORD</code> in your <code>.env.local</code> file and
          restart the app to enable the admin panel.
        </p>
      </div>
    );
  }

  const authed = isTokenValid(cookies().get(ADMIN_COOKIE)?.value);
  return authed ? <AdminDashboard /> : <AdminLogin />;
}
