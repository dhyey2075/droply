"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import type { Appearance } from "@clerk/types"

// Clerk derives shades from these, so they must be concrete colors; they
// mirror the tokens in app/globals.css.
const LIGHT = {
  ink: "#1a1816",
  surface: "#ffffff",
  muted: "#6c6865",
  line: "#e1dfdd",
  danger: "#c9302d",
  success: "#267b4c",
}

const DARK = {
  ink: "#edebe8",
  surface: "#171614",
  muted: "#989591",
  line: "#2b2a28",
  danger: "#ef6661",
  success: "#60bb83",
}

export function useClerkAppearance(): Appearance {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const c = mounted && resolvedTheme === "dark" ? DARK : LIGHT

  return {
    variables: {
      colorPrimary: c.ink,
      colorText: c.ink,
      colorTextSecondary: c.muted,
      colorBackground: c.surface,
      colorInputBackground: c.surface,
      colorInputText: c.ink,
      colorNeutral: c.ink,
      colorDanger: c.danger,
      colorSuccess: c.success,
      borderRadius: "0.5rem",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: "0.875rem",
    },
    elements: {
      cardBox: { boxShadow: "none", border: `1px solid ${c.line}`, borderRadius: "12px" },
      card: { boxShadow: "none" },
      headerTitle: { fontSize: "1.125rem", fontWeight: 600, letterSpacing: "-0.01em" },
      formButtonPrimary: { boxShadow: "none", textTransform: "none", fontSize: "0.875rem" },
      socialButtonsBlockButton: { boxShadow: `0 0 0 1px ${c.line}` },
      userButtonPopoverCard: { boxShadow: `0 0 0 1px ${c.line}, 0 12px 32px -12px rgb(0 0 0 / 0.25)` },
    },
  }
}
