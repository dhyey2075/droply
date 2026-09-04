import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  looksLikeMarkdownDocument,
  prepareAnswerMarkdown,
} from "@/lib/markdown";

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    if (props?.children != null) return nodeText(props.children);
  }
  return "";
}

function MarkdownBody({ source }: { source: string }) {
  const components: Components = {
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    pre: ({ children }) => {
      const raw = nodeText(children).trim();
      if (looksLikeMarkdownDocument(raw)) {
        return <MarkdownBody source={prepareAnswerMarkdown(raw)} />;
      }
      return <pre>{children}</pre>;
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
      {source}
    </ReactMarkdown>
  );
}

export function MarkdownAnswer({ text }: { text: string }) {
  const source = prepareAnswerMarkdown(text);
  return (
    <div className="answer-markdown">
      <MarkdownBody source={source} />
    </div>
  );
}
