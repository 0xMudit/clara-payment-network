import { describe, it, expect, vi } from "vitest";
import { getMockForPath } from "./mock-data";
import type { DashboardSummary, Page, SeriesPoint } from "@/types/admin";

// Freeze time so "relative to now" assertions are deterministic.
const NOW = new Date("2026-09-03T12:00:00Z");
vi.useFakeTimers();
vi.setSystemTime(NOW);

interface Row {
  stan: string;
  mti: string;
  pan: string;
  amount: string;
  responseCode: string;
  destination: string;
  createdAt: string;
  [k: string]: unknown;
}

function isDashboard(x: unknown): x is DashboardSummary {
  return (
    typeof x === "object" &&
    x !== null &&
    ["transactions", "clearingRecords", "merchants", "disputes", "cards", "tokens"].every(
      (k) => typeof (x as Record<string, unknown>)[k] === "number",
    )
  );
}

function isSeries(x: unknown): x is { items: SeriesPoint[] } {
  return (
    typeof x === "object" &&
    x !== null &&
    Array.isArray((x as { items?: unknown })?.items) &&
    ((x as { items: unknown[] }).items.length === 0 ||
      typeof (x as { items: SeriesPoint[] }).items[0]?.count === "number")
  );
}

function isPage(x: unknown): x is Page<Record<string, unknown>> {
  return (
    typeof x === "object" &&
    x !== null &&
    Array.isArray((x as { items?: unknown })?.items) &&
    typeof (x as { total?: unknown })?.total === "number"
  );
}

describe("mock-data", () => {
  describe("getMockForPath dispatch", () => {
    it("returns null for unknown paths", () => {
      expect(getMockForPath("/does-not-exist")).toBeNull();
    });

    it("returns a DashboardSummary for /dashboard", () => {
      const data = getMockForPath("/dashboard");
      expect(isDashboard(data)).toBe(true);
    });

    it("returns a 14-point series for /dashboard/series", () => {
      const data = getMockForPath("/dashboard/series");
      expect(isSeries(data)).toBe(true);
      if (isSeries(data)) {
        expect(data.items).toHaveLength(14);
      }
    });

    it("ignores numbers in query strings for /dashboard/series", () => {
      const base = getMockForPath("/dashboard/series?days=7");
      expect(isSeries(base)).toBe(true);
      if (isSeries(base)) expect(base.items).toHaveLength(14);
    });

    it("respects ?limit for /transactions", () => {
      const page = getMockForPath("/transactions?limit=3") as Page<Row>;
      expect(page.items).toHaveLength(3);
      expect(page.total).toBe(3);
    });

    it("defaults /transactions limit to 6", () => {
      const page = getMockForPath("/transactions") as Page<Row>;
      expect(page.items).toHaveLength(6);
    });

    it("matches paths regardless of trailing query strings", () => {
      expect(isDashboard(getMockForPath("/dashboard?anything"))).toBe(true);
    });

    it("returns a Page of cards for /cards and honors ?limit", () => {
      const page = getMockForPath("/cards?limit=3");
      expect(isPage(page)).toBe(true);
      if (isPage(page)) {
        expect(page.items).toHaveLength(3);
        expect(page.total).toBeGreaterThan(3);
        expect(page.items[0]).toHaveProperty("ref");
        expect(page.items[0]).toHaveProperty("panMask");
        expect(page.items[0]).toHaveProperty("bin");
      }
    });

    it("returns a Page of tokens for /tokens and honors ?limit", () => {
      const page = getMockForPath("/tokens?limit=2");
      expect(isPage(page)).toBe(true);
      if (isPage(page)) {
        expect(page.items).toHaveLength(2);
        expect(page.items[0]).toHaveProperty("token");
        expect(page.items[0]).toHaveProperty("par");
        expect(page.items[0]).toHaveProperty("createdAt");
      }
    });

    it("returns a Page of merchants for /merchants and honors ?limit", () => {
      const page = getMockForPath("/merchants?limit=4");
      expect(isPage(page)).toBe(true);
      if (isPage(page)) {
        expect(page.items).toHaveLength(4);
        expect(page.items[0]).toHaveProperty("id");
        expect(page.items[0]).toHaveProperty("riskTier");
        expect(page.items[0]).toHaveProperty("reserveBalance");
      }
    });

    it("returns a Page of disputes for /disputes and honors ?limit", () => {
      const page = getMockForPath("/disputes?limit=2");
      expect(isPage(page)).toBe(true);
      if (isPage(page)) {
        expect(page.items).toHaveLength(2);
        expect(page.items[0]).toHaveProperty("id");
        expect(page.items[0]).toHaveProperty("reasonCode");
        expect(page.items[0]).toHaveProperty("amountMinor");
      }
    });

    it("returns a clearing cycle list plus records/positions for that cycle", () => {
      const cycles = getMockForPath("/clearing/cycles") as { items: string[] };
      expect(cycles.items.length).toBeGreaterThan(0);
      const cycle = cycles.items[0];
      expect(cycle).toMatch(/^\d{8}$/);

      const records = getMockForPath(
        `/clearing/records?cycle=${cycle}&limit=3`,
      ) as { items: Record<string, unknown>[] };
      expect(records.items).toHaveLength(3);
      expect(records.items.every((r) => r.cycleId === cycle)).toBe(true);

      const positions = getMockForPath(
        `/clearing/positions?cycle=${cycle}`,
      ) as { items: Record<string, unknown>[] };
      expect(positions.items.length).toBeGreaterThan(0);
      expect(positions.items.every((p) => p.cycleId === cycle)).toBe(true);
    });

    it("returns prefunds, a default fund balance, and instructions", () => {
      const cycles = getMockForPath("/clearing/cycles") as { items: string[] };
      const cycle = cycles.items[0];

      const prefunds = getMockForPath("/settlement/prefunds") as {
        items: Record<string, unknown>[];
      };
      expect(prefunds.items.length).toBeGreaterThan(0);
      expect(prefunds.items[0]).toHaveProperty("member");

      const df = getMockForPath("/settlement/default-fund") as {
        balance: number;
      };
      expect(typeof df.balance).toBe("number");

      const instructions = getMockForPath(
        `/settlement/instructions?cycle=${cycle}`,
      ) as { items: Record<string, unknown>[] };
      expect(instructions.items.length).toBeGreaterThan(0);
      expect(instructions.items[0]).toHaveProperty("msgId");
      expect(instructions.items[0]).toHaveProperty("direction");
    });

    it("returns ledger accounts", () => {
      const accounts = getMockForPath("/ledger/accounts") as {
        items: Record<string, unknown>[];
      };
      expect(accounts.items.length).toBeGreaterThan(0);
      expect(accounts.items[0]).toHaveProperty("id");
      expect(accounts.items[0]).toHaveProperty("type");
      expect(accounts.items[0]).toHaveProperty("balance");
    });
  });

  describe("data realism", () => {
    it("generates series dates relative to now, ending today", () => {
      const data = getMockForPath("/dashboard/series") as { items: SeriesPoint[] };
      const nowDay = NOW.toISOString().slice(0, 10);
      expect(data.items[data.items.length - 1].date).toBe(nowDay);
      // ISO dates are ordered lexicographically; parse to compare numerically.
      const firstMs = new Date(data.items[0].date).getTime();
      const lastMs = new Date(data.items[13].date).getTime();
      expect(firstMs).toBeLessThan(lastMs);
    });

    it("transactions carry the expected 7 audit fields", () => {
      const page = getMockForPath("/transactions?limit=1") as Page<Row>;
      const row = page.items[0];
      expect(row).toHaveProperty("stan");
      expect(row).toHaveProperty("mti");
      expect(row).toHaveProperty("pan");
      expect(row).toHaveProperty("amount");
      expect(row).toHaveProperty("responseCode");
      expect(row).toHaveProperty("destination");
      expect(row).toHaveProperty("createdAt");
      expect(new Date(row.createdAt).getTime()).toBeGreaterThan(0);
    });

    it("PANs are masked and response codes are from the valid set", () => {
      const page = getMockForPath("/transactions?limit=30") as Page<Row>;
      const validCodes = new Set(["00", "51", "14", "55"]);
      for (const row of page.items) {
        expect(row.pan).toMatch(/^\d{6}\*{8}\d{4}$/);
        expect(validCodes.has(row.responseCode)).toBe(true);
        expect(row.mti).toMatch(/^0[12]00$/);
        expect(row.destination.length).toBeGreaterThan(0);
      }
    });

    it("is deterministic within the same simulation day", () => {
      const a = getMockForPath("/dashboard") as DashboardSummary;
      const b = getMockForPath("/dashboard") as DashboardSummary;
      expect(a).toEqual(b);
    });
  });
});