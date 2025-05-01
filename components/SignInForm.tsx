"use client";
import { signInSchema } from "@/schemas/signInSchema";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@heroui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";


export default function SignInForm() {
    const router = useRouter()
    const [authError, setAuthError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false)
    const { signIn, isLoaded, setActive } = useSignIn()

    const {
        register,
        handleSubmit,
        formState: { errors}
    } = useForm<z.infer<typeof signInSchema>>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            identifier: "",
            password: "",
        }
    })

    const onSubmit = async (data: z.infer<typeof signInSchema>) => {
        if(!isLoaded) return;
        setIsSubmitting(true);
        setAuthError(null);

        try {
            const result = await signIn.create({
                identifier: data.identifier,
                password: data.password,
            })
            console.log("Result", result)

            if(result.status === "complete"){
                setActive({
                    session: result.createdSessionId
                })
                router.push("/dashboard")
            }
            else{
                console.log("sign-in error")
                setAuthError(
                    "Sign in couldn't be completed. Please try again."
                )
            }
        } catch (error: Error | unknown) {
            const clerkError = error as { errors?: Array<{ message: string }> }
            setAuthError(
                clerkError.errors?.[0]?.message || "sign in error."
            )
        }
        finally{
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="w-full max-w-md border border-default-200 bg-default-50 shadow-xl">
          <CardHeader className="flex flex-col gap-1 items-center pb-2">
            <h1 className="text-2xl font-bold text-default-900">Welcome Back</h1>
            <p className="text-default-500 text-center">
              Sign in to access your secure cloud storage
            </p>
          </CardHeader>
    
          <Divider />
    
          <CardBody className="py-6">
            {authError && (
              <div className="bg-danger-50 text-danger-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{authError}</p>
              </div>
            )}
    
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="identifier"
                  className="text-sm font-medium text-default-900"
                >
                  Email
                </label>
                <Input
                  id="identifier"
                  type="email"
                  placeholder="your.email@example.com"
                  startContent={<Mail className="h-4 w-4 text-default-500" />}
                  isInvalid={!!errors.identifier}
                  errorMessage={errors.identifier?.message}
                  {...register("identifier")}
                  className="w-full"
                />
              </div>
    
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-default-900"
                  >
                    Password
                  </label>
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  startContent={<Lock className="h-4 w-4 text-default-500" />}
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-default-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-default-500" />
                      )}
                    </Button>
                  }
                  isInvalid={!!errors.password}
                  errorMessage={errors.password?.message}
                  {...register("password")}
                  className="w-full"
                />
              </div>
    
              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardBody>
    
          <Divider />
    
          <CardFooter className="flex justify-center py-4">
            <p className="text-sm text-default-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      );
}
