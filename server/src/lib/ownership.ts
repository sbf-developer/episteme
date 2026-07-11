import type { EntityType } from "@prisma/client";
import { prisma } from "./prisma.js";

export class OwnershipError extends Error {
  constructor(message = "Invalid reference") {
    super(message);
    this.name = "OwnershipError";
  }
}

export async function assertGoalOwned(userId: string, goalId: string) {
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId } });
  if (!goal) throw new OwnershipError("Goal not found");
}

export async function assertActionOwned(userId: string, actionId: string) {
  const action = await prisma.action.findFirst({ where: { id: actionId, userId } });
  if (!action) throw new OwnershipError("Action not found");
}

export async function assertDocumentOwned(userId: string, documentId: string) {
  const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
  if (!doc) throw new OwnershipError("Document not found");
}

export async function assertEntityOwned(
  userId: string,
  type: EntityType,
  id: string
) {
  const checks: Record<EntityType, () => Promise<unknown>> = {
    DOCUMENT: () => prisma.document.findFirst({ where: { id, userId } }),
    GOAL: () => prisma.goal.findFirst({ where: { id, userId } }),
    ACTION: () => prisma.action.findFirst({ where: { id, userId } }),
    CALENDAR_EVENT: () => prisma.calendarEvent.findFirst({ where: { id, userId } }),
    FILE: () => prisma.fileUpload.findFirst({ where: { id, userId } }),
    DO_ITEM: () => prisma.doItem.findFirst({ where: { id, userId } }),
  };

  const entity = await checks[type]();
  if (!entity) throw new OwnershipError(`${type} not found`);
}
export async function validateGoalRef(userId: string, goalId: string | null | undefined) {
  if (goalId) await assertGoalOwned(userId, goalId);
}

export async function validateActionRef(userId: string, actionId: string | null | undefined) {
  if (actionId) await assertActionOwned(userId, actionId);
}

export async function validateDocumentParent(
  userId: string,
  parentId: string | null | undefined,
  selfId?: string
) {
  if (!parentId) return;
  if (selfId && parentId === selfId) throw new OwnershipError("Cannot set self as parent");
  await assertDocumentOwned(userId, parentId);
}

export async function validateGoalParent(
  userId: string,
  parentId: string | null | undefined,
  selfId?: string
) {
  if (!parentId) return;
  if (selfId && parentId === selfId) throw new OwnershipError("Cannot set self as parent");
  await assertGoalOwned(userId, parentId);
}
