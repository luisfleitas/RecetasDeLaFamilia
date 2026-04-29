import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";
import {
  parseImportMetadataJson,
  parseImportSourceRefsJson,
  parseImportWarningsJson,
  type HandwrittenSourceImageVisibility,
  type ImportSessionMetadata,
  type ImportSessionSourceRef,
} from "@/lib/application/recipes/import-session-metadata";
import { getImportWarningsForDraft, type ImportWarning } from "@/lib/application/recipes/import-warnings";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";
import { normalizeRecipeLanguage, type RecipeLanguage } from "@/lib/domain/recipe-language";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type ImportSessionResponse = {
  importSessionId: string;
  draft: ImportedRecipeDraft;
  warnings: ImportWarning[];
  sourceRefs: ImportSessionSourceRef[];
  providerName: string | null;
  providerModel: string | null;
  promptVersion: string | null;
  metadata: ImportSessionMetadata | null;
};

function parseDraftFromUnknown(value: unknown, fallbackLanguage?: RecipeLanguage): ImportedRecipeDraft {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid imported draft payload.");
  }

  const draft = value as Partial<ImportedRecipeDraft>;
  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  const descriptionRaw = typeof draft.description === "string" ? draft.description.trim() : "";
  const stepsMarkdown = typeof draft.stepsMarkdown === "string" ? draft.stepsMarkdown.trim() : "";
  const ingredientsRaw = Array.isArray(draft.ingredients) ? draft.ingredients : [];

  const ingredients = ingredientsRaw.map((ingredient, index) => {
    const parsed = ingredient as {
      name?: unknown;
      qty?: unknown;
      unit?: unknown;
      notes?: unknown;
    };

    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    const unit = typeof parsed.unit === "string" ? parsed.unit.trim() : "";
    const qty = typeof parsed.qty === "number" ? parsed.qty : Number(parsed.qty);
    const notes =
      typeof parsed.notes === "string" && parsed.notes.trim().length > 0
        ? parsed.notes.trim()
        : null;

    if (!name || !unit || !Number.isFinite(qty) || qty <= 0) {
      throw new Error("Invalid imported ingredient values.");
    }

    return {
      name,
      qty,
      unit,
      notes,
      position: index + 1,
    };
  });

  if (!stepsMarkdown || ingredients.length === 0) {
    throw new Error("Ingredients and steps are required.");
  }

  return {
    title,
    description: descriptionRaw.length > 0 ? descriptionRaw : null,
    stepsMarkdown,
    language: normalizeRecipeLanguage(draft.language, fallbackLanguage),
    ingredients,
  };
}

async function readImportSession(sessionId: string) {
  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    importSession: {
      findUnique: (args: {
        where: { id: string };
        select: {
          id: true;
          userId: true;
          status: true;
          draftJson: true;
          warningsJson: true;
          sourceRefsJson: true;
          metadataJson: true;
          providerName: true;
          providerModel: true;
          promptVersion: true;
          expiresAt: true;
        };
      }) => Promise<{
        id: string;
        userId: number;
        status: "PARSED" | "CONFIRMED" | "EXPIRED" | "FAILED";
        draftJson: string;
        warningsJson: string | null;
        sourceRefsJson: string | null;
        metadataJson: string | null;
        providerName: string | null;
        providerModel: string | null;
        promptVersion: string | null;
        expiresAt: Date;
      } | null>;
      update: (args: {
        where: { id: string };
        data: Partial<{
          status: "EXPIRED";
          draftJson: string;
          warningsJson: string;
          metadataJson: string;
        }>;
      }) => Promise<unknown>;
    };
  };
  const session = await prismaDb.importSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      draftJson: true,
      warningsJson: true,
      sourceRefsJson: true,
      metadataJson: true,
      providerName: true,
      providerModel: true,
      promptVersion: true,
      expiresAt: true,
    },
  });

  return { prisma: prismaDb, session };
}

async function maybeExpireSession(
  session: { id: string; status: "PARSED" | "CONFIRMED" | "EXPIRED" | "FAILED"; expiresAt: Date },
  prisma: {
    importSession: {
      update: (args: { where: { id: string }; data: { status: "EXPIRED" } }) => Promise<unknown>;
    };
  },
) {
  const isExpired = session.status === "EXPIRED" || session.expiresAt.getTime() < Date.now();
  if (!isExpired) {
    return false;
  }

  if (session.status !== "EXPIRED") {
    await prisma.importSession.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
  }

  return true;
}

export async function GET(request: Request, { params }: Params) {
  if (!isRecipeImportEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  if (!sessionId || sessionId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }

  const { prisma, session } = await readImportSession(sessionId);
  if (!session || session.userId !== authUser.userId) {
    return NextResponse.json({ error: "Import session not found." }, { status: 404 });
  }

  if (await maybeExpireSession(session, prisma)) {
    return NextResponse.json(
      { error: "Import session expired.", code: "IMPORT_SESSION_EXPIRED" },
      { status: 410 },
    );
  }

  let draft: ImportedRecipeDraft;
  try {
    draft = JSON.parse(session.draftJson) as ImportedRecipeDraft;
  } catch {
    return NextResponse.json({ error: "Corrupt import session draft." }, { status: 500 });
  }

  const response: ImportSessionResponse = {
    importSessionId: session.id,
    draft,
    warnings:
      session.warningsJson != null
        ? parseImportWarningsJson(session.warningsJson)
        : getImportWarningsForDraft(draft),
    sourceRefs: parseImportSourceRefsJson(session.sourceRefsJson),
    providerName: session.providerName,
    providerModel: session.providerModel,
    promptVersion: session.promptVersion,
    metadata: parseImportMetadataJson(session.metadataJson),
  };
  return NextResponse.json(response);
}

function mergeImportSessionMetadata(
  currentMetadata: ImportSessionMetadata | null,
  update: unknown,
  warnings: ImportWarning[],
  sourceRefs: ImportSessionSourceRef[],
  providerName: string | null,
  providerModel: string | null,
  promptVersion: string | null,
): ImportSessionMetadata {
  const base: ImportSessionMetadata = currentMetadata ?? {
    inputMode: "document",
    warnings,
    sourceRefs,
    providerName,
    providerModel,
    promptVersion,
    handwritten: null,
  };

  const next: ImportSessionMetadata = {
    ...base,
    warnings,
    sourceRefs,
    providerName,
    providerModel,
    promptVersion,
  };

  if (!update || typeof update !== "object") {
    return next;
  }

  const typed = update as {
    handwritten?: {
      sourceImageVisibility?: unknown;
    };
  };

  const sourceImageVisibility = typed.handwritten?.sourceImageVisibility;
  if (next.handwritten && (sourceImageVisibility === "private" || sourceImageVisibility === "public")) {
    next.handwritten = {
      ...next.handwritten,
      sourceImageVisibility: sourceImageVisibility as HandwrittenSourceImageVisibility,
    };
  }

  return next;
}

export async function PATCH(request: Request, { params }: Params) {
  if (!isRecipeImportEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authUser = getAuthUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  if (!sessionId || sessionId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { prisma, session } = await readImportSession(sessionId);
  if (!session || session.userId !== authUser.userId) {
    return NextResponse.json({ error: "Import session not found." }, { status: 404 });
  }

  if (await maybeExpireSession(session, prisma)) {
    return NextResponse.json(
      { error: "Import session expired.", code: "IMPORT_SESSION_EXPIRED" },
      { status: 410 },
    );
  }

  if (session.status !== "PARSED") {
    return NextResponse.json(
      { error: "Import session can no longer be edited." },
      { status: 409 },
    );
  }

  const typedBody = body as { draft?: unknown; metadata?: unknown };
  let currentDraft: ImportedRecipeDraft | null = null;
  try {
    currentDraft = JSON.parse(session.draftJson) as ImportedRecipeDraft;
  } catch {
    currentDraft = null;
  }

  const draftInput = typedBody.draft;
  let draft: ImportedRecipeDraft;
  try {
    draft = parseDraftFromUnknown(draftInput, currentDraft?.language);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid imported draft payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const warnings = getImportWarningsForDraft(draft);
  const sourceRefs = parseImportSourceRefsJson(session.sourceRefsJson);
  const currentMetadata = parseImportMetadataJson(session.metadataJson);
  const metadata = mergeImportSessionMetadata(
    currentMetadata,
    typedBody.metadata,
    warnings,
    sourceRefs,
    session.providerName,
    session.providerModel,
    session.promptVersion,
  );

  await prisma.importSession.update({
    where: { id: session.id },
    data: {
      draftJson: JSON.stringify(draft),
      warningsJson: JSON.stringify(warnings),
      metadataJson: JSON.stringify(metadata),
    },
  });

  return NextResponse.json({
    importSessionId: session.id,
    draft,
    warnings,
    sourceRefs,
    providerName: session.providerName,
    providerModel: session.providerModel,
    promptVersion: session.promptVersion,
    metadata,
  } satisfies ImportSessionResponse);
}
