with open("server.ts", "r") as f:
    content = f.read()
if "processDueReminders" not in content:
    old_code = """    process.on("SIGTERM", () => {
      console.log("Shutting down...");
      io.close();
      server.close();
    });"""
    new_code = """    // Run automated reminders worker
    import { processDueReminders } from "./src/lib/db/service.js";
    setInterval(() => {
      processDueReminders().catch((err) => {
        console.error("Reminder worker error:", err);
      });
    }, 60 * 1000);

    process.on("SIGTERM", () => {
      console.log("Shutting down...");
      io.close();
      server.close();
    });"""
    content = content.replace(old_code, new_code)
    with open("server.ts", "w") as f:
        f.write(content)
