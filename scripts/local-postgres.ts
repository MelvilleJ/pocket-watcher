import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";

const dataDir = path.join(__dirname, "..", ".local-postgres-data");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
});

async function main() {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("pocket_watcher").catch(() => {});
  console.log("Local Postgres running at postgresql://postgres:postgres@localhost:5432/pocket_watcher");
  console.log("Press Ctrl+C to stop.");

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
