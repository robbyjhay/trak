import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const _Module = require("module");
_Module._cache[require.resolve("server-only")] = { exports: {} };

import { prisma } from "./src/lib/db/prisma";
async function run() {
  const activityId = "1d1692a7-3c76-4db1-9d53-fbcd0fd646fb";
  const logId = "af35ff24-a815-4af2-978c-7c0d8eee2282";
  
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  console.log("Activity:", activity ? activity.id + " (status: " + activity.status + ")" : "NOT FOUND");
  
  const log = await prisma.dailyLog.findUnique({ where: { id: logId } });
  console.log("Log:", log ? log.id + " (status: " + log.status + ", activityId: " + log.activityId + ")" : "NOT FOUND");
}
run().finally(() => process.exit(0));
