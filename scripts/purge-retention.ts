// Deletes original voice notes / photos older than each workspace's retention window.
// Orders, transcripts and approval records are kept. Run daily, e.g. from cron:
//   npm run retention:purge
import { prisma } from "../src/lib/db";
import { purgeExpiredSources } from "../src/server/workspace/service";

async function main() {
  const workspaces = await prisma.workspace.findMany({ select: { id: true } });
  let total = 0;
  for (const w of workspaces) total += await purgeExpiredSources(w.id);
  console.log(`Purged ${total} expired source file(s) across ${workspaces.length} workspace(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
