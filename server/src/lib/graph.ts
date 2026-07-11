import type { EntityType, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

type Db = Prisma.TransactionClient | typeof prisma;

export async function removeEntityFromGraph(
  userId: string,
  type: EntityType,
  id: string,
  db: Db = prisma
) {
  const nodeKey = `${type}:${id}`;
  await db.graphLayout.deleteMany({ where: { userId, nodeKey } });
  await db.connection.deleteMany({
    where: {
      userId,
      OR: [
        { sourceType: type, sourceId: id },
        { targetType: type, targetId: id },
      ],
    },
  });
}
