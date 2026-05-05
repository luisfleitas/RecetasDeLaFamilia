"use client";

import { useRef, useState } from "react";
import FormattedRecipeContent from "@/app/recipes/_components/formatted-recipe-content";
import {
  applyRichTextMarkdownFormat,
  getRichTextEditorPreviewContent,
  normalizeRichTextEditorSource,
  type RichTextMarkdownFormat,
} from "@/lib/application/recipes/rich-text";

type SimpleRichTextEditorLabels = {
  bold: string;
  bulletedList: string;
  italic: string;
  link: string;
  linkPrompt: string;
  normalText: string;
  numberedList: string;
  previewEmpty: string;
  previewMode: string;
  sourceHelp: string;
  sourceMode: string;
  textSize: string;
  titleText: string;
  underline: string;
};

type RichTextEditorMode = "source" | "preview";

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
  const [mode, setMode] = useState<RichTextEditorMode>("source");
  const previewContent = getRichTextEditorPreviewContent(value);

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

  function selectSourceMode() {
    setMode("source");
    window.requestAnimationFrame(() => textAreaRef.current?.focus());
  }

  return (
    <div id={`${baseId}-rich-text-editor`} className="simple-rich-text-editor">
      <div id={`${baseId}-rich-text-mode-tabs`} className="simple-rich-text-mode-tabs" role="tablist">
        <button
          id={`${baseId}-rich-text-source-tab`}
          type="button"
          role="tab"
          aria-selected={mode === "source"}
          aria-controls={`${baseId}-rich-text-source-panel`}
          className="simple-rich-text-mode-tab"
          data-active={mode === "source" ? "true" : "false"}
          onClick={selectSourceMode}
        >
          {labels.sourceMode}
        </button>
        <button
          id={`${baseId}-rich-text-preview-tab`}
          type="button"
          role="tab"
          aria-selected={mode === "preview"}
          aria-controls={`${baseId}-rich-text-preview-panel`}
          className="simple-rich-text-mode-tab"
          data-active={mode === "preview" ? "true" : "false"}
          onClick={() => setMode("preview")}
        >
          {labels.previewMode}
        </button>
      </div>
      {mode === "source" ? (
        <div
          id={`${baseId}-rich-text-source-panel`}
          className="simple-rich-text-panel"
          role="tabpanel"
          aria-labelledby={`${baseId}-rich-text-source-tab`}
        >
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
          <p id={`${baseId}-rich-text-source-help`} className="simple-rich-text-help">
            {labels.sourceHelp}
          </p>
          <textarea
            id={`${baseId}-input`}
            ref={textAreaRef}
            name={name}
            rows={rows}
            required={required}
            value={value}
            onBlur={() => onChange(normalizeRichTextEditorSource(value))}
            onChange={(event) => onChange(event.target.value)}
            className="input-base simple-rich-text-textarea"
          />
        </div>
      ) : (
        <div
          id={`${baseId}-rich-text-preview-panel`}
          className="simple-rich-text-preview-panel"
          role="tabpanel"
          aria-labelledby={`${baseId}-rich-text-preview-tab`}
        >
          {previewContent == null ? (
            <p id={`${baseId}-rich-text-preview-empty`} className="simple-rich-text-preview-empty">
              {labels.previewEmpty}
            </p>
          ) : (
            <FormattedRecipeContent
              id={`${baseId}-rich-text-preview-content`}
              baseId={`${baseId}-rich-text-preview`}
              className="formatted-recipe-content simple-rich-text-preview-content"
              content={previewContent}
            />
          )}
        </div>
      )}
    </div>
  );
}
