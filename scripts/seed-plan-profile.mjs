import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "").replace(/\\n$/, "")];
    })
);

const email = process.argv[2];
const status = process.argv[3] || "student";
const location = process.argv[4] || "city";
const blocker = process.argv[5] || "rejection";

if (!email) {
  console.error("usage: node scripts/seed-plan-profile.mjs <email> [status] [location] [blocker]");
  process.exit(1);
}

const sql = neon(env.DATABASE_URL);

const users = await sql`SELECT id, email FROM users WHERE email = ${email}`;
if (users.length === 0) {
  console.error(`No user found with email ${email}`);
  process.exit(1);
}
const userId = users[0].id;
console.log(`Found user ${userId} (${users[0].email})`);

const rows = await sql`
  UPDATE profiles SET
    status = ${status},
    location = ${location},
    blocker = ${blocker},
    updated_at = now()
  WHERE id = ${userId}
  RETURNING status, location, blocker, created_at
`;

if (rows.length === 0) {
  console.error("No profile row — user has no profile yet.");
  process.exit(1);
}
console.log(`Seeded: status=${rows[0].status}, location=${rows[0].location}, blocker=${rows[0].blocker}`);
console.log(`Account created_at: ${rows[0].created_at}`);
