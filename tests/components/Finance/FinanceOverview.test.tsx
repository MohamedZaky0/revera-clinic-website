/**
 * jsdom tests for the Finance Overview component — month/branch selectors,
 * stat tiles fed by 8 endpoints with independent error handling.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FinanceOverview } from "@/components/admin/Finance/FinanceOverview";

function stubFetch(handler: (url: string) => { status: number; body: any }) {
  const mock = vi.fn(async (input: any) => {
    const { status, body } = handler(String(input?.url || input));
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FinanceOverview", () => {
  it("renders month and branch selectors", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 10000 },
            cogs: { partiallyCosted: false },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 2000 } },
            views: { contributionMargin: { value: 8000 }, fullyLoadedProfit: { value: 6000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 9000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 7000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 1000 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 500, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });
    render(<FinanceOverview lang="en" branches={[]} />);
    expect(await screen.findByLabelText("Month")).toBeTruthy();
    expect(screen.getByLabelText("Branch")).toBeTruthy();
  });

  it("all endpoints 200 → each tile shows the value from its field", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 50000 },
            cogs: { partiallyCosted: false },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 10000 } },
            views: { contributionMargin: { value: 40000 }, fullyLoadedProfit: { value: 30000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 45000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 35000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 5000 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 3000, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [{ id: "a1", cost: 20000 }] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [{ id: "l1", principal: 15000 }] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="en" branches={[]} />);

    await waitFor(() => {
      // Check each label exists (to ensure we're looking at the right tile)
      expect(screen.getByText("Revenue earned")).toBeTruthy();
      expect(screen.getByText("Cash received")).toBeTruthy();
      expect(screen.getByText("Contribution margin")).toBeTruthy();
      expect(screen.getByText("Profit after overheads")).toBeTruthy();
      expect(screen.getByText("Expenses this month")).toBeTruthy();
      expect(screen.getByText("Net cash flow")).toBeTruthy();
      expect(screen.getByText("Owed by patients")).toBeTruthy();
      expect(screen.getByText("Prepaid packages not yet delivered")).toBeTruthy();
      expect(screen.getByText("Total asset cost")).toBeTruthy();
      expect(screen.getByText("Total loans")).toBeTruthy();

      // Check that the values are rendered (at least some of them)
      expect(screen.getByText("EGP 50,000")).toBeTruthy(); // Revenue
      expect(screen.getByText("EGP 45,000")).toBeTruthy(); // Cash received
      expect(screen.getByText("EGP 40,000")).toBeTruthy(); // Contribution margin
      expect(screen.getByText("EGP 30,000")).toBeTruthy(); // Profit after
      expect(screen.getByText("EGP 10,000")).toBeTruthy(); // Expenses
      expect(screen.getByText("EGP 35,000")).toBeTruthy(); // Net cash flow
      expect(screen.getByText("EGP 5,000")).toBeTruthy(); // Receivables
      expect(screen.getByText("EGP 3,000")).toBeTruthy(); // Deferred
      expect(screen.getByText("EGP 20,000")).toBeTruthy(); // Assets
      expect(screen.getByText("EGP 15,000")).toBeTruthy(); // Loans
    });
  });

  it("pnl returns 403 → revenue/margin/profit/expenses tiles are absent, other tiles still render", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return { status: 403, body: { error: "Finance P&L access is required." } };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 45000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 35000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 5000 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 3000, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="en" branches={[]} />);

    await waitFor(() => {
      // Revenue tile should NOT be shown
      expect(screen.queryByText("Revenue earned")).toBeNull();
      expect(screen.queryByText("Contribution margin")).toBeNull();
      expect(screen.queryByText("Profit after overheads")).toBeNull();
      expect(screen.queryByText("Expenses this month")).toBeNull();

      // Other tiles should still render
      expect(screen.getByText("Cash received")).toBeTruthy();
      expect(screen.getByText("Net cash flow")).toBeTruthy();
      expect(screen.getByText("Owed by patients")).toBeTruthy();
      expect(screen.getByText("Prepaid packages not yet delivered")).toBeTruthy();
    });
  });

  it("cashflow returns 500 → net cash flow tile shows —, no crash", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 10000 },
            cogs: { partiallyCosted: false },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 2000 } },
            views: { contributionMargin: { value: 8000 }, fullyLoadedProfit: { value: 6000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 9000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 500, body: { error: "Internal error" } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 0 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 0, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="en" branches={[]} />);

    // Wait for the component to render and show the error state
    const netCashFlowLabel = await screen.findByText("Net cash flow");
    await waitFor(() => {
      // The label and value should be in the same tile
      const tile = netCashFlowLabel.closest("div[class*='flex flex-col']");
      expect(tile?.textContent).toContain("—");
    });
  });

  it("partiallyCosted: true → the overstated-profit warning is shown", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 10000 },
            cogs: { partiallyCosted: true },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 2000 } },
            views: { contributionMargin: { value: 8000 }, fullyLoadedProfit: { value: 6000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 9000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 7000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 0 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 0, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="en" branches={[]} />);

    await waitFor(() => {
      expect(screen.getByText(/Some sales have no cost recorded yet/)).toBeTruthy();
    });
  });

  it("changing the month selector refetches with the new period in the URL", async () => {
    const fetchMock = stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 10000 },
            cogs: { partiallyCosted: false },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 2000 } },
            views: { contributionMargin: { value: 8000 }, fullyLoadedProfit: { value: 6000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 9000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 7000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 0 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 0, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="en" branches={[]} />);

    // Wait for the initial load
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const monthInput = screen.getByLabelText("Month") as HTMLInputElement;
    const user = userEvent.setup();
    await user.clear(monthInput);
    await user.type(monthInput, "2026-10");

    // Wait for new fetches to be made with the new period
    await waitFor(() => {
      const pnlCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("/api/finance/pnl"));
      // Should have at least 2 PnL calls (one for initial mount, one for period change)
      expect(pnlCalls.length).toBeGreaterThanOrEqual(2);
      // The last PnL call should have the new period
      const lastPnlCall = pnlCalls[pnlCalls.length - 1];
      expect(String(lastPnlCall[0])).toContain("period=2026-10");
    });
  });

  it("lang='ar' renders Arabic labels", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 10000 },
            cogs: { partiallyCosted: false },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 2000 } },
            views: { contributionMargin: { value: 8000 }, fullyLoadedProfit: { value: 6000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 9000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 7000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 0 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 0, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="ar" branches={[]} />);

    await waitFor(() => {
      expect(screen.getByLabelText("الشهر")).toBeTruthy();
      expect(screen.getByLabelText("الفرع")).toBeTruthy();
      expect(screen.getByText("الإيراد المكتسب")).toBeTruthy();
      expect(screen.getByText("الكاش المستلم")).toBeTruthy();
      expect(screen.getByText("هامش المساهمة")).toBeTruthy();
    });
  });

  it("when pending.count > 0, shows the pending packages warning", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 10000 },
            cogs: { partiallyCosted: false },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 2000 } },
            views: { contributionMargin: { value: 8000 }, fullyLoadedProfit: { value: 6000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 9000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 7000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 0 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 3000, pending: { count: 2, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="en" branches={[]} />);

    await waitFor(() => {
      expect(screen.getByText(/2 packages have no confirmed price and are not counted/)).toBeTruthy();
    });
  });

  it("when expenses total is 0, shows 'No expenses recorded this month'", async () => {
    stubFetch((url: string) => {
      if (url.includes("/api/finance/pnl")) {
        return {
          status: 200,
          body: {
            revenue: { total: 10000 },
            cogs: { partiallyCosted: false },
            commission: { partiallyCommissioned: false },
            fixedOverhead: { expenses: { total: 0 } },
            views: { contributionMargin: { value: 10000 }, fullyLoadedProfit: { value: 10000 } },
          },
        };
      }
      if (url.includes("/api/finance/revenue-bridge")) {
        return { status: 200, body: { cashReceived: 9000 } };
      }
      if (url.includes("/api/finance/cashflow")) {
        return { status: 200, body: { netCashFlow: 9000 } };
      }
      if (url.includes("/api/finance/receivables-aging")) {
        return { status: 200, body: { totalOutstanding: 0 } };
      }
      if (url.includes("/api/finance/deferred-packages")) {
        return { status: 200, body: { total: 0, pending: { count: 0, packages: [] } } };
      }
      if (url.includes("/api/assets")) {
        return { status: 200, body: [] };
      }
      if (url.includes("/api/loans")) {
        return { status: 200, body: [] };
      }
      return { status: 404, body: {} };
    });

    render(<FinanceOverview lang="en" branches={[]} />);

    await waitFor(() => {
      expect(screen.getByText("No expenses recorded this month")).toBeTruthy();
    });
  });

  it('assets 500 and loans 403 → asset tile shows —, loans tile is absent; never a fabricated EGP 0', async () => {
    stubFetch((url: string) => {
      if (url.includes('/api/assets')) return { status: 500, body: { error: 'boom' } };
      if (url.includes('/api/loans')) return { status: 403, body: { error: 'Finance access is required.' } };
      if (url.includes('/api/finance/deferred-packages')) return { status: 200, body: { total: 0, pending: { count: 0, packages: [] } } };
      return { status: 403, body: {} };
    });

    render(<FinanceOverview lang='en' branches={[]} />);

    const assetLabel = await screen.findByText('Total asset cost');
    const tile = assetLabel.closest("div[class*='flex flex-col']");
    expect(tile?.textContent).toContain('—');
    expect(tile?.textContent).not.toContain('EGP 0');
    expect(screen.queryByText('Total loans')).toBeNull();
  });
});
