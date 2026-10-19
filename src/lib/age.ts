/**
 * Parses the "YYYY-MM-DD" components directly and compares them against `now`'s own local
 * getters — never via `new Date(dateOfBirth)` or `.toISOString()`, both of which round-trip
 * through UTC and can land a day off near a year/month boundary in timezones ahead of UTC
 * (the exact class of bug fixed in RISK-111).
 */
export function calculateAge(dateOfBirth: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth);
  if (!match) return null;

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]) - 1;
  const birthDay = Number(match[3]);

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  let age = todayYear - birthYear;
  const hasHadBirthdayThisYear =
    todayMonth > birthMonth || (todayMonth === birthMonth && todayDay >= birthDay);
  if (!hasHadBirthdayThisYear) age -= 1;

  return age >= 0 ? age : null;
}

/**
 * What to send for a patient's age and birth date when saving a form that offers both (DEC-041):
 * a real birth date wins and the typed-in age snapshot is dropped; without one the typed age is
 * kept for legacy entry. Mirrors POST /api/customers, which also nulls `age` when it gets a date.
 */
export function ageFieldsForSave(
  dateOfBirth: string | null | undefined,
  typedAge: string | null | undefined,
): { age: number | null; date_of_birth: string | null } {
  const dob = (dateOfBirth ?? '').trim();
  if (dob) return { age: null, date_of_birth: dob };
  const text = (typedAge ?? '').trim();
  const n = Number(text);
  return { age: text !== '' && Number.isFinite(n) ? n : null, date_of_birth: null };
}
