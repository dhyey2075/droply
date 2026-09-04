/** Strip trailing Sources blocks the LLM or backend may append. */
export function stripTrailingSources(text: string): string {
  return text
    .replace(/\n+#{1,3}\s*Sources\s*\n[\s\S]*$/i, "")
    .replace(/\n+\*\*Sources:?\*\*\s*\n[\s\S]*$/i, "")
    .replace(/\n+Sources:\s*\n[\s\S]*$/i, "")
    .trim();
}

/** Models often wrap the whole reply in a ``` fence, which renders as raw markdown. */
export function unwrapOuterFence(text: string): string {
  let result = text.trim();
  for (let i = 0; i < 3; i++) {
    const fenced = result.match(/^```[^\n]*\n([\s\S]*?)\n```[ \t]*$/);
    if (fenced) {
      result = fenced[1].trim();
      continue;
    }
    break;
  }
  return result;
}

export function looksLikeMarkdownDocument(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /^\s*#{1,6}\s+\S/m.test(t) ||
    /\*\*[^*]+\*\*/.test(t) ||
    /^\s{0,3}[-*+]\s+\S/m.test(t) ||
    /^\s{0,3}\d+\.\s+\S/m.test(t)
  );
}

function decodeLiteralNewlines(text: string): string {
  if (text.includes("\n")) return text;
  if (text.includes("\\n")) return text.replace(/\\n/g, "\n");
  return text;
}

function unescapeMarkdownPunctuation(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1");
}

/** Insert newlines so run-on lists parse as GFM lists without flattening nested ones. */
export function normalizeListMarkdown(text: string): string {
  let result = text.replace(/\r\n/g, "\n");

  result = result.replace(/^(\s*)[•●▪◦–—]\s+/gm, "$1- ");

  result = result.replace(
    /^(?!\s*(?:[-*+]|\d+\.)\s)\s*\*\*(.+?)\*\*\s*$/gm,
    "### $1"
  );

  result = result.replace(/([.:!?])[^\S\n]+(\d+\.\s)/g, "$1\n\n$2");
  result = result.replace(/([.:!?])[^\S\n]+(-\s)/g, "$1\n\n$2");
  result = result.replace(/(\d+\.\s[^\n]+?)[^\S\n]+(\d+\.\s)/g, "$1\n$2");
  result = result.replace(/(^|\n)(-\s[^\n]+?)[^\S\n]+(-\s)/g, "$1$2\n$3");

  return result;
}

export function prepareAnswerMarkdown(raw: string): string {
  const decoded = decodeLiteralNewlines(raw.replace(/\r\n/g, "\n"));
  const unwrapped = unescapeMarkdownPunctuation(unwrapOuterFence(decoded));
  return normalizeListMarkdown(stripTrailingSources(unwrapped))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
