import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuthGetUser = vi.fn();
const mockFromData = vi.fn();

function createChain(): any {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'ilike', 'or', 'order', 'limit', 'gt', 'lt', 'gte', 'lte', 'in'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => mockFromData('maybeSingle'));
  chain.single = vi.fn(async () => mockFromData('single'));
  chain.then = vi.fn((resolve: any) => Promise.resolve(mockFromData('query')).then(resolve));
  return chain;
}

vi.mock('@/lib/supabaseServer', () => ({
  supabaseServer: {
    auth: { getUser: (...args: any[]) => mockAuthGetUser(...args) },
    from: (_table: string) => createChain(),
  },
}));

import { GET as getAuthMe } from '@/app/api/auth/me/route';

function makeReq(token?: string): Request {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return new Request('http://localhost:3000/api/auth/me', { headers });
}

describe('GET /api/auth/me resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await getAuthMe(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('No authorization token provided');
  });

  it('returns 401 when token is invalid or expired', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT token' },
    });
    const res = await getAuthMe(makeReq('bad-token'));
    expect(res.status).toBe(401);
  });

  it('resolves employee linked by auth_user_id', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-123', email: 'admin@reveraclinic.com' } },
      error: null,
    });

    mockFromData.mockImplementation((kind: string) => {
      if (kind === 'maybeSingle') {
        return {
          data: {
            id: 'emp-1',
            auth_user_id: 'auth-user-123',
            role_name: 'Super Admin',
            department: 'Management',
            email: 'admin@reveraclinic.com',
            employee_id: 'EMP-001',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const res = await getAuthMe(makeReq('valid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe('superadmin');
    expect(body.email).toBe('admin@reveraclinic.com');
  });

  it('resolves employee by email fallback when auth_user_id is not yet linked', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-new', email: 'doctor@reveraclinic.com' } },
      error: null,
    });

    let callCount = 0;
    mockFromData.mockImplementation((kind: string) => {
      if (kind === 'maybeSingle') {
        callCount++;
        if (callCount === 1) {
          return { data: null, error: null };
        }
        if (callCount === 2) {
          return {
            data: {
              id: 'emp-2',
              auth_user_id: null,
              role_name: 'Doctor',
              department: 'Medical',
              email: 'doctor@reveraclinic.com',
              employee_id: 'DOC-001',
            },
            error: null,
          };
        }
        return {
          data: {
            permissions: ['patients.view', 'prescriptions.write'],
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const res = await getAuthMe(makeReq('valid-token'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe('Doctor');
    expect(body.permissions).toEqual(['patients.view', 'prescriptions.write']);
  });

  it('rejects unauthorized user who is not an employee', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'stranger-id', email: 'random@gmail.com' } },
      error: null,
    });

    mockFromData.mockImplementation(() => ({ data: null, error: null }));

    const res = await getAuthMe(makeReq('valid-token'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized: No employee profile linked to this user.');
  });
});
