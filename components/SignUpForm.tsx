"use client";

import { SignUp } from "@clerk/nextjs";
import { useClerkAppearance } from "@/components/clerk-appearance";

export default function SignUpForm() {
  const appearance = useClerkAppearance();
  return (
    <SignUp
      routing="path"
      path="/signup"
      signInUrl="/signin"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
      appearance={appearance}
    />
  );
}
