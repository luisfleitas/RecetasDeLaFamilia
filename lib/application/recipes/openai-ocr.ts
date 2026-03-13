import {
  getRecipeImportOcrConfidenceThreshold,
  getRecipeImportOcrOpenAiModel,
  hasRecipeImportOpenAiOcrFallback,
  shouldForceRecipeImportOpenAiOcr,
} from "@/lib/application/recipes/import-config";

type OpenAiOcrInput = {
  bytes: Buffer;
  mimeType: string;
};

export type OpenAiOcrResult = {
  text: string;
  model: string;
};

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const typed = payload as {
    output_text?: unknown;
    output?: Array<{
      type?: string;
      role?: string;
      content?: Array<{ type?: string; text?: unknown }>;
    }>;
  };

  if (typeof typed.output_text === "string" && typed.output_text.trim().length > 0) {
    return typed.output_text.trim();
  }

  const parts: string[] = [];
  for (const item of typed.output ?? []) {
    if (item.type !== "message" || item.role !== "assistant") {
      continue;
    }

    for (const contentItem of item.content ?? []) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        const text = contentItem.text.trim();
        if (text.length > 0) {
          parts.push(text);
        }
      }
    }
  }

  return parts.join("\n").trim();
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const typed = payload as {
    error?: {
      message?: unknown;
    };
  };

  return typeof typed.error?.message === "string" ? typed.error.message : null;
}

export function shouldUseOpenAiOcrFallback(confidence: number): boolean {
  if (shouldForceRecipeImportOpenAiOcr()) {
    return true;
  }

  return confidence < getRecipeImportOcrConfidenceThreshold();
}

export function isOpenAiOcrFallbackConfigured(): boolean {
  return hasRecipeImportOpenAiOcrFallback();
}

export async function runOpenAiOcrFallback(input: OpenAiOcrInput): Promise<OpenAiOcrResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OpenAI OCR fallback is not configured.");
  }

  const model = getRecipeImportOcrOpenAiModel();
  const base64Image = input.bytes.toString("base64");
  const imageUrl = `data:${input.mimeType};base64,${base64Image}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract the recipe text from this image. Return only the text content, preserving line breaks where possible. Do not add commentary.",
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
    }),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? "OpenAI OCR fallback request failed.";
    throw new Error(message);
  }

  const text = extractOutputText(payload);
  if (!text) {
    throw new Error("OpenAI OCR fallback did not return text.");
  }

  return {
    text,
    model,
  };
}
