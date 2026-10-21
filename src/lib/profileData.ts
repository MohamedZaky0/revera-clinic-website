import { supabaseServer } from '@/lib/supabaseServer';

// Server-side data behind the staff profile screens (UserProfileView, DoctorAccountView). Those screens
// used to read employee_accounts, providers, hr_attendance, doctor_payroll and reservations straight from
// the browser with the public key, which only worked while old "allow all" policies left those tables open
// (RISK-128). Everything here runs with the service role for ONE person: the signed-in caller.

const HONORIFIC_RE = /^(dr\.?|د\.?|دكتور\s+|د\/\s*)\s*/i;
const GENERIC_NAMES = ['doctor', 'admin', 'superadmin', 'owner'];

/** Statuses whose paid amount counts towards a target (matches what the profile screen always summed). */
export const TARGET_REVENUE_STATUSES = ['completed', 'confirmed', 'approved', 'started'];

export function cleanPersonName(value: string | null | undefined): string {
  return String(value || '')
    .replace(/@.*/, '')
    .replace(HONORIFIC_RE, '')
    .replace(/[._-]/g, ' ')
    .trim();
}

export function normalizePersonName(value: string | null | undefined): string {
  return cleanPersonName(value).toLowerCase().replace(/s+/g, ' ').trim();
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * The `providers` row that belongs to this employee, or null. The two tables share no foreign key, so the link
 * is the one the rest of the app uses and it must be STRICT: this row's salary and payroll are shown to the
 * caller, so guessing wrong would show one person another person's pay. In order: the same id; the same phone;
 * the same national id; the same name once honorifics, case and punctuation are ignored (narrowed by phone when
 * several share it). A match counts only when it is exactly one provider. Substring and e-mail-prefix guesses
 * were dropped: they matched "saif@..." to "saifuldeen Naser".
 */
export async function findProviderForEmployee(employee: {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  national_id?: string | null;
}): Promise<any | null> {
  const { data } = await supabaseServer.from('providers').select('*');
  const providers: any[] = Array.isArray(data) ? data : [];
  if (providers.length === 0) return null;

  const only = (rows: any[]) => (rows.length === 1 ? rows[0] : null);

  if (employee.id) {
    const row = only(providers.filter((p) => p.id === employee.id));
    if (row) return row;
  }
  if (employee.phone) {
    const row = only(providers.filter((p) => p.phone && p.phone === employee.phone));
    if (row) return row;
  }
  if (employee.national_id) {
    const row = only(providers.filter((p) => p.national_id && p.national_id === employee.national_id));
    if (row) return row;
  }

  const wanted = normalizePersonName(employee.name);
  if (wanted && !GENERIC_NAMES.includes(wanted)) {
    const byName = providers.filter((p) =>
      [p.name, p.name_en, p.name_ar].some((n) => normalizePersonName(n) === wanted)
    );
    const row = only(byName);
    if (row) return row;
    if (byName.length > 1 && employee.phone) {
      const narrowed = only(byName.filter((p) => p.phone && p.phone === employee.phone));
      if (narrowed) return narrowed;
    }
  }
  return null;
}

export type TargetRevenueContext = {
  view: 'doctor' | 'staff';
  employeeId: string;
  providerId?: string | null;
  cleanName?: string;
};

/**
 * Money collected (amount_paid) on the caller's own bookings: a doctor's are the ones assigned to them, a
 * staff member's are the ones they created. With nothing to match on, nothing is counted (the screen used
 * to add up everybody's bookings in that case).
 */
export function sumTargetRevenue(rows: any[], ctx: TargetRevenueContext): number {
  const name = (ctx.cleanName || '').toLowerCase();
  return (rows || [])
    .filter((r) => TARGET_REVENUE_STATUSES.includes(String(r?.status || '').toLowerCase()))
    .filter((r) => {
      if (ctx.view === 'doctor') {
        const byProvider = !!ctx.providerId && r.provider_id === ctx.providerId;
        const byName = !!name && !!r.doctor_name && String(r.doctor_name).toLowerCase().includes(name);
        return byProvider || byName;
      }
      return r.created_by_employee_id === ctx.employeeId || r.provider_id === ctx.employeeId;
    })
    .reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
}
