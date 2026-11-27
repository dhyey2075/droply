"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import { Check, File, Folder, Search, Trash2, Upload } from "lucide-react"
import { Bar, Window } from "@/components/stageshow/kit/window"
import { Stage } from "@/components/stageshow/kit/stage"
import { Collapse } from "@/components/stageshow/kit/motion/Collapse"
import { Roll } from "@/components/stageshow/kit/motion/Roll"
import { States } from "@/components/stageshow/kit/motion/States"
import { Button } from "@/components/stageshow/kit/controls/Button"
import { Badge } from "@/components/stageshow/kit/controls/Badge"
import { Meter } from "@/components/stageshow/kit/parts/Meter"
import { Spinner } from "@/components/stageshow/kit/parts/Spinner"
import type { Act } from "@/components/stageshow/kit/act"
import type { Point } from "@/components/stageshow/kit/measure"
import type { Layout } from "@/components/stageshow/kit/looks"
import { DARK, LIGHT, PdfIcon } from "./demo-look"

// Droply's file list. A PDF on the desktop is dragged into My files: the list
// lights up under it, an upload row opens at the top, its bar fills while the
// size counts up, then the row moves to Indexing and lands on Indexed, ready
// for Ask. The row's trash button appears on hover; deleting the row closes it,
// which is exactly where the loop began.

type Ghost = { on: boolean; dropped: boolean; off: Point; at: Point }
type Phase = "upload" | "indexing" | "indexed"
type S = { up: boolean; mb: number; phase: Phase; hover: boolean; ghost: Ghost }

const initial: S = {
  up: false,
  mb: 0,
  phase: "upload",
  hover: false,
  ghost: { on: false, dropped: false, off: { x: 0, y: 0 }, at: { x: 0, y: 0 } },
}
const poster: S = { ...initial, up: true, mb: 4.2, phase: "indexed" }

const FILE = "Q3 report.pdf"
const MB = 4.2
const fmtMb = (n: number) => n.toFixed(1)
const DESK_ICON = { at: "desk-icon", x: 0.5, y: 0.55 } as const

type Geo = {
  win: { x: number; y: number; w: number; h: number }
  rows: number
  cols: string
  size: boolean
  desk: { x: number; y: number }
  headCols: string
}

// Wide: the window keeps a 40px gutter above and left and bleeds off the
// bottom. The desktop file straddles its right edge over the filler column, so
// the drag travels left into the list. Compact: the file sits above the window; Size is dropped so Status
// stays whole.
const GEO: Record<Layout, Geo> = {
  wide: { win: { x: 40, y: 40, w: 520, h: 470 }, rows: 9, cols: "minmax(0,1fr) 124px 84px 48px", size: true, desk: { x: 498, y: 236 }, headCols: "minmax(0,1fr) 124px 84px" },
  compact: { win: { x: 20, y: 124, w: 366, h: 300 }, rows: 6, cols: "minmax(0,1fr) 108px 64px", size: false, desk: { x: 206, y: 60 }, headCols: "minmax(0,1fr) 108px 64px" },
}

type Kind = "folder" | "doc"
const ROWS: { kind: Kind; name: number; status: number; size: number }[] = [
  { kind: "folder", name: 96, status: 0, size: 16 },
  { kind: "doc", name: 132, status: 52, size: 40 },
  { kind: "doc", name: 104, status: 60, size: 34 },
  { kind: "folder", name: 80, status: 0, size: 16 },
  { kind: "doc", name: 120, status: 48, size: 44 },
  { kind: "doc", name: 92, status: 56, size: 36 },
  { kind: "folder", name: 112, status: 0, size: 16 },
  { kind: "doc", name: 100, status: 52, size: 38 },
  { kind: "doc", name: 126, status: 60, size: 42 },
]

async function script(a: Act<S>) {
  await a.wait(600)

  // 1. Pick the PDF up off the desktop by its icon
  a.mark("grab")
  const icon = a.rect("desk-icon")
  const file = a.rect("desk-file")
  const grab = { x: icon.x + icon.width / 2, y: icon.y + icon.height * 0.55 }
  await a.move(grab)
  await a.wait(240)
  const off = { x: grab.x - file.x, y: grab.y - file.y }

  // 2. Carry it into My files; the list lights up under it
  a.mark("drag")
  const list = a.rect("drop")
  await a.drag({ x: list.x + list.width * 0.34, y: list.y + list.height * 0.3 }, (at) => {
    a.put({ ghost: { on: true, dropped: false, off, at } })
  }, { duration: 1300, cursor: "preserve" })

  // 3. Drop: the upload row opens at the top, its bar fills and the size
  //    counts up with it
  a.mark("drop")
  await a.set((s) => ({ up: true, ghost: { ...s.ghost, dropped: true } }))
  await a.wait(450)
  for (const [mb, ms] of [[1.1, 600], [2.3, 600], [3.4, 600], [MB, 550]] as const) {
    await a.set({ mb })
    await a.wait(ms)
  }

  // 4. Uploaded: the bar hands over to indexing, then Indexed
  a.mark("indexing")
  await a.set({ phase: "indexing" })
  await a.wait(1700)
  a.mark("indexed")
  await a.set({ phase: "indexed" })
  await a.wait(2200)

  // 5. Hover the row, delete it: the row closes and the cursor returns to the file
  a.mark("delete")
  await a.set({ hover: true })
  await a.move({ at: "trash", x: 0.5, y: 0.5 })
  await a.wait(200)
  await a.click("trash")
  await a.set({ up: false, hover: false, ghost: initial.ghost })
  await a.move(DESK_ICON)
  await a.wait(400)
  await a.snap({ mb: 0, phase: "upload" })
  await a.wait(300)
}

export default function UploadDemo({ dark = false }: { dark?: boolean }) {
  return (
    <Stage<S>
      width={760}
      height={420}
      compact={{ below: 560, width: 358, height: 340 }}
      initial={initial}
      poster={poster}
      script={script}
      theme={dark ? "dark" : "light"}
      accent={dark ? "#609ae7" : "#1a67c2"}
      tokens={dark ? DARK : LIGHT}
      cursor={{ at: { wide: DESK_ICON, compact: { at: "desk-icon", x: 0.5, y: 0.55 } } }}
      className="[&_.ss-stage]:overflow-hidden [&_.ss-stage]:rounded-2xl [&_.ss-stage]:bg-(--ss-well)"
    >
      {(s, _rect, layout) => {
        const g = GEO[layout]
        const lifted = s.ghost.on && !s.ghost.dropped
        return (
          <>

            <Window
              className="absolute bg-(--ss-surface) shadow-(--ss-shadow-hero)"
              style={{ left: g.win.x, top: g.win.y, width: g.win.w, height: g.win.h }}
              lead={
                <span className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-(--ss-text-strong)">My files</span>
                  <Search size={15} strokeWidth={1.75} className="text-(--ss-icon)" />
                  <Button variant="primary" size="small" className="bg-(--ss-text-strong) text-(--ss-surface)" icon={<Upload size={12} strokeWidth={2} />} aria-label="Upload">
                    {layout === "wide" ? "Upload" : null}
                  </Button>
                </span>
              }
              body={{ className: "overflow-hidden", "data-crop": true }}
            >
              <div className="px-2.5 pt-1 text-sm" style={{ ["--cols" as string]: g.cols }}>
                <div className="grid h-[30px] items-center text-xs font-medium whitespace-nowrap text-(--ss-text) [&>span]:pl-3 [&>span+span]:border-l [&>span+span]:border-(--ss-line) [&>span+span]:leading-[15px]" style={{ gridTemplateColumns: g.headCols }}>
                  <span>Name</span>
                  <span>Status</span>
                  {g.size ? <span>Size</span> : <i aria-hidden className="block" />}
                </div>
                <div
                  className="relative min-h-[600px] rounded-lg transition-[box-shadow,background-color] duration-150 data-[over]:bg-[color-mix(in_srgb,var(--ss-accent)_5%,transparent)] data-[over]:shadow-[inset_0_0_0_2px_var(--ss-accent)]"
                  data-target="drop"
                  data-drop
                >
                  <Collapse open={s.up}>
                    <UploadRow s={s} size={g.size} />
                  </Collapse>
                  {ROWS.slice(0, g.rows).map((r, i) => (
                    <Row key={i} r={r} size={g.size} k={layout === "wide" ? 1 : 0.75} />
                  ))}
                </div>
              </div>
            </Window>

            <div
              className="absolute flex w-[124px] flex-col items-center gap-2 rounded-xl bg-(--ss-surface) p-3.5 text-xs shadow-(--ss-shadow-satellite) transition-opacity duration-200 data-[lifted]:opacity-45"
              data-target="desk-file"
              data-lifted={lifted || undefined}
              style={{ left: g.desk.x, top: g.desk.y }}
            >
              <span data-target="desk-icon">
                <PdfIcon />
              </span>
              <span className="px-[5px] py-px leading-[1.35] font-medium whitespace-nowrap text-(--ss-text-strong)">
                {FILE}
              </span>
            </div>

            <DragImage ghost={s.ghost}>
              <PdfIcon />
              <span className="rounded px-[5px] py-px leading-[1.35] whitespace-nowrap text-white bg-(--ss-accent)">
                {FILE}
              </span>
            </DragImage>
          </>
        )
      }}
    </Stage>
  )
}

const ROW = "relative grid h-[38px] transform-gpu grid-cols-(--cols) items-center rounded-[7px] text-(--ss-text-strong) [&>*]:ml-3"

function UploadRow({ s, size }: { s: S; size: boolean }) {
  const done = s.phase !== "upload"
  const indexed = s.phase === "indexed"
  return (
    <div
      className={`${ROW} transition-colors duration-500 ${done ? "bg-transparent" : "bg-[color-mix(in_srgb,var(--ss-accent)_7%,var(--ss-surface))]"}`}
      data-target="upload-row"
    >
      <span className="flex min-w-0 items-center gap-2.5 pr-2">
        <PdfIcon small />
        <span className="font-medium whitespace-nowrap">{FILE}</span>
      </span>
      <States
        value={done ? "index" : "upload"}
        align="start"
        states={{
          upload: <Meter className="w-[84px] bg-[color-mix(in_srgb,var(--ss-accent)_18%,var(--ss-surface))]" value={s.mb / MB} />,
          index: (
            <Badge
              tone={indexed ? "success" : "accent"}
              icon={
                <States
                  value={indexed ? "done" : "pending"}
                  states={{
                    pending: <Spinner size={12} />,
                    done: <Check size={12} strokeWidth={2.25} />,
                  }}
                />
              }
            >
              <Roll variant="fade">{indexed ? "Indexed" : "Indexing"}</Roll>
            </Badge>
          ),
        }}
      />
      {size && (
        <span className="whitespace-nowrap tabular-nums">
          <Roll>{fmtMb(s.mb)}</Roll>
          {" MB"}
        </span>
      )}
      <span
        className={`grid size-6 place-items-center rounded-md transition-colors duration-150 ${s.hover ? "bg-(--ss-ink-2) text-(--ss-danger)" : "text-(--ss-icon-faint)"}`}
        data-target="trash"
        data-cursor="pointer"
      >
        <Trash2 size={14} strokeWidth={1.75} />
      </span>
    </div>
  )
}

function Row({ r, size, k }: { r: (typeof ROWS)[number]; size: boolean; k: number }) {
  return (
    <div className={ROW}>
      <span className="flex min-w-0 items-center gap-2.5">
        {r.kind === "folder" ? (
          <Folder size={18} strokeWidth={1.25} className="flex-none fill-current text-[color-mix(in_srgb,var(--ss-accent)_55%,var(--ss-surface))]" />
        ) : (
          <File size={18} strokeWidth={1.25} className="flex-none fill-(--ss-surface) text-(--ss-icon-faint)" />
        )}
        <Bar w={Math.round(r.name * k)} h={7} tone={3} />
      </span>
      {r.status ? <Bar w={r.status} h={7} tone={2} /> : <span />}
      {size && (r.kind === "folder" ? <Bar w={r.size} h={2} tone={3} /> : <Bar w={r.size} h={7} tone={2} />)}
      <Bar w={24} h={7} tone={2} />
    </div>
  )
}

/** The drag image follows the cursor on the drag's own frame callback, and
 *  lights whatever [data-drop] it is over. */
function DragImage({ ghost, children }: { ghost: Ghost; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const over = useRef<HTMLElement | null>(null)
  const following = ghost.on && !ghost.dropped
  const { x: ox, y: oy } = ghost.off
  const { x, y } = ghost.at
  useLayoutEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".ss-stage")
    let next: HTMLElement | null = null
    if (following && root) {
      const box = root.getBoundingClientRect()
      const scale = box.width / root.offsetWidth || 1
      const hit = document.elementFromPoint(box.left + x * scale, box.top + y * scale)?.closest<HTMLElement>("[data-drop]") ?? null
      if (hit && root.contains(hit)) next = hit
    }
    if (next !== over.current) {
      over.current?.removeAttribute("data-over")
      next?.setAttribute("data-over", "")
      over.current = next
    }
  }, [following, x, y])
  useLayoutEffect(() => () => over.current?.removeAttribute("data-over"), [])
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute top-0 left-0 z-30 opacity-0 will-change-transform data-[show]:opacity-85 data-[dropped]:opacity-0 data-[dropped]:transition-opacity data-[dropped]:duration-200 data-[dropped]:ease-in [&[data-dropped]>div]:scale-50 [&[data-dropped]>div]:transition-transform [&[data-dropped]>div]:duration-[240ms]"
      data-show={following || undefined}
      data-dropped={ghost.dropped || undefined}
      style={{ transform: `translate(${x - ox}px, ${y - oy}px)` }}
      aria-hidden
    >
      <div
        className="flex w-[104px] flex-col items-center gap-[7px] text-xs will-change-transform"
        style={{ transformOrigin: `${ox}px ${oy}px` }}
      >
        {children}
      </div>
    </div>
  )
}
