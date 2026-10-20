/**
 * "Has this employee confirmed their email?" (Active vs Invited badge) lives in Supabase Auth, not in
 * employee_accounts. GET /api/employees used to read it with `auth.admin.listUsers()`, which
 *   - returns only the first page (50 users) by default, so on a project with more auth users than
 *     that some employees were shown as Invited although they had signed in, and
 *   - has no time limit, so a slow Auth server held up the whole employees request (and, through
 *     it, the admin panel; RISK-121).
 * This looks each employee up by id instead, in small parallel batches, inside an overall deadline,
 * and remembers confirmed users for the life of the server instance (a confirmation never reverts).
 */

type GetUserById = (id: string) => Promise<{ data?: { user?: any } | null; error?: any }>;

const confirmedCache = new Map<string, string>();

/** Test helper: forget what was cached. */
export function resetConfirmationCache() {
  confirmedCache.clear();
}

export interface ConfirmationResult {
  /** auth user id -> confirmation timestamp, or null when the user is known but not confirmed. */
  map: Map<string, string | null>;
  /** false when the deadline hit or a lookup failed, so some employees may be missing from `map`. */
  complete: boolean;
}

export async function getConfirmationMap(
  getUserById: GetUserById,
  authUserIds: Array<string | null | undefined>,
  opts: { deadlineMs?: number; batchSize?: number } = {},
): Promise<ConfirmationResult> {
  const deadlineMs = opts.deadlineMs ?? 4000;
  const batchSize = opts.batchSize ?? 10;
  const map = new Map<string, string | null>();
  let complete = true;

  const missing: string[] = [];
  for (const id of new Set(authUserIds.filter((x): x is string => Boolean(x)))) {
    const cached = confirmedCache.get(id);
    if (cached) map.set(id, cached);
    else missing.push(id);
  }
  if (missing.length === 0) return { map, complete };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<'deadline'>((resolve) => {
    timer = setTimeout(() => resolve('deadline'), deadlineMs);
  });

  const work = (async () => {
    for (let i = 0; i < missing.length; i += batchSize) {
      const batch = missing.slice(i, i + batchSize);
      await Promise.all(batch.map(async (id) => {
        try {
          const { data, error } = await getUserById(id);
          if (error || !data?.user) {
            complete = false;
            return;
          }
          const at = data.user.email_confirmed_at || data.user.confirmed_at || null;
          map.set(id, at);
          if (at) confirmedCache.set(id, at);
        } catch {
          complete = false;
        }
      }));
    }
    return 'done' as const;
  })();

  const outcome = await Promise.race([work, deadline]);
  if (timer) clearTimeout(timer);
  if (outcome === 'deadline') complete = false;
  return { map, complete };
}
