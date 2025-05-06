"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInForm() {
  return (
    <SignIn  fallbackRedirectUrl={"/dashboard"} />
  )
}
