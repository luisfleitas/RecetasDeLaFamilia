import { randomUUID } from "node:crypto";
import { parseImportMetadataJson } from "@/lib/application/recipes/import-session-metadata";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { getPrisma } from "@/lib/prisma";

const storageProvider = buildImageStorageProvider();

export type ImportSourceType = "txt" | "docx" | "doc" | "pdf" | "image" | "paste";

export type RecipeSourceDocumentMetadata = {
  inputMode: "document" | "handwritten";
  publiclyVisible: boolean;
  sourceImageVisibility: "private" | "public" | null;
  isPrimary?: boolean;
};

type StageImportSourceDocumentInput = {
  userId: number;
  importSessionId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: ImportSourceType;
  bytes: Buffer;
};

export type StagedHandwrittenSourceDocument = {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  sourceType: "image";
  bytes: Buffer;
};

export type ImportSessionSourceDocumentRef = {
  id: number;
  sourceType: ImportSourceType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
};

type HandwrittenSourceMetadata = {
  inputMode: "handwritten";
  uploadBatchId: string;
  clientFileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned.length > 0 ? cleaned : "source-document";
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export function buildHandwrittenSourceMetadata(input: {
  uploadBatchId: string;
  clientFileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}): string {
  return JSON.stringify({
    inputMode: "handwritten",
    uploadBatchId: input.uploadBatchId,
    clientFileId: input.clientFileId,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  } satisfies HandwrittenSourceMetadata);
}

function parseHandwrittenSourceMetadata(value: string | null): HandwrittenSourceMetadata | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<HandwrittenSourceMetadata> | null;
    if (
      !parsed ||
      parsed.inputMode !== "handwritten" ||
      typeof parsed.uploadBatchId !== "string" ||
      typeof parsed.clientFileId !== "string" ||
      typeof parsed.originalFilename !== "string" ||
      typeof parsed.mimeType !== "string" ||
      typeof parsed.sizeBytes !== "number"
    ) {
      return null;
    }

    return {
      inputMode: "handwritten",
      uploadBatchId: parsed.uploadBatchId,
      clientFileId: parsed.clientFileId,
      originalFilename: parsed.originalFilename,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.sizeBytes,
    };
  } catch {
    return null;
  }
}

export async function createStagedHandwrittenSourceDocument(input: {
  userId: number;
  uploadBatchId: string;
  clientFileId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}) {
  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      create: (args: {
        data: {
          importSessionId: null;
          recipeId: null;
          uploadedByUserId: number;
          originalFilename: string;
          mimeType: string;
          sizeBytes: number;
          storageKey: string;
          sourceType: "image";
          metadataJson: string;
        };
        select: {
          id: true;
          originalFilename: true;
          mimeType: true;
          sizeBytes: true;
          sourceType: true;
          storageKey: true;
          metadataJson: true;
          createdAt: true;
        };
      }) => Promise<{
        id: number;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
        sourceType: string;
        storageKey: string;
        metadataJson: string | null;
        createdAt: Date;
      }>;
    };
  };

  return prismaDb.recipeSourceDocument.create({
    data: {
      importSessionId: null,
      recipeId: null,
      uploadedByUserId: input.userId,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType || "application/octet-stream",
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      sourceType: "image",
      metadataJson: buildHandwrittenSourceMetadata(input),
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      sourceType: true,
      storageKey: true,
      metadataJson: true,
      createdAt: true,
    },
  });
}

export async function listStagedHandwrittenSourceDocuments(input: {
  userId: number;
  uploadBatchId: string;
}) {
  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      findMany: (args: {
        where: {
          uploadedByUserId: number;
          recipeId: null;
          importSessionId: null;
          sourceType: "image";
        };
        select: {
          id: true;
          originalFilename: true;
          mimeType: true;
          sizeBytes: true;
          sourceType: true;
          storageKey: true;
          metadataJson: true;
          createdAt: true;
        };
        orderBy: { createdAt: "asc" };
      }) => Promise<Array<{
        id: number;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
        sourceType: string;
        storageKey: string;
        metadataJson: string | null;
        createdAt: Date;
      }>>;
    };
  };

  const docs = await prismaDb.recipeSourceDocument.findMany({
    where: {
      uploadedByUserId: input.userId,
      recipeId: null,
      importSessionId: null,
      sourceType: "image",
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      sourceType: true,
      storageKey: true,
      metadataJson: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return docs
    .map((doc) => {
      const metadata = parseHandwrittenSourceMetadata(doc.metadataJson);
      return metadata?.uploadBatchId === input.uploadBatchId
        ? {
            ...doc,
            clientFileId: metadata.clientFileId,
          }
        : null;
    })
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc));
}

export async function loadOrderedStagedHandwrittenSourceDocuments(input: {
  userId: number;
  sourceDocumentIds: number[];
}): Promise<StagedHandwrittenSourceDocument[]> {
  if (input.sourceDocumentIds.length === 0) {
    return [];
  }

  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      findMany: (args: {
        where: {
          id: { in: number[] };
          uploadedByUserId: number;
          recipeId: null;
          importSessionId: null;
          sourceType: "image";
        };
        select: {
          id: true;
          originalFilename: true;
          mimeType: true;
          sizeBytes: true;
          sourceType: true;
          storageKey: true;
          metadataJson: true;
        };
      }) => Promise<Array<{
        id: number;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
        sourceType: string;
        storageKey: string;
        metadataJson: string | null;
      }>>;
    };
  };

  const docs = await prismaDb.recipeSourceDocument.findMany({
    where: {
      id: { in: input.sourceDocumentIds },
      uploadedByUserId: input.userId,
      recipeId: null,
      importSessionId: null,
      sourceType: "image",
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      sourceType: true,
      storageKey: true,
      metadataJson: true,
    },
  });
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const orderedDocs = input.sourceDocumentIds.map((id) => byId.get(id));

  if (orderedDocs.some((doc) => !doc)) {
    throw new Error("Staged handwritten source image not found.");
  }

  return Promise.all(
    orderedDocs.map(async (doc) => {
      const metadata = parseHandwrittenSourceMetadata(doc!.metadataJson);
      if (!metadata) {
        throw new Error("Staged handwritten source image not found.");
      }

      return {
        id: doc!.id,
        originalFilename: doc!.originalFilename,
        mimeType: doc!.mimeType,
        sizeBytes: doc!.sizeBytes,
        storageKey: doc!.storageKey,
        sourceType: "image",
        bytes: await streamToBuffer(await storageProvider.getObjectStream(doc!.storageKey)),
      };
    }),
  );
}

export async function attachStagedSourceDocumentsToImportSession(input: {
  userId: number;
  importSessionId: string;
  sourceDocumentIds: number[];
}) {
  if (input.sourceDocumentIds.length === 0) {
    return [];
  }

  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      updateMany: (args: {
        where: {
          id: { in: number[] };
          uploadedByUserId: number;
          recipeId: null;
          importSessionId: null;
        };
        data: { importSessionId: string };
      }) => Promise<{ count: number }>;
      findMany: (args: {
        where: { id: { in: number[] }; uploadedByUserId: number; importSessionId: string };
        select: {
          id: true;
          sourceType: true;
          originalFilename: true;
          mimeType: true;
          sizeBytes: true;
          storageKey: true;
        };
      }) => Promise<ImportSessionSourceDocumentRef[]>;
    };
  };

  const { count } = await prismaDb.recipeSourceDocument.updateMany({
    where: {
      id: { in: input.sourceDocumentIds },
      uploadedByUserId: input.userId,
      recipeId: null,
      importSessionId: null,
    },
    data: { importSessionId: input.importSessionId },
  });

  if (count !== input.sourceDocumentIds.length) {
    throw new Error("Staged handwritten source image not found.");
  }

  const docs = await prismaDb.recipeSourceDocument.findMany({
    where: {
      id: { in: input.sourceDocumentIds },
      uploadedByUserId: input.userId,
      importSessionId: input.importSessionId,
    },
    select: {
      id: true,
      sourceType: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      storageKey: true,
    },
  });
  const byId = new Map(docs.map((doc) => [doc.id, doc]));

  const orderedDocs: ImportSessionSourceDocumentRef[] = [];
  for (const id of input.sourceDocumentIds) {
    const doc = byId.get(id);
    if (doc) {
      orderedDocs.push(doc);
    }
  }

  return orderedDocs;
}

export async function stageImportSourceDocument(input: StageImportSourceDocumentInput) {
  const safeName = sanitizeFilename(input.originalFilename);
  const stagingKey = `imports/staging/${input.importSessionId}/${randomUUID()}-${safeName}`;

  await storageProvider.putObject({
    key: stagingKey,
    buffer: input.bytes,
    contentType: input.mimeType || "application/octet-stream",
  });

  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      create: (args: {
        data: {
          importSessionId: string;
          uploadedByUserId: number;
          originalFilename: string;
          mimeType: string;
          sizeBytes: number;
          storageKey: string;
          sourceType: ImportSourceType;
          metadataJson?: string | null;
        };
        select: {
          id: true;
          importSessionId: true;
          originalFilename: true;
          mimeType: true;
          sizeBytes: true;
          sourceType: true;
          storageKey: true;
          createdAt: true;
        };
      }) => Promise<unknown>;
    };
  };
  try {
    return await prismaDb.recipeSourceDocument.create({
      data: {
        importSessionId: input.importSessionId,
        uploadedByUserId: input.userId,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType || "application/octet-stream",
        sizeBytes: input.sizeBytes,
        storageKey: stagingKey,
        sourceType: input.sourceType,
        metadataJson: null,
      },
      select: {
        id: true,
        importSessionId: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        sourceType: true,
        storageKey: true,
        createdAt: true,
      },
    });
  } catch (error) {
    try {
      await storageProvider.deleteObject(stagingKey);
    } catch {
      // Keep the original database error if best-effort storage cleanup also fails.
    }

    throw error;
  }
}

export async function promoteImportSessionSourceDocuments(input: {
  userId: number;
  importSessionId: string;
  recipeId: number;
}) {
  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    importSession: {
      findUnique: (args: {
        where: { id: string };
        select: { metadataJson: true };
      }) => Promise<{ metadataJson: string | null } | null>;
    };
    recipeSourceDocument: {
      findMany: (args: {
        where: {
          importSessionId: string;
          uploadedByUserId: number;
          recipeId: null;
        };
        select: {
          id: true;
          originalFilename: true;
          mimeType: true;
          storageKey: true;
          sourceType: true;
        };
      }) => Promise<Array<{ id: number; originalFilename: string; mimeType: string; storageKey: string; sourceType: string }>>;
      update: (args: {
        where: { id: number };
        data: { recipeId: number; storageKey: string; metadataJson: string | null };
      }) => Promise<unknown>;
    };
  };

  const importSession = await prismaDb.importSession.findUnique({
    where: { id: input.importSessionId },
    select: { metadataJson: true },
  });
  const importSessionMetadata = parseImportMetadataJson(importSession?.metadataJson ?? null);
  const recipeSourceDocumentMetadata: RecipeSourceDocumentMetadata = {
    inputMode: importSessionMetadata?.inputMode ?? "document",
    publiclyVisible: importSessionMetadata?.handwritten?.sourceImageVisibility === "public",
    sourceImageVisibility: importSessionMetadata?.handwritten?.sourceImageVisibility ?? null,
    isPrimary: false,
  };

  const docs = await prismaDb.recipeSourceDocument.findMany({
    where: {
      importSessionId: input.importSessionId,
      uploadedByUserId: input.userId,
      recipeId: null,
    },
    select: {
      id: true,
      originalFilename: true,
      mimeType: true,
      storageKey: true,
      sourceType: true,
    },
  });

  for (const doc of docs) {
    const safeName = sanitizeFilename(doc.originalFilename);
    const finalKey = `recipes/${input.recipeId}/sources/${doc.id}-${safeName}`;
    const currentStream = await storageProvider.getObjectStream(doc.storageKey);
    const bytes = await streamToBuffer(currentStream);

    await storageProvider.putObject({
      key: finalKey,
      buffer: bytes,
      contentType: doc.mimeType || "application/octet-stream",
    });
    await storageProvider.deleteObject(doc.storageKey);

    await prismaDb.recipeSourceDocument.update({
      where: { id: doc.id },
      data: {
        recipeId: input.recipeId,
        storageKey: finalKey,
        metadataJson:
          doc.sourceType === "image"
            ? JSON.stringify(recipeSourceDocumentMetadata)
            : JSON.stringify({
                inputMode: "document",
                publiclyVisible: false,
                sourceImageVisibility: null,
              } satisfies RecipeSourceDocumentMetadata),
      },
    });
  }
}

export async function markRecipeSourceDocumentPrimary(input: {
  userId: number;
  recipeId: number;
  sourceDocumentId: number | null;
}) {
  const prisma = await getPrisma();
  const prismaDb = prisma as unknown as {
    recipeSourceDocument: {
      findMany: (args: {
        where: { recipeId: number; uploadedByUserId: number; sourceType: "image" };
        select: {
          id: true;
          metadataJson: true;
        };
      }) => Promise<Array<{ id: number; metadataJson: string | null }>>;
      update: (args: {
        where: { id: number };
        data: { metadataJson: string };
      }) => Promise<unknown>;
    };
  };

  const sourceDocuments = await prismaDb.recipeSourceDocument.findMany({
    where: {
      recipeId: input.recipeId,
      uploadedByUserId: input.userId,
      sourceType: "image",
    },
    select: {
      id: true,
      metadataJson: true,
    },
  });

  if (
    input.sourceDocumentId != null &&
    !sourceDocuments.some((sourceDocument) => sourceDocument.id === input.sourceDocumentId)
  ) {
    throw new Error("primary source document does not belong to this recipe");
  }

  for (const sourceDocument of sourceDocuments) {
    const metadata = parseRecipeSourceDocumentMetadata(sourceDocument.metadataJson) ?? {
      inputMode: "handwritten",
      publiclyVisible: false,
      sourceImageVisibility: "private",
      isPrimary: false,
    };

    await prismaDb.recipeSourceDocument.update({
      where: { id: sourceDocument.id },
      data: {
        metadataJson: JSON.stringify({
          ...metadata,
          isPrimary: input.sourceDocumentId === sourceDocument.id,
        } satisfies RecipeSourceDocumentMetadata),
      },
    });
  }
}

export function parseRecipeSourceDocumentMetadata(value: string | null): RecipeSourceDocumentMetadata | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<RecipeSourceDocumentMetadata> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      inputMode: parsed.inputMode === "handwritten" ? "handwritten" : "document",
      publiclyVisible: parsed.publiclyVisible === true,
      sourceImageVisibility: parsed.sourceImageVisibility === "public" ? "public" : parsed.sourceImageVisibility === "private" ? "private" : null,
      isPrimary: parsed.isPrimary === true,
    };
  } catch {
    return null;
  }
}

export async function cleanupExpiredImportSessions(now = new Date()) {
  const prisma = await getPrisma();
  const ttlHours = Number(process.env.RECIPE_IMPORT_SESSION_TTL_HOURS ?? 24);
  const stagedSourceCutoff = new Date(
    now.getTime() - (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 24) * 60 * 60 * 1000,
  );
  const prismaDb = prisma as unknown as {
    importSession: {
      findMany: (args: {
        where: {
          expiresAt: { lt: Date };
          status: { in: Array<"PARSED" | "FAILED" | "EXPIRED"> };
        };
        select: { id: true };
      }) => Promise<Array<{ id: string }>>;
      updateMany: (args: {
        where: { id: { in: string[] }; status: { in: Array<"PARSED" | "FAILED"> } };
        data: { status: "EXPIRED" };
      }) => Promise<{ count: number }>;
      deleteMany: (args: {
        where: { id: { in: string[] } };
      }) => Promise<{ count: number }>;
    };
    recipeSourceDocument: {
      findMany: (args: {
        where:
          | { recipeId: null; importSessionId: { in: string[] } }
          | {
              recipeId: null;
              importSessionId: null;
              sourceType: "image";
              createdAt: { lt: Date };
            };
        select: { id: true; storageKey: true };
      }) => Promise<Array<{ id: number; storageKey: string }>>;
      deleteMany: (args: { where: { id: { in: number[] } } }) => Promise<{ count: number }>;
    };
  };

  const expiredSessions = await prismaDb.importSession.findMany({
    where: {
      expiresAt: { lt: now },
      status: { in: ["PARSED", "FAILED", "EXPIRED"] },
    },
    select: { id: true },
  });

  const orphanStagedDocs = await prismaDb.recipeSourceDocument.findMany({
    where: {
      recipeId: null,
      importSessionId: null,
      sourceType: "image",
      createdAt: { lt: stagedSourceCutoff },
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

  const expiredSessionIds = expiredSessions.map((session) => session.id);
  const { count: markedExpiredCount } =
    expiredSessionIds.length > 0
      ? await prismaDb.importSession.updateMany({
          where: {
            id: { in: expiredSessionIds },
            status: { in: ["PARSED", "FAILED"] },
          },
          data: { status: "EXPIRED" },
        })
      : { count: 0 };

  const sessionStaleDocs =
    expiredSessionIds.length > 0
      ? await prismaDb.recipeSourceDocument.findMany({
          where: {
            recipeId: null,
            importSessionId: { in: expiredSessionIds },
          },
          select: {
            id: true,
            storageKey: true,
          },
        })
      : [];

  const staleDocs = [...sessionStaleDocs, ...orphanStagedDocs];

  let deletedSourceFileCount = 0;
  for (const doc of staleDocs) {
    try {
      await storageProvider.deleteObject(doc.storageKey);
      deletedSourceFileCount += 1;
    } catch {
      // Ignore storage misses to keep cleanup idempotent.
    }
  }

  const staleDocIds = staleDocs.map((doc) => doc.id);
  const { count: deletedSourceDocumentCount } =
    staleDocIds.length > 0
      ? await prismaDb.recipeSourceDocument.deleteMany({
          where: { id: { in: staleDocIds } },
        })
      : { count: 0 };

  const { count: deletedSessionCount } = await prismaDb.importSession.deleteMany({
    where: { id: { in: expiredSessionIds } },
  });

  return {
    expiredSessionCount: expiredSessionIds.length,
    markedExpiredCount,
    deletedSessionCount,
    deletedSourceDocumentCount,
    deletedSourceFileCount,
  };
}
