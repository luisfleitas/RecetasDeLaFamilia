"use client";

import { useRef } from "react";
import { applyRichTextMarkdownFormat, type RichTextMarkdownFormat } from "@/lib/application/recipes/rich-text";

type SimpleRichTextEditorLabels = {
  bold: string;
  bulletedList: string;
  italic: string;
  link: string;
  linkPrompt: string;
  normalText: string;
  numberedList: string;
  textSize: string;
  titleText: string;
  underline: string;
};

type SimpleRichTextEditorProps = {
  baseId: string;
  labels: SimpleRichTextEditorLabels;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows: number;
  value: string;
};

export default function SimpleRichTextEditor({
  baseId,
  labels,
  name,
  onChange,
  required = false,
  rows,
  value,
}: SimpleRichTextEditorProps) {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  function applyFormat(format: RichTextMarkdownFormat, linkUrl?: string) {
    const textArea = textAreaRef.current;
    const selectionStart = textArea?.selectionStart ?? value.length;
    const selectionEnd = textArea?.selectionEnd ?? value.length;
    const nextValue = applyRichTextMarkdownFormat({
      content: value,
      format,
      linkUrl,
      selectionEnd,
      selectionStart,
    });

    onChange(nextValue);
    window.requestAnimationFrame(() => textArea?.focus());
  }

  function applyLink() {
    const linkUrl = window.prompt(labels.linkPrompt);
    if (linkUrl == null) {
      return;
    }

    applyFormat("link", linkUrl);
  }

  return (
    <div id={`${baseId}-rich-text-editor`} className="simple-rich-text-editor">
      <div id={`${baseId}-rich-text-toolbar`} className="simple-rich-text-toolbar" role="toolbar">
        <button
          id={`${baseId}-rich-text-bold-btn`}
          type="button"
          aria-label={labels.bold}
          className="simple-rich-text-toolbar-button"
          onClick={() => applyFormat("bold")}
        >
          B
        </button>
        <button
          id={`${baseId}-rich-text-italic-btn`}
          type="button"
          aria-label={labels.italic}
          className="simple-rich-text-toolbar-button"
          onClick={() => applyFormat("italic")}
        >
          I
        </button>
        <button
          id={`${baseId}-rich-text-underline-btn`}
          type="button"
          aria-label={labels.underline}
          className="simple-rich-text-toolbar-button"
          onClick={() => applyFormat("underline")}
        >
          U
        </button>
        <label id={`${baseId}-rich-text-size-label`} className="sr-only" htmlFor={`${baseId}-rich-text-size-select`}>
          {labels.textSize}
        </label>
        <select
          id={`${baseId}-rich-text-size-select`}
          className="simple-rich-text-toolbar-select"
          defaultValue="normal"
          onChange={(event) => {
            if (event.target.value === "heading") {
              applyFormat("heading");
            }
            event.target.value = "normal";
          }}
        >
          <option value="normal">{labels.normalText}</option>
          <option value="heading">{labels.titleText}</option>
        </select>
        <button
          id={`${baseId}-rich-text-bulleted-list-btn`}
          type="button"
          aria-label={labels.bulletedList}
          className="simple-rich-text-toolbar-button"
          onClick={() => applyFormat("bulleted-list")}
        >
          -
        </button>
        <button
          id={`${baseId}-rich-text-numbered-list-btn`}
          type="button"
          aria-label={labels.numberedList}
          className="simple-rich-text-toolbar-button"
          onClick={() => applyFormat("numbered-list")}
        >
          1.
        </button>
        <button
          id={`${baseId}-rich-text-link-btn`}
          type="button"
          aria-label={labels.link}
          className="simple-rich-text-toolbar-button"
          onClick={applyLink}
        >
          Link
        </button>
      </div>
      <textarea
        id={`${baseId}-input`}
        ref={textAreaRef}
        name={name}
        rows={rows}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-base simple-rich-text-textarea"
      />
    </div>
  );
}
