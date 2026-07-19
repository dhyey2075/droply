"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpForm() {
  return (
    <SignUp
      routing="path"
      path="/signup"
      signInUrl="/signin"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
