export type RichTextMarkdownFormat =
  | "bold"
  | "italic"
  | "underline"
  | "heading"
  | "bulleted-list"
  | "numbered-list"
  | "link";

type ApplyRichTextMarkdownFormatInput = {
  content: string;
  format: RichTextMarkdownFormat;
  linkUrl?: string;
  selectionEnd: number;
  selectionStart: number;
};

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const UNSAFE_MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export function normalizeRichTextMarkdown(content: string) {
  return content.trim();
}

export function sanitizeMarkdownLinkUrl(url: string) {
  const trimmedUrl = url.trim();

  if (trimmedUrl.length === 0) {
    return "";
  }

  if (trimmedUrl.startsWith("/") || trimmedUrl.startsWith("#")) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    return SAFE_LINK_PROTOCOLS.has(parsedUrl.protocol) ? trimmedUrl : "";
  } catch {
    return "";
  }
}

export function normalizeFormattedRecipeContent(content: string | null | undefined) {
  if (content == null) {
    return null;
  }

  const markdownContent = normalizeRichTextMarkdown(content);
  let normalizedContent = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  UNSAFE_MARKDOWN_LINK_PATTERN.lastIndex = 0;
  while ((match = UNSAFE_MARKDOWN_LINK_PATTERN.exec(markdownContent)) !== null) {
    const [matchedMarkdown, label, url] = match;
    const safeUrl = sanitizeMarkdownLinkUrl(url);
    normalizedContent += markdownContent.slice(lastIndex, match.index);
    normalizedContent += safeUrl ? `[${label}](${safeUrl})` : label;

    lastIndex = match.index + matchedMarkdown.length;
    if (!safeUrl && markdownContent[lastIndex] === ")") {
      lastIndex += 1;
    }
  }

  normalizedContent += markdownContent.slice(lastIndex);

  return normalizedContent.length > 0 ? normalizedContent : null;
}

export function applyRichTextMarkdownFormat(input: ApplyRichTextMarkdownFormatInput) {
  const selectionStart = Math.max(0, Math.min(input.selectionStart, input.content.length));
  const selectionEnd = Math.max(selectionStart, Math.min(input.selectionEnd, input.content.length));
  const before = input.content.slice(0, selectionStart);
  const selected = input.content.slice(selectionStart, selectionEnd);
  const after = input.content.slice(selectionEnd);
  const fallbackSelection = selected.length > 0 ? selected : "text";

  if (input.format === "bold") {
    return `${before}**${fallbackSelection}**${after}`;
  }

  if (input.format === "italic") {
    return `${before}*${fallbackSelection}*${after}`;
  }

  if (input.format === "heading") {
    return applyLinePrefix(input.content, selectionStart, selectionEnd, "## ");
  }

  if (input.format === "bulleted-list") {
    return applyLinePrefix(input.content, selectionStart, selectionEnd, "- ");
  }

  if (input.format === "numbered-list") {
    return applyNumberedLinePrefix(input.content, selectionStart, selectionEnd);
  }

  if (input.format === "link") {
    const safeUrl = sanitizeMarkdownLinkUrl(input.linkUrl ?? "");
    return safeUrl ? `${before}[${fallbackSelection}](${safeUrl})${after}` : input.content;
  }

  return input.content;
}

function getSelectedLineRange(content: string, selectionStart: number, selectionEnd: number) {
  const lineStart = content.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextLineBreak = content.indexOf("\n", selectionEnd);
  const lineEnd = nextLineBreak === -1 ? content.length : nextLineBreak;

  return {
    before: content.slice(0, lineStart),
    selectedLines: content.slice(lineStart, lineEnd),
    after: content.slice(lineEnd),
  };
}

function applyLinePrefix(content: string, selectionStart: number, selectionEnd: number, prefix: string) {
  const range = getSelectedLineRange(content, selectionStart, selectionEnd);
  const formattedLines = range.selectedLines
    .split("\n")
    .map((line) => (line.trim().length > 0 && !line.startsWith(prefix) ? `${prefix}${line}` : line))
    .join("\n");

  return `${range.before}${formattedLines}${range.after}`;
}

function applyNumberedLinePrefix(content: string, selectionStart: number, selectionEnd: number) {
  const range = getSelectedLineRange(content, selectionStart, selectionEnd);
  let itemNumber = 1;
  const formattedLines = range.selectedLines
    .split("\n")
    .map((line) => {
      if (line.trim().length === 0 || /^\d+\.\s/.test(line)) {
        return line;
      }

      const formattedLine = `${itemNumber}. ${line}`;
      itemNumber += 1;
      return formattedLine;
    })
    .join("\n");

  return `${range.before}${formattedLines}${range.after}`;
}
