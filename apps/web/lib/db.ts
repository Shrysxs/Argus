import { PrismaClient } from "@prisma/client";

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

function createExtendedClient() {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ query, args }) {
          let retries = 3;
          while (retries > 0) {
            try {
              return await query(args);
            } catch (err: any) {
              retries--;
              if (
                retries > 0 &&
                (err?.code === "P1001" || err?.message?.includes("Can't reach database"))
              ) {
                await new Promise((r) => setTimeout(r, 200));
              } else {
                throw err;
              }
            }
          }
          return await query(args);
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;

// Global singleton instance for Next.js hot-reloading in development
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const db: ExtendedPrismaClient =
  globalForPrisma.prisma ?? createExtendedClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
