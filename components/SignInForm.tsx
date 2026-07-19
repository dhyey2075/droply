"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInForm() {
  return (
    <SignIn
      routing="path"
      path="/signin"
      signUpUrl="/signup"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
