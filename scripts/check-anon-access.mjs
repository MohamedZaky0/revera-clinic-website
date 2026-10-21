// Lists the tables a stranger holding the public browser key can read.
//
// The browser key (NEXT_PUBLIC_SUPABASE_ANON_KEY) ships in every page of the site, so anything it can read
// is public. Run this against a database before and after applying supabase/migrations/
// 20261023000000_close_open_rls_policies.sql, and against production to confirm row-level security is on.
//
//   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/check-anon-access.mjs
//
// The service role key is only used to learn the real row counts (an empty answer is only meaningful when
// the table has rows). It is read from the environment, never printed, and nothing is written.
// Without it the script can only tell you which tables returned rows.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and optionally SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(2);
}

const headers = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

// Table names declared in the repo's migrations: the fallback when the database will not list its own tables.
async function tablesFromMigrations() {
  const { readdirSync, readFileSync } = await import("node:fs");
  const dir = new URL("../supabase/migrations/", import.meta.url);
  const names = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(new URL(file, dir), "utf8");
    for (const m of sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:"?public"?\.)?"?([a-z0-9_]+)"?/gi)) names.add(m[1]);
  }
  return [...names].sort();
}

let listedFromDatabase = true;
async function listTables() {
  // The REST root describes every exposed table; the service key sees all of them. Newer Supabase projects
  // refuse it to the anon key (HTTP 401), so then the names come from the migrations in this repo.
  const res = await fetch(`${url}/rest/v1/`, { headers: headers(service || anon) });
  if (!res.ok) {
    listedFromDatabase = false;
    return tablesFromMigrations();
  }
  const spec = await res.json();
  return Object.keys(spec.paths || {})
    .filter((p) => p !== "/" && !p.startsWith("/rpc/"))
    .map((p) => p.slice(1))
    .sort();
}

const tables = await listTables();
const open = [];
const closed = [];
const unknown = [];

for (const table of tables) {
  let total = null;
  if (service) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: { ...headers(service), Prefer: "count=exact", Range: "0-0" },
    });
    total = Number((res.headers.get("content-range") || "").split("/")[1] || 0);
  }

  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: headers(anon) });
  if (!res.ok) {
    const body = await res.text();
    if (/api key/i.test(body)) {
      console.error("The browser key was rejected by this project (invalid or missing API key). Check NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      process.exit(2);
    }
    closed.push(table);
    continue;
  }
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) open.push(total === null ? table : `${table} (${total} rows)`);
  else if (total === 0) unknown.push(table);
  else closed.push(table);
}

console.log(`Tables checked: ${tables.length}`);
if (!listedFromDatabase) {
  console.log("(The database would not list its tables, so the names come from supabase/migrations. Without SUPABASE_SERVICE_ROLE_KEY an empty table cannot be told apart from a blocked one, so read 'Blocked' as 'returned nothing'.)");
}
console.log(`\nREADABLE with the browser key (${open.length}):`);
open.forEach((t) => console.log(`  ${t}`));
if (unknown.length) {
  console.log(`\nEmpty tables, so the result says nothing (${unknown.length}): ${unknown.join(", ")}`);
}
console.log(`\nBlocked (row-level security working): ${closed.length}`);
console.log(
  open.length === 0
    ? "\nOK: nothing with data is readable with the browser key."
    : "\nThe tables above are readable by anyone who opens the website. Writes are not tested here; the policies behind them are listed in supabase/migrations/20261023000000_close_open_rls_policies.sql."
);
process.exit(open.length === 0 ? 0 : 1);
