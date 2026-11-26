"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

const Placeholder = () => (
  <div className="aspect-[358/340] w-full rounded-2xl bg-muted min-[560px]:aspect-[760/420]" />
)

const UploadDemo = dynamic(() => import("./UploadDemo"), {
  ssr: false,
  loading: Placeholder,
})

export function HeroDemo() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <Placeholder />
  return <UploadDemo key={resolvedTheme} dark={resolvedTheme === "dark"} />
}
