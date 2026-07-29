import { resolveDateRange } from '../src/lib/financeReportRange';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${name}\n  actual:   ${a}\n  expected: ${e}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

// period shorthand, mid-year month
const jul = resolveDateRange({ period: '2026-07' });
check('period 2026-07 fromDate', jul.fromDate, '2026-07-01');
check('period 2026-07 toDateInclusive', jul.toDateInclusive, '2026-07-31');
check('period 2026-07 toDateExclusive', jul.toDateExclusive, '2026-08-01');
check('period 2026-07 fromIso', jul.fromIso, '2026-07-01T00:00:00.000Z');
check('period 2026-07 toIsoExclusive', jul.toIsoExclusive, '2026-08-01T00:00:00.000Z');
check('period 2026-07 periods', jul.periods, ['2026-07']);

// period shorthand, February leap year
const febLeap = resolveDateRange({ period: '2028-02' });
check('period 2028-02 (leap) toDateInclusive', febLeap.toDateInclusive, '2028-02-29');

// period shorthand, December (year rollover)
const dec = resolveDateRange({ period: '2026-12' });
check('period 2026-12 toDateExclusive (year rollover)', dec.toDateExclusive, '2027-01-01');

// explicit from/to within one month
const single = resolveDateRange({ from: '2026-07-05', to: '2026-07-05' });
check('from=to single day toDateExclusive', single.toDateExclusive, '2026-07-06');
check('from=to single day periods', single.periods, ['2026-07']);

// explicit from/to spanning three months
const span = resolveDateRange({ from: '2026-06-15', to: '2026-08-10' });
check('span periods', span.periods, ['2026-06', '2026-07', '2026-08']);
check('span toDateExclusive', span.toDateExclusive, '2026-08-11');

// invalid: to before from
try {
  resolveDateRange({ from: '2026-07-10', to: '2026-07-01' });
  failures++;
  console.error('FAIL to-before-from should have thrown');
} catch {
  console.log('PASS to-before-from throws');
}

// invalid: neither period nor from/to
try {
  resolveDateRange({});
  failures++;
  console.error('FAIL empty params should have thrown');
} catch {
  console.log('PASS empty params throws');
}

// invalid: malformed period
try {
  resolveDateRange({ period: '2026-7' });
  failures++;
  console.error('FAIL malformed period should have thrown');
} catch {
  console.log('PASS malformed period throws');
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
