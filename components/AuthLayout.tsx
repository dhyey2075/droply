import type { ReactNode } from "react"
import { Wordmark } from "@/components/Wordmark"
import { HeroDemo } from "@/components/landing/HeroDemo"

export function AuthLayout({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Wordmark />
        <div id={id} className="flex flex-1 items-center justify-center py-10">
          {children}
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Droply</p>
      </div>

      <div className="hidden flex-col justify-center gap-10 border-l bg-sidebar px-10 py-12 lg:flex xl:px-16">
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-balance">
            Your files, in folders, with links you can share.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Upload documents once. Droply indexes them so you can ask questions and see which file each answer came from.
          </p>
        </div>
        <HeroDemo />
      </div>
    </div>
  )
}
