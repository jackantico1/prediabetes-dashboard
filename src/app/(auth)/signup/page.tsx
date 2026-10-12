import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </Suspense>
  );
}
