import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(), channel: vi.fn(), auth: {} },
}));

import DoctorAccountView from '@/components/admin/DoctorAccountView';
import BookingDetailsModal from '@/components/admin/bookings/BookingDetailsModal';
import { AdminBookingsView } from '@/components/admin/bookings/AdminBookingsView';

// The admin shell re-renders on its own state changes. These three are the heaviest mounted views and
// are wrapped in React.memo (Brief 36 / RISK-119) so an unchanged render is skipped. If one of them
// loses its memo wrapper this fails; if the shell starts passing an inline arrow or a fresh object to
// one of them, memo silently stops helping and only a profiler recording shows it.
const REACT_MEMO = Symbol.for('react.memo');

describe('memoized admin views', () => {
  it.each([
    ['DoctorAccountView', DoctorAccountView],
    ['BookingDetailsModal', BookingDetailsModal],
    ['AdminBookingsView', AdminBookingsView],
  ])('%s is wrapped in React.memo', (_name, component) => {
    expect((component as any).$$typeof).toBe(REACT_MEMO);
  });
});
