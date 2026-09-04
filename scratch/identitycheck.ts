// Regression check for the /api/customers patient-vs-staff access scoping fix.
//
//   npx tsx scratch/identitycheck.ts
//
// Context: GET/POST /api/customers now requires authentication, but patients call it
// directly with their own Supabase Auth session (no separate patient login exists).
// A naive "any authenticated user may read/write" check would let one patient read or
// overwrite another patient's record by guessing their mobile number (IDOR). This checks
// the isOwnIdentity() gate that prevents that.
import { isOwnIdentity, normalizeEgyptMobile } from '../src/lib/customerIdentity';

let failed = 0;
function check(label: string, got: boolean, want: boolean) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} got=${got} want=${want}`);
}

const patient = { id: 'auth-uuid-1', phone: '+201035595691', email: 'patient@example.com' };

check(
  'linked row: matches by auth_user_id',
  isOwnIdentity(patient, { auth_user_id: 'auth-uuid-1', mobile: null, email: null }),
  true
);
check(
  'linked row: different auth_user_id never matches, even with same phone',
  isOwnIdentity(patient, { auth_user_id: 'auth-uuid-2', mobile: '01035595691', email: null }),
  false
);
check(
  'unlinked row: matches by normalized phone (+20 vs 0-prefix)',
  isOwnIdentity(patient, { auth_user_id: null, mobile: '01035595691', email: null }),
  true
);
check(
  'unlinked row: matches by case-insensitive email',
  isOwnIdentity(patient, { auth_user_id: null, mobile: null, email: 'PATIENT@example.com' }),
  true
);
check(
  'THE IDOR CASE: unrelated customer with a different phone must not match',
  isOwnIdentity(patient, { auth_user_id: null, mobile: '01099999999', email: 'someone.else@example.com' }),
  false
);
check(
  'null customer (no row found) never matches',
  isOwnIdentity(patient, null),
  false
);
check(
  'patient with no phone/email on their auth session cannot match blindly',
  isOwnIdentity({ id: 'auth-uuid-3' }, { auth_user_id: null, mobile: '01035595691', email: null }),
  false
);

const m: Array<[string, string, string]> = [
  ['+201035595691', '01035595691', 'E.164 to local'],
  ['201035595691', '01035595691', 'country code without plus'],
  ['01035595691', '01035595691', 'already local, unchanged'],
];
for (const [input, want, label] of m) {
  check(`normalizeEgyptMobile: ${label}`, normalizeEgyptMobile(input) === want, true);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
