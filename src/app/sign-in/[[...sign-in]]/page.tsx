import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function SignInPage() {
  return (
    <AuthLayout>
      {/* Invite-only: no "Sign up" link; invited people arrive at /sign-up from their email. */}
      <SignIn appearance={{ elements: { footerAction: { display: "none" } } }} />
    </AuthLayout>
  );
}
