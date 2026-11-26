"use client";

import { SignIn } from "@clerk/nextjs";
import { useClerkAppearance } from "@/components/clerk-appearance";

export default function SignInForm() {
  const appearance = useClerkAppearance();
  return (
    <SignIn
      routing="path"
      path="/signin"
      signUpUrl="/signup"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
      appearance={appearance}
    />
  );
}
