"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

const Placeholder = ({ ask = false }: { ask?: boolean }) => (
  <div
    className={`w-full rounded-2xl bg-muted min-[560px]:aspect-[760/420] ${ask ? "aspect-[358/352]" : "aspect-[358/340]"}`}
  />
)

const UploadDemo = dynamic(() => import("./UploadDemo"), {
  ssr: false,
  loading: () => <Placeholder />,
})

const AskDemo = dynamic(() => import("./AskDemo"), {
  ssr: false,
  loading: () => <Placeholder ask />,
})

function useDemoTheme() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return { mounted, resolvedTheme, dark: resolvedTheme === "dark" }
}

export function HeroDemo() {
  const { mounted, resolvedTheme, dark } = useDemoTheme()
  if (!mounted) return <Placeholder />
  return <UploadDemo key={resolvedTheme} dark={dark} />
}

export function AskShowcase() {
  const { mounted, resolvedTheme, dark } = useDemoTheme()
  if (!mounted) return <Placeholder ask />
  return <AskDemo key={resolvedTheme} dark={dark} />
}
