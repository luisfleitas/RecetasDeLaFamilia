import { randomUUID } from "node:crypto";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";
import { getPrisma } from "@/lib/prisma";

const storageProvider = buildImageStorageProvider();

export type ImportSourceType = "txt" | "pdf" | "image" | "paste";

type StageImportSourceDocumentInput = {
  userId: number;
  importSessionId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: ImportSourceType;
  bytes: Buffer;
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
        };
      }) => Promise<Array<{ id: number; originalFilename: string; mimeType: string; storageKey: string }>>;
      update: (args: {
        where: { id: number };
        data: { recipeId: number; storageKey: string };
      }) => Promise<unknown>;
    };
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
      },
    });
  }
}

export async function cleanupExpiredImportSessions(now = new Date()) {
  const prisma = await getPrisma();
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
        where: { recipeId: null; importSessionId: { in: string[] } };
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

  const expiredSessionIds = expiredSessions.map((session) => session.id);
  if (expiredSessionIds.length === 0) {
    return {
      expiredSessionCount: 0,
      markedExpiredCount: 0,
      deletedSessionCount: 0,
      deletedSourceDocumentCount: 0,
      deletedSourceFileCount: 0,
    };
  }

  const { count: markedExpiredCount } = await prismaDb.importSession.updateMany({
    where: {
      id: { in: expiredSessionIds },
      status: { in: ["PARSED", "FAILED"] },
    },
    data: { status: "EXPIRED" },
  });

  const staleDocs = await prismaDb.recipeSourceDocument.findMany({
    where: {
      recipeId: null,
      importSessionId: { in: expiredSessionIds },
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

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
