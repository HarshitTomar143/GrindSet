import AuthPage from "@/components/AuthPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }) {
  return <AuthPage mode="signin" searchParams={searchParams} />;
}
