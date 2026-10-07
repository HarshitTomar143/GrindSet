import AuthPage from "@/components/AuthPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function SignUpPage({ searchParams }) {
  return <AuthPage mode="signup" searchParams={searchParams} />;
}
