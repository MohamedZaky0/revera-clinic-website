// Who may load the roles and employees lists, and how they are loaded (RISK-136).
//
// GET /api/roles and GET /api/employees answer only to the owner and to admins
// (requireAdministratorAccess in src/lib/access.ts). Every other staff account (reception, doctors,
// HR, custom roles) used to ask anyway, get 403, wait 2 s and ask again: four wasted requests (and
// four Supabase Auth checks) on every navigation click. The client now asks only when the server can
// say yes, and never repeats a request that was refused for who the caller is.

// /api/auth/me hands the client exactly these two spellings for the roles requireStaffAccess
// normalizes the same way, so this is the client mirror of requireAdministratorAccess.
export function canLoadAdminDirectory(role: string | null | undefined): boolean {
  return role === 'superadmin' || role === 'admin';
}

// 401/403 describe the caller, not a hiccup: repeating the same request cannot change the answer.
function isFinalRefusal(status: number): boolean {
  return status === 401 || status === 403;
}

export type FetchJsonOptions = {
  headers: Record<string, string>;
  fetchImpl?: typeof fetch;
  retryDelayMs?: number;
  timeoutMs?: number;
};

// One request with a time limit, repeated once after a pause when it failed or timed out
// (a slow or hiccuping server). A refused caller (401/403) is not repeated.
export async function fetchJsonWithOneRetry(url: string, options: FetchJsonOptions): Promise<any> {
  const doFetch = options.fetchImpl ?? fetch;
  const retryDelayMs = options.retryDelayMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? 20000;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    let status: number | null = null;
    try {
      const res = await doFetch(url, { headers: options.headers, cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.json();
      status = res.status;
      lastError = new Error(`${url} responded ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    if (status !== null && isFinalRefusal(status)) throw lastError;
    if (attempt === 0) await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  throw lastError;
}

export type AdminDirectoryRequest = {
  role: string | null | undefined;
  accessToken: string | null | undefined;
  fetchImpl?: typeof fetch;
  retryDelayMs?: number;
  timeoutMs?: number;
};

// Loads both lists on their own, so one failing request does not discard the other. Returns null,
// without any request, when this account cannot use the lists.
export async function loadAdminDirectory(request: AdminDirectoryRequest) {
  if (!request.accessToken || !canLoadAdminDirectory(request.role)) return null;
  const options: FetchJsonOptions = {
    headers: { Authorization: `Bearer ${request.accessToken}` },
    fetchImpl: request.fetchImpl,
    retryDelayMs: request.retryDelayMs,
    timeoutMs: request.timeoutMs,
  };
  const [roles, employees] = await Promise.allSettled([
    fetchJsonWithOneRetry('/api/roles', options),
    fetchJsonWithOneRetry('/api/employees', options),
  ]);
  return { roles, employees };
}
