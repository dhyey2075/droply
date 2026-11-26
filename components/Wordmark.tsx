import Link from "next/link"
import { cn } from "@/lib/utils"

export function Wordmark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "text-[15px] font-semibold tracking-[-0.02em] text-foreground outline-none focus-visible:underline",
        className
      )}
    >
      Droply
    </Link>
  )
}
