import type { LookTokens } from "@/components/stageshow/kit/stage"

export const LIGHT: LookTokens = {
  "--ss-font": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "--ss-canvas": "#f6f5f3",
  "--ss-well": "#eeece9",
  "--ss-text-strong": "#1a1816",
  "--ss-text": "#6c6865",
  "--ss-icon": "#6c6865",
  "--ss-success": "#267b4c",
  "--ss-success-text": "#267b4c",
  "--ss-success-soft": "rgba(38, 123, 76, 0.12)",
}

export const DARK: LookTokens = {
  "--ss-font": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "--ss-canvas": "#141311",
  "--ss-surface": "#1b1a18",
  "--ss-well": "#0c0b0a",
  "--ss-text-strong": "#edebe8",
  "--ss-text": "#989591",
  "--ss-icon": "#989591",
  "--ss-success": "#60bb83",
  "--ss-success-text": "#60bb83",
  "--ss-success-soft": "rgba(96, 187, 131, 0.16)",
}

/** A page with a folded corner and a red PDF band: the file being uploaded. */
export function PdfIcon({ small }: { small?: boolean }) {
  if (small) {
    return (
      <span className="relative block h-[19px] w-[15px] flex-none rounded-[2px] bg-white shadow-[inset_0_0_0_1px_#c9c7c4]">
        <span className="absolute inset-x-0 bottom-1 h-[5px] bg-[#d9443f]" />
      </span>
    )
  }
  return (
    <span className="relative block h-14 w-11 rounded-[3px] bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.16),0_2px_6px_-2px_rgba(0,0,0,0.22)] before:absolute before:top-0 before:right-0 before:h-[23%] before:w-[30%] before:bg-[linear-gradient(225deg,transparent_50%,#e4e2df_50%)] before:content-['']">
      <span className="absolute inset-x-0 bottom-2.5 bg-[#d9443f] py-0.5 text-center text-[11px] leading-[13px] font-bold tracking-[0.04em] text-white">
        PDF
      </span>
    </span>
  )
}
