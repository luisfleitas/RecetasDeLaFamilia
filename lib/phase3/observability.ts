import { randomUUID } from "node:crypto";
import type { FamilyRole } from "@prisma/client";

type Phase3PrismaClient = {
  metricEvent: {
    create: (args: {
      data: {
        metricName: string;
        requestId: string;
        actorUserId: number | null;
        familyId: number | null;
        inviteId: number | null;
        statusCode: number | null;
        metadataJson: string | null;
      };
    }) => Promise<unknown>;
  };
  familyAuditEvent: {
    create: (args: {
      data: {
        eventType: string;
        requestId: string;
        actorUserId: number | null;
        familyId: number | null;
        targetUserId: number | null;
        inviteId: number | null;
        oldRole: FamilyRole | null;
        newRole: FamilyRole | null;
        metadataJson: string | null;
      };
    }) => Promise<unknown>;
  };
};

export function getRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && incoming.length > 0 ? incoming : randomUUID();
}

export function withRequestId(response: Response, requestId: string): Response {
  response.headers.set("x-request-id", requestId);
  return response;
}

type RecordMetricInput = {
  metricName: string;
  requestId: string;
  actorUserId?: number | null;
  familyId?: number | null;
  inviteId?: number | null;
  statusCode?: number | null;
  metadata?: Record<string, unknown>;
};

export async function recordMetric(prisma: Phase3PrismaClient, input: RecordMetricInput) {
  await prisma.metricEvent.create({
    data: {
      metricName: input.metricName,
      requestId: input.requestId,
      actorUserId: input.actorUserId ?? null,
      familyId: input.familyId ?? null,
      inviteId: input.inviteId ?? null,
      statusCode: input.statusCode ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

type RecordAuditInput = {
  eventType: string;
  requestId: string;
  actorUserId?: number | null;
  familyId?: number | null;
  targetUserId?: number | null;
  inviteId?: number | null;
  oldRole?: FamilyRole | null;
  newRole?: FamilyRole | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditEvent(prisma: Phase3PrismaClient, input: RecordAuditInput) {
  await prisma.familyAuditEvent.create({
    data: {
      eventType: input.eventType,
      requestId: input.requestId,
      actorUserId: input.actorUserId ?? null,
      familyId: input.familyId ?? null,
      targetUserId: input.targetUserId ?? null,
      inviteId: input.inviteId ?? null,
      oldRole: input.oldRole ?? null,
      newRole: input.newRole ?? null,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
