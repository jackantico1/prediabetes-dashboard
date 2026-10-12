import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" googleEnabled={googleEnabled} />
    </Suspense>
  );
}
