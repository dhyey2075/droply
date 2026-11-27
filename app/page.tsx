import Link from "next/link";
import { ArrowRight, Check, FolderTree, Link2, MessageSquareText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { AskShowcase, HeroDemo } from "@/components/landing/HeroDemo";

const ASK_POINTS = [
  "Every answer lists the files it was read from.",
  "Search all your files, or choose just the ones you want.",
  "Conversations are saved, so you can pick one up later.",
];

const FEATURES = [
  {
    icon: Upload,
    title: "Upload anything",
    body: "Drop in images, PDFs, Word documents, spreadsheets and text files up to 100 MB each.",
  },
  {
    icon: FolderTree,
    title: "Folders and search",
    body: "Keep work in folders, then narrow any folder by name, file type or size.",
  },
  {
    icon: Link2,
    title: "Share a link",
    body: "Copy a direct link to any file and send it wherever you need it.",
  },
  {
    icon: MessageSquareText,
    title: "Ask your documents",
    body: "Documents are indexed after upload. Ask a question and see which files the answer came from.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-16 sm:px-8 sm:pt-16 sm:pb-24 xl:max-w-[1240px] xl:grid-cols-[minmax(0,400px)_760px] xl:justify-between xl:gap-10">
          <div className="max-w-xl">
            <h1 className="text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[3.25rem]">
              Store files. Share links. Ask your documents.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Droply keeps your files in folders, gives each one a link you can
              share, and reads your documents so you can ask questions about them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create a free account
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/signin">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="w-full">
            <HeroDemo />
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 xl:max-w-[1240px] xl:grid-cols-[760px_minmax(0,400px)] xl:justify-between xl:gap-10">
            <div id="ask-demo" className="w-full xl:order-1">
              <AskShowcase />
            </div>
            <div className="max-w-xl xl:order-2">
              <h2 className="text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
                Ask a question. See where the answer came from.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                Droply reads what you upload, so you can ask in plain words and get
                an answer drawn from your own files.
              </p>
              <ul className="mt-7 space-y-3 text-sm">
                {ASK_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 flex-none text-brand" strokeWidth={2} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="max-w-md text-2xl font-semibold tracking-[-0.02em]">
              Everything your files need, nothing they don&apos;t.
            </h2>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="border-t pt-5">
                  <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                  <h3 className="mt-4 text-[15px] font-medium">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-20">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">Start with your first upload.</h2>
              <p className="mt-2 text-muted-foreground">It takes a minute to set up an account.</p>
            </div>
            <Button asChild size="lg">
              <Link href="/signup">
                Get started
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 text-sm text-muted-foreground sm:px-8">
          <span>Droply</span>
          <Link href="/signin" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
