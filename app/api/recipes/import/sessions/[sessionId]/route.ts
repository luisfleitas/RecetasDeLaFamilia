import { isRecipeImportEnabled } from "@/lib/application/recipes/import-config";
import { getImportWarningsForDraft, type ImportWarning } from "@/lib/application/recipes/import-warnings";
import type { ImportedRecipeDraft } from "@/lib/application/recipes/text-document-import";
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
};

function parseDraftFromUnknown(value: unknown): ImportedRecipeDraft {
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

  if (!title || !stepsMarkdown || ingredients.length === 0) {
    throw new Error("Title, ingredients, and steps are required.");
  }

  return {
    title,
    description: descriptionRaw.length > 0 ? descriptionRaw : null,
    stepsMarkdown,
    ingredients,
  };
}

async function readImportSession(sessionId: string) {
  const prisma = await getPrisma();
  const session = await prisma.importSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      status: true,
      draftJson: true,
      expiresAt: true,
    },
  });

  return { prisma, session };
}

async function maybeExpireSession(
  session: { id: string; status: "PARSED" | "CONFIRMED" | "EXPIRED" | "FAILED"; expiresAt: Date },
  prisma: Awaited<ReturnType<typeof getPrisma>>,
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
    warnings: getImportWarningsForDraft(draft),
  };
  return NextResponse.json(response);
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

  const draftInput = (body as { draft?: unknown }).draft;
  let draft: ImportedRecipeDraft;
  try {
    draft = parseDraftFromUnknown(draftInput);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid imported draft payload.";
    return NextResponse.json({ error: message }, { status: 400 });
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

  await prisma.importSession.update({
    where: { id: session.id },
    data: {
      draftJson: JSON.stringify(draft),
    },
  });

  return NextResponse.json({
    importSessionId: session.id,
    draft,
    warnings: getImportWarningsForDraft(draft),
  } satisfies ImportSessionResponse);
}
