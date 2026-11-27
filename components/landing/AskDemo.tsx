"use client"

import { ArrowUp } from "lucide-react"
import { Bar, Text, Window } from "@/components/stageshow/kit/window"
import { Stage } from "@/components/stageshow/kit/stage"
import { Collapse } from "@/components/stageshow/kit/motion/Collapse"
import { Stream } from "@/components/stageshow/kit/motion/Stream"
import { Field } from "@/components/stageshow/kit/controls/Field"
import { Button } from "@/components/stageshow/kit/controls/Button"
import { Badge } from "@/components/stageshow/kit/controls/Badge"
import { Card } from "@/components/stageshow/kit/parts/Card"
import { Spinner } from "@/components/stageshow/kit/parts/Spinner"
import type { Act } from "@/components/stageshow/kit/act"
import type { Layout } from "@/components/stageshow/kit/looks"
import { DARK, LIGHT, PdfIcon } from "./demo-look"

// Droply's Ask. A question is typed into the composer and sent; it lifts out
// of the field as the person's message, three dots hold the place of the
// reply, then the answer streams in word by word. Its sources land under it
// and the first one opens beside the window with the passage it was read
// from. Plays once, when it scrolls into view; the poster is the payoff.
//
// Every word of the answer is laid out in its final place before it shows, so
// nothing reflows while it streams. The earlier turn is placeholder: the eye
// belongs on the last exchange.

const Q = "How did revenue change in Q3?"
const A =
  "Revenue grew 12% to $4.2M in Q3, led by the enterprise plan. Churn held at 1.8%, down from 2.4% in Q2, and net retention reached 118%."
const WORDS = A.split(" ").length

const SOURCES = ["Q3 report.pdf", "Board update.docx"]
const PASSAGE_BEFORE = "Revenue for the quarter was "
const PASSAGE_HIT = "$4.2M, up 12% on Q2"
const PASSAGE_AFTER = ", driven mainly by enterprise plans."

type Phase = "idle" | "thinking" | "answer"
type S = { draft: string; sent: boolean; phase: Phase; words: number; sources: boolean; cite: boolean }

const initial: S = { draft: "", sent: false, phase: "idle", words: 0, sources: false, cite: false }
const poster: S = { draft: "", sent: true, phase: "answer", words: WORDS, sources: true, cite: true }

async function script(a: Act<S>) {
  await a.wait(700)

  // 1. The question is typed, then sent: the field empties as the message forms
  a.mark("type")
  await a.type("draft", Q, { interval: 42 })
  await a.wait(450)
  a.mark("send")
  a.put({ sent: true, draft: "" })
  await a.wait(900)

  // 2. Three dots, a beat of searching
  a.put({ phase: "thinking" })
  await a.wait(1300)

  // 3. The answer streams in
  a.mark("stream")
  a.put({ phase: "answer" })
  for (let i = 1; i <= WORDS; i++) {
    a.put({ words: i })
    await a.wait(42)
  }
  await a.wait(350)

  // 4. Sources land, then the first opens on the passage it was read from
  a.mark("sources")
  a.put({ sources: true })
  await a.wait(650)
  a.mark("cite")
  a.put({ cite: true })
  await a.wait(3600)
}

type Geo = { win: { x: number; y: number; w: number; h: number }; end: number; field: number; pad: string; past: boolean; card: { x: number; y: number } | null }

// Wide: a 40px gutter above and left, the window runs off the bottom. The
// thread stops short of the right edge, so the source card can straddle it in
// the margin without covering a word. Compact: the window alone; the source
// chips carry the payoff, there is no room for a card beside them.
const GEO: Record<Layout, Geo> = {
  wide: { win: { x: 40, y: 40, w: 520, h: 440 }, end: 112, field: 0, pad: "pb-[88px]", past: true, card: { x: 452, y: 168 } },
  compact: { win: { x: 16, y: 16, w: 380, h: 380 }, end: 38, field: 38, pad: "pb-[72px]", past: false, card: null },
}

export default function AskDemo({ dark = false }: { dark?: boolean }) {
  return (
    <Stage<S>
      width={760}
      height={420}
      compact={{ below: 560, width: 358, height: 352 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      theme={dark ? "dark" : "light"}
      accent={dark ? "#609ae7" : "#1a67c2"}
      tokens={dark ? DARK : LIGHT}
      className="[&_.ss-stage]:overflow-hidden [&_.ss-stage]:rounded-2xl [&_.ss-stage]:bg-(--ss-well)"
    >
      {(s, _rect, layout) => {
        const g = GEO[layout]
        return (
          <>
            <Window
              className="absolute bg-(--ss-surface) shadow-(--ss-shadow-hero)"
              style={{ left: g.win.x, top: g.win.y, width: g.win.w, height: g.win.h }}
              lead={
                <span className="flex items-baseline gap-2.5">
                  <span className="text-sm font-semibold text-(--ss-text-strong)">Ask</span>
                  <span className="text-xs text-(--ss-text)">All files</span>
                </span>
              }
              body={{ className: "overflow-hidden", "data-crop": true }}
            >
              <div className={`flex h-full flex-col px-5 pt-3 ${g.pad}`}>
                <div className="flex min-h-0 flex-1 flex-col justify-end gap-3.5 overflow-hidden pb-5" style={{ paddingRight: g.end }}>
                  {g.past && (
                    <div className="grid gap-2">
                      <Bar w={118} h={30} r={15} tone={1} className="justify-self-end" />
                      <Bar w="90%" h={8} r={4} tone={2} />
                      <Bar w="62%" h={8} r={4} tone={2} />
                    </div>
                  )}
                  <Collapse open={s.sent} reveal="drop" from="below">
                    <div className="flex justify-end">
                      <Text wrap className="max-w-[78%] rounded-2xl bg-(--ss-ink-1) px-3.5 py-2 text-[13px] leading-[1.5] text-(--ss-text-strong)">
                        {Q}
                      </Text>
                    </div>
                  </Collapse>
                  <Collapse open={s.phase === "thinking"}>
                    <span className="flex items-center gap-2 text-[13px] text-(--ss-text)">
                      <Spinner size={12} />
                      <Text>Searching your files</Text>
                    </span>
                  </Collapse>
                  <Collapse open={s.phase === "answer"}>
                    <div className="grid gap-3">
                      <Stream text={A} count={s.words} className="text-[13px] leading-[1.55] text-(--ss-text-strong)" />
                      <span className="flex flex-wrap gap-1.5 transition-opacity duration-500 ease-out" style={{ opacity: s.sources ? 1 : 0 }}>
                        {SOURCES.map((name, i) => (
                          <Badge key={name} tone={i === 0 && s.cite ? "accent" : "neutral"}>
                            <span className="mr-1.5 tabular-nums">{i + 1}</span>
                            {name}
                          </Badge>
                        ))}
                      </span>
                    </div>
                  </Collapse>
                </div>
                <Field
                  className="flex-none"
                  style={{ marginRight: g.field }}
                  value={s.draft}
                  placeholder="Ask about your documents…"
                  focused={!s.sent}
                  box={{ "data-target": "ask-composer" }}
                  trailing={
                    <Button
                      variant="primary"
                      size="small"
                      className={`bg-(--ss-text-strong) text-(--ss-surface) transition-opacity duration-200 ${s.draft ? "opacity-100" : "opacity-35"}`}
                      icon={<ArrowUp size={14} strokeWidth={2.25} />}
                      aria-label="Send"
                    />
                  }
                />
              </div>
            </Window>

            {g.card && (
              <Card
                lift
                pad="medium"
                gap={10}
                className="absolute w-[212px] text-xs shadow-(--ss-shadow-satellite) will-change-transform transition-[opacity,transform] duration-500 ease-out"
                style={{
                  left: g.card.x,
                  top: g.card.y,
                  opacity: s.cite ? 1 : 0,
                  transform: s.cite ? "translateY(0)" : "translateY(10px)",
                }}
              >
                <span className="flex items-center gap-2 font-medium text-(--ss-text-strong)">
                  <PdfIcon small />
                  <span className="whitespace-nowrap">{SOURCES[0]}</span>
                </span>
                <span className="block leading-[1.55] text-(--ss-text)">
                  {PASSAGE_BEFORE}
                  <span
                    className="rounded-[3px] px-0.5 text-(--ss-text-strong) transition-colors duration-500 delay-300"
                    style={{ background: s.cite ? "color-mix(in srgb, var(--ss-accent) 18%, transparent)" : "transparent" }}
                  >
                    {PASSAGE_HIT}
                  </span>
                  {PASSAGE_AFTER}
                </span>
              </Card>
            )}
          </>
        )
      }}
    </Stage>
  )
}
