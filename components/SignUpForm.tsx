"use client";
import { signUpSchema } from "@/schemas/signUpSchema";
import { useSignUp } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import {
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function SignUpForm() {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, isLoaded, setActive } = useSignUp();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirmation: ""
    } //enter for which value it does not validate the fields
  });

  const onSubmit = async (data: z.infer<typeof signUpSchema>) => {
    if (!isLoaded) return;
    setIsSubmitting(true);
    setAuthError(null);
    try {
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      })
      setIsVerifying(true)
    } catch (error: Error | unknown) {
      console.log("Sign up error", error);
      const clerkError = error as { errors?: Array<{ message: string }> }
      setAuthError(
        clerkError.errors?.[0]?.message ||
        "An error occurred during sign-up. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setIsVerifying(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      console.log("Result", result);

      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId
        });
        router.push("/dashboard");
      } else {
        setAuthError("Invalid verification code. Please try again.");
        setVerificationError(
          "Invalid verification code. Please try again."
        );
      }
    } catch (error: Error | unknown) {
      console.log("Verification error", error);
      const clerkError = error as { errors?: Array<{ message: string }> }
      setVerificationError(
        clerkError.errors?.[0]?.message ||
        "An error occurred during verification. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <Card className="w-full max-w-md border border-indigo-100 bg-white shadow-2xl rounded-xl overflow-hidden">
        <CardHeader className="flex flex-col gap-2 items-center pb-4 pt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <h1 className="text-3xl font-bold">Verify Your Email</h1>
            <p className="text-indigo-100 text-center">
            We have sent a verification code to your email
            </p>
        </CardHeader>

        <Divider className="opacity-10" />

        <CardBody className="py-8 px-6">
          {verificationError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{verificationError}</p>
            </div>
          )}

          <form onSubmit={handleVerificationSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="verificationCode"
                className="text-sm font-medium text-gray-700"
              >
                Verification Code
              </label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="Enter the 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              color="primary"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium"
              isLoading={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Did not receive a code?{" "}
              <button
                onClick={async () => {
                  if (signUp) {
                    await signUp.prepareEmailAddressVerification({
                      strategy: "email_code"
                    });
                  }
                }}
                className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
              >
                Resend code
              </button>
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto max-w-md border rounded-xl border-indigo-100 bg-white shadow-2xl overflow-hidden">
      <CardHeader className="flex flex-col gap-2 items-center pb-4 pt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <h1 className="text-3xl font-bold">Create Your Account</h1>
        <p className="text-indigo-100 text-center">
          Sign up to start managing your images securely
        </p>
      </CardHeader>

      <Divider className="opacity-10" />

      <CardBody className="py-8 px-6">
        {authError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{authError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              startContent={<Mail className="h-4 w-4 text-gray-500" />}
              isInvalid={!!errors.email}
              errorMessage={errors.email?.message}
              {...register("email")}
              className="w-full focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              startContent={<Lock className="h-4 w-4 text-gray-500" />}
              endContent={
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              }
              isInvalid={!!errors.password}
              errorMessage={errors.password?.message}
              {...register("password")}
              className="w-full focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="passwordConfirmation"
              className="text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <Input
              id="passwordConfirmation"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              startContent={<Lock className="h-4 w-4 text-gray-500" />}
              endContent={
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  type="button"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              }
              isInvalid={!!errors.passwordConfirmation}
              errorMessage={errors.passwordConfirmation?.message}
              {...register("passwordConfirmation")}
              className="w-full focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <CheckCircle className="h-5 w-5 text-indigo-600 mt-0.5" />
              <p className="text-sm text-gray-700">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>

          <Button
            type="submit"
            color="primary"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium mt-2"
            isLoading={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </CardBody>

      <Divider className="opacity-10" />

      <CardFooter className="flex justify-center py-6 bg-gray-50">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}