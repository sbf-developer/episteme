import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function reorderByIds(
  orderedIds: string[],
  update: (id: string, position: number) => Prisma.PrismaPromise<unknown>
) {
  await prisma.$transaction(
    orderedIds.map((id, position) => update(id, position))
  );
}
