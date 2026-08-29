import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RequestPasswordResetForm } from "@/components/auth/password-recovery-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <RequestPasswordResetForm />
    </AuthPageShell>
  );
}
