import { redirect } from "next/navigation";
import { getAccount, googleEnabled, authConfigured, safeCallbackPath } from "@/lib/auth";
import { uiText } from "@/lib/ui-text";
import { getSiteLang } from "@/lib/site-lang-server";
import BackLink from "@/components/BackLink";
import { phoneSignInEnabled } from "@/lib/sms";
import { emailOtpEnabled } from "@/lib/mail";
import AuthForm from "@/components/AuthForm";

// The body of /signin and /signup. Anyone already signed in is sent on to
// where they were going.

// next-auth puts its own error code in ?error= when a sign-in bounces back.
function errorFromQuery(code, T) {
  if (!code) return "";
  if (code === "CredentialsSignin") return T.authErrCredentials;
  if (code === "TooManyAttempts") return T.authErrTooMany;
  return T.authErrGoogle;
}

export default async function AuthPage({ mode, searchParams }) {
  const callbackUrl = safeCallbackPath(searchParams?.callbackUrl, "/");
  if (await getAccount()) redirect(callbackUrl);

  const lang = getSiteLang();
  const T = uiText(lang);
  const isSignUp = mode === "signup";

  return (
    <div className="auth-page">
      <BackLink href="/" label={T.home} />
      <h1 className="page-title">{isSignUp ? T.authSignUpTitle : T.authSignInTitle}</h1>
      <p className="page-sub">{T.authSub}</p>

      {authConfigured() ? (
        <AuthForm
          mode={mode}
          googleOn={googleEnabled()}
          phoneOn={phoneSignInEnabled()}
          emailOtpOn={emailOtpEnabled()}
          callbackUrl={callbackUrl}
          initialError={errorFromQuery(searchParams?.error, T)}
          text={{
            google: T.authGoogle,
            or: T.authOr,
            name: T.authName,
            nameHint: T.authNameHint,
            email: T.authEmail,
            password: T.authPassword,
            passwordHint: T.authPasswordHint,
            signIn: T.signIn,
            signUp: T.signUp,
            working: T.authWorking,
            noAccount: T.authNoAccount,
            haveAccount: T.authHaveAccount,
            methodPassword: T.authMethodPassword,
            methodEmailOtp: T.authMethodEmailOtp,
            emailOtpHint: T.authEmailOtpHint,
            methodPhone: T.authMethodPhone,
            phone: T.authPhone,
            phoneHint: T.authPhoneHint,
            sendOtp: T.authSendOtp,
            otp: T.authOtp,
            // Templates: the form fills in the address and the countdown.
            otpSent: T.authOtpSent("{to}"),
            verify: T.authVerify,
            resend: T.authResend,
            resendIn: T.authResendIn("{n}"),
            change: T.authChange,
            errors: {
              credentials: T.authErrCredentials,
              exists: T.authErrExists,
              google: T.authErrGoogleAccount,
              tooMany: T.authErrTooMany,
              name: T.authErrName,
              email: T.authErrEmail,
              password: T.authErrPassword,
              phone: T.authErrPhone,
              otp: T.authErrOtp,
              otpWait: T.authErrOtpWait,
              sms: T.authErrSms,
              mail: T.authErrMail,
              generic: T.authErrGeneric,
              unavailable: T.authErrGeneric,
            },
          }}
        />
      ) : (
        <div className="q-card auth-card">
          <p style={{ margin: 0 }}>
            Sign-in is not configured: set <code>NEXTAUTH_SECRET</code> (and{" "}
            <code>NEXTAUTH_URL</code>) in the environment. See <code>.env.example</code>.
          </p>
        </div>
      )}

      <p className="auth-note">{T.authOptionalNote}</p>
    </div>
  );
}
