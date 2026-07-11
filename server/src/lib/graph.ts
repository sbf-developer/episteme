import type { EntityType } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function removeEntityFromGraph(userId: string, type: EntityType, id: string) {
  const nodeKey = `${type}:${id}`;
  await prisma.$transaction([
    prisma.graphLayout.deleteMany({ where: { userId, nodeKey } }),
    prisma.connection.deleteMany({
      where: {
        userId,
        OR: [
          { sourceType: type, sourceId: id },
          { targetType: type, targetId: id },
        ],
      },
    }),
  ]);
}
