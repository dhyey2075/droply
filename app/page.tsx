"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FileUp, Share2, Lock, Folder, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="flex flex-col items-center text-center gap-6 sm:gap-8 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight px-2">
            Share files with ease and{" "}
            <span className="text-blue-500">security</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl px-4">
            Droply provides a secure, fast, and intuitive way to store and share your files. Built for individuals and teams who value simplicity and privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 w-full sm:w-auto px-4 sm:px-0">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="gap-2 w-full sm:w-auto touch-manipulation">
                Get Started <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signin" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto touch-manipulation">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 border-t">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-16 px-4">Why Choose Droply?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="flex flex-col items-center text-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <FileUp className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Easy File Upload</h3>
            <p className="text-muted-foreground">
              Drag and drop or click to upload files of any size. Support for all file types.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Share2 className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Quick Sharing</h3>
            <p className="text-muted-foreground">
              Generate shareable links instantly and control who can access your files.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Secure Storage</h3>
            <p className="text-muted-foreground">
              Your files are encrypted and stored securely with enterprise-grade security.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Folder className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Organization</h3>
            <p className="text-muted-foreground">
              Create folders, move files, and keep everything organized your way.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-4 p-6">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Globe className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Access Anywhere</h3>
            <p className="text-muted-foreground">
              Access your files from any device, anywhere in the world.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-4 p-6 border border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">And More...</h3>
            <p className="text-muted-foreground">
              Dark mode, file previews, and many other features to enhance your experience.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 border-t">
        <div className="bg-blue-500 rounded-2xl p-6 sm:p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-2">
            Ready to get started?
          </h2>
          <p className="text-blue-100 mb-6 sm:mb-8 max-w-xl mx-auto px-4 text-sm sm:text-base">
            Join thousands of users who trust Droply for their file sharing needs.
          </p>
          <div className="flex justify-center px-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto touch-manipulation">
                Create Account <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
