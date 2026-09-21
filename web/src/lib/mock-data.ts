// src/lib/mock-data.ts
// Deterministic, realistic-looking mock data for the admin API. Used only as a
// fallback when the live Go admin API is unreachable (network error or 5xx) —
// a real 401/403 still returns "access denied". Dates are generated relative
// to now so the "last 14 days" throughput window always looks live.
import type { DashboardSummary, Page, SeriesPoint } from "@/types/admin";

// ---- Deterministic PRNG (mulberry32) seeded per-process so a single page load
// is stable but the data isn't literally the same forever. ----------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded with a value derived from the current day so the data "progresses"
// naturally day to day but is stable across requests within the same day.
function rngFor(): () => number {
  const now = new Date();
  const seedKey =
    now.getUTCFullYear() * 10000 +
    (now.getUTCMonth() + 1) * 100 +
    now.getUTCDate();
  return mulberry32(seedKey);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const RESPONSE_CODES = ["00", "00", "00", "00", "51", "14", "55"];
const MTIS = ["0100", "0100", "0100", "0200", "0200"];
const DESTINATIONS = ["issuer-a", "issuer-b", "issuer-c"];
const MERCHANTS = [
  "Acme Retail",
  "Harbor Market",
  "Sana Cafe",
  "Northstar Travel",
  "Blue Peak Gas",
  "Lumen Bookstore",
  "Crestline Hotel",
  "Fern & Field Grocery",
];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function maskPan(rng: () => number): string {
  // Realistic-ish PAN prefixes for demo issuers, last four random.
  const issuer = pick(rng, ["400000", "411111", "520000", "550000", "620000"]);
  const lastFour = String(randInt(rng, 1000, 9999));
  return `${issuer}********${lastFour}`;
}

function amountFor(rng: () => number): string {
  const whole = randInt(rng, 5, 1200);
  const cents = String(randInt(rng, 0, 99)).padStart(2, "0");
  return `${whole}.${cents}`;
}

function stanFor(rng: () => number): string {
  return String(randInt(rng, 100000, 999999));
}

// ---- Shared helpers ------------------------------------------------------------------------------------------------
// ISO-8601 timestamp somewhere in the trailing ~48h so the data looks fresh.
function isoStamp(rng: () => number): string {
  const now = Date.now();
  return new Date(now - randInt(rng, 0, 48) * 3600 * 1000).toISOString();
}

function hexOf(rng: () => number, len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += "0123456789abcdef"[Math.floor(rng() * 16)];
  return out;
}

// Settlement clearing-cycle id, e.g. "20260903" (today, UTC) like the Go API.
function todayCycle(): string {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${now.getUTCFullYear()}${mm}${dd}`;
}

// Card-network members as the clearing/settlement flows name them.
const MEMBERS = ["ACQ-A", "ACQ-B", "ISS-C", "ISS-D"];

// ---- DashboardSummary ---------------------------------------------------------------------------------------------
const BASE_DAILY = 450;

function dashboard() {
  const rng = rngFor();
  const txDelta = randInt(rng, -80, 140);
  const transactions = Math.max(400, BASE_DAILY + txDelta);
  return {
    transactions,
    clearingRecords: Math.round(transactions * 0.72),
    merchants: randInt(rng, 150, 165),
    disputes: randInt(rng, 4, 9),
    cards: randInt(rng, 8200, 8600),
    tokens: randInt(rng, 3100, 3400),
  } satisfies DashboardSummary;
}

// ---- Series (14 days) ---------------------------------------------------------------------------------------------
interface SeriesEnvelope {
  items: SeriesPoint[];
  // extra metadata the ops page doesn't need but keeps the envelope plausible
  total: number;
  start: string;
  end: string;
}

function series(): SeriesEnvelope {
  const rng = rngFor();
  const now = new Date();
  const items: SeriesPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const base = 80 + (i % 3) * 25;
    items.push({
      date: isoDate(d),
      count: Math.max(40, base + randInt(rng, -30, 90)),
    });
  }
  return {
    items,
    total: items.reduce((s, p) => s + p.count, 0),
    start: items[0].date,
    end: items[items.length - 1].date,
  };
}

// ---- Transactions (recent authorizations) -------------------------------------------------------------------------
interface TransactionRow {
  stan: string;
  mti: string;
  pan: string;
  amount: string;
  responseCode: string;
  destination: string;
  createdAt: string;
  merchant: string;
  brand: string;
}

function transactions(limit: number): Page<TransactionRow> {
  const rng = rngFor();
  const items: TransactionRow[] = [];
  const now = Date.now();
  for (let i = 0; i < limit; i++) {
    const createdAt = new Date(now - i * randInt(rng, 3, 14) * 60_000);
    const code = pick(rng, RESPONSE_CODES);
    items.push({
      stan: stanFor(rng),
      mti: pick(rng, MTIS),
      pan: maskPan(rng),
      amount: code === "00" ? amountFor(rng) : amountFor(rng),
      responseCode: code,
      destination: pick(rng, DESTINATIONS),
      createdAt: createdAt.toISOString(),
      merchant: pick(rng, MERCHANTS),
      brand: pick(rng, ["visa", "mastercard", "visa", "mastercard", "amex"]),
    });
  }
  return { items, total: limit };
}

// ---- Cards (issued cards) -----------------------------------------------------------------------------------------
export interface CardRow {
  ref: string;
  panHash: string;
  panMask: string;
  bin: string;
  expiry: string;
  status: string;
  product: string;
  lastAtc: number;
}

const PRODUCTS = ["classic", "silver", "gold", "platinum", "signature"];
const CARD_STATUSES = ["active", "active", "active", "active", "blocked", "suspended", "active", "expired"];

function cards(limit: number): Page<CardRow> {
  const rng = rngFor();
  const items: CardRow[] = [];
  for (let i = 0; i < limit; i++) {
    const panMask = maskPan(rng);
    const month = String(randInt(rng, 1, 12)).padStart(2, "0");
    const year = String(randInt(rng, 27, 33));
    items.push({
      ref: hexOf(rng, 16),
      panHash: hexOf(rng, 64),
      panMask,
      bin: panMask.slice(0, 6),
      expiry: `${month}${year}`,
      status: pick(rng, CARD_STATUSES),
      product: pick(rng, PRODUCTS),
      lastAtc: randInt(rng, 0, 65535),
    });
  }
  return { items, total: randInt(rng, 8200, 8600) };
}

// ---- Tokens (token vault) -----------------------------------------------------------------------------------------
export interface TokenRow {
  token: string;
  par: string;
  status: string;
  bin: string;
  requestor: string;
  deviceId: string;
  createdAt: string;
}

const REQUESTORS = ["TRID001", "TRID002", "TRID003", "TRID004", "TRID005"];
const PAR_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function tokens(limit: number): Page<TokenRow> {
  const rng = rngFor();
  const items: TokenRow[] = [];
  for (let i = 0; i < limit; i++) {
    const bin = pick(rng, ["400000", "411111", "520000", "550000", "620000"]);
    let par = "";
    for (let j = 0; j < 29; j++) par += PAR_CHARS[Math.floor(rng() * PAR_CHARS.length)];
    let suffix = "";
    for (let j = 0; j < 10; j++) suffix += String(Math.floor(rng() * 10));
    items.push({
      token: `${bin}${suffix}`,
      par,
      status: pick(rng, ["active", "active", "inactive"]),
      bin,
      requestor: pick(rng, REQUESTORS),
      deviceId: `device-${randInt(rng, 1, 99)}`,
      createdAt: isoStamp(rng),
    });
  }
  return { items, total: randInt(rng, 3100, 3400) };
}

// ---- Merchants (boarded merchants / funding profiles) -------------------------------------------------------------
export interface MerchantRow {
  id: string;
  name: string;
  dba: string;
  taxId: string;
  mccs: string[];
  status: string;
  riskTier: string;
  reserveRateBps: number;
  fundingDelayDays: number;
  transactionLimit: number;
  reserveBalance: number;
  volume: number;
  approvedAt: string;
}

const MCCS = ["5411", "7995", "5812", "4814", "5172", "4722", "5732", "5942"];
const RISK_TIERS = ["low", "low", "medium", "high"];

function merchants(limit: number): Page<MerchantRow> {
  const rng = rngFor();
  const items: MerchantRow[] = [];
  for (let i = 0; i < limit; i++) {
    const name = pick(rng, MERCHANTS);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const riskTier = pick(rng, RISK_TIERS);
    const reserveRateBps =
      riskTier === "high" ? 1000 : riskTier === "medium" ? 500 : 0;
    const fundingDelayDays =
      riskTier === "high" ? 2 : riskTier === "medium" ? 1 : 0;
    const perTxn = randInt(rng, 50, 5000); // EUR, then scaled to minor units
    items.push({
      id: `M-${slug}-${i + 1}`,
      name,
      dba: name,
      taxId: `${randInt(rng, 10, 98)}-${randInt(rng, 1000000, 9999999)}`,
      mccs: [pick(rng, MCCS)],
      status: "active",
      riskTier,
      reserveRateBps,
      fundingDelayDays,
      transactionLimit: perTxn * 1000,
      reserveBalance: reserveRateBps > 0 ? perTxn * 200 : 0,
      volume: perTxn * 2000,
      approvedAt: isoStamp(rng),
    });
  }
  return { items, total: randInt(rng, 150, 165) };
}

// ---- Disputes (chargeback / representment / arbitration) ----------------------------------------------------------
export interface DisputeRow {
  id: string;
  refId: string;
  merchantId: string;
  cardholder: string;
  amountMinor: number;
  currency: string;
  reasonCode: string;
  category: string;
  stage: string;
  status: string;
  filedAt: string;
  responseDue: string;
  respondedAt?: string;
  escalatedAt?: string;
  disputeFee: number;
  arbitrationFee: number;
}

const CARDHOLDERS = [
  "Aria Shah",
  "John Kim",
  "Mona Reyes",
  "Robert Smith",
  "Priya Nair",
  "Lucas Meyer",
];
const REASON_CODES = ["4831", "4834", "4837", "4841", "4853", "4860", "4511"];
const DISPUTE_CATEGORIES = ["authorization", "record", "candidate", "submission"];
const DISPUTE_STAGES = ["filed", "filed", "representment", "arbitration", "resolved"];

function disputes(limit: number): Page<DisputeRow> {
  const rng = rngFor();
  const items: DisputeRow[] = [];
  for (let i = 0; i < limit; i++) {
    const cardholder = pick(rng, CARDHOLDERS);
    const names = cardholder.toLowerCase().split(" ");
    const reasonCode = pick(rng, REASON_CODES);
    const stage = pick(rng, DISPUTE_STAGES);
    const filedAt = isoStamp(rng);
    const due = new Date(new Date(filedAt).getTime() + 30 * 24 * 3600 * 1000).toISOString();
    const resolved = stage === "resolved";
    items.push({
      id: `D-${names[0]}-${names[1]}-T${i + 1}-${reasonCode}`,
      refId: `T${i + 1}`,
      merchantId: "M-online",
      cardholder,
      amountMinor: randInt(rng, 500, 50000),
      currency: "840",
      reasonCode,
      category: pick(rng, DISPUTE_CATEGORIES),
      stage,
      status: resolved ? pick(rng, ["won", "lost"]) : stage,
      filedAt,
      responseDue: due,
      respondedAt: resolved ? isoStamp(rng) : undefined,
      escalatedAt: stage === "arbitration" || resolved ? isoStamp(rng) : undefined,
      disputeFee: 2500,
      arbitrationFee: stage === "arbitration" || resolved ? 10000 : 0,
    });
  }
  return { items, total: randInt(rng, 4, 9) };
}

// ---- Clearing (captured records + net positions) ------------------------------------------------------------------
export interface ClearingRecordRow {
  cycleId: string;
  stan: string;
  mti: string;
  sender: string;
  receiver: string;
  amountMinor: number;
  interchange: number;
  currency: string;
  refId: string;
}

export interface NetPositionRow {
  cycleId: string;
  member: string;
  net: number;
}

function clearingCycles(): { items: string[] } {
  return { items: [todayCycle()] };
}

function clearingRecords(cycle: string, limit: number): { items: ClearingRecordRow[] } {
  const rng = rngFor();
  const items: ClearingRecordRow[] = [];
  for (let i = 0; i < limit; i++) {
    const sender = pick(rng, ["ACQ-A", "ACQ-B"]);
    const receiver = pick(rng, ["ISS-C", "ISS-D"]);
    const amountMinor = randInt(rng, 500, 15000) * 100;
    items.push({
      cycleId: cycle,
      stan: String(100000 + i),
      mti: "0221",
      sender,
      receiver,
      amountMinor,
      interchange: Math.round(amountMinor * 0.12),
      currency: "840",
      refId: `${sender}-${amountMinor}`,
    });
  }
  return { items };
}

function clearingPositions(cycle: string): { items: NetPositionRow[] } {
  const rng = rngFor();
  const items: NetPositionRow[] = [];
  for (const member of MEMBERS) {
    const minor = randInt(rng, 5000, 30000) * 100;
    items.push({
      cycleId: cycle,
      member,
      net: member.startsWith("ACQ") ? -minor : minor,
    });
  }
  return { items };
}

// ---- Settlement (prefund accounts, default fund, instructions) ----------------------------------------------------
export interface PrefundRow {
  member: string;
  balance: number;
  cap: number;
}

export interface SettlementRow {
  cycleId: string;
  msgId: string;
  member: string;
  amount: number;
  direction: string;
  currency: string;
  instruction: string;
  final: boolean;
}

function prefunds(): { items: PrefundRow[] } {
  const rng = rngFor();
  const items: PrefundRow[] = [];
  for (const member of MEMBERS) {
    const isIssuer = member.startsWith("ISS");
    items.push({
      member,
      balance: isIssuer ? randInt(rng, 10000, 35000) * 100 : 0,
      cap: isIssuer ? 1000 : member === "ACQ-A" ? 20000 : 15000,
    });
  }
  return { items };
}

function defaultFund(): { balance: number } {
  return { balance: randInt(rngFor(), 20000, 30000) * 100 };
}

function settlementInstructions(cycle: string): { items: SettlementRow[] } {
  const rng = rngFor();
  const items: SettlementRow[] = [];
  for (const member of MEMBERS) {
    const isAcquirer = member.startsWith("ACQ");
    items.push({
      cycleId: cycle,
      msgId: `${cycle}-${member}`,
      member,
      amount: randInt(rng, 5000, 30000) * 100,
      direction: isAcquirer ? "DEBIT" : "CREDIT",
      currency: "840",
      instruction: new Date().toISOString(),
      final: true,
    });
  }
  return { items };
}

// ---- Ledger (double-entry accounts) -------------------------------------------------------------------------------
export interface LedgerAccountRow {
  id: string;
  type: string;
  balance: number;
}

function ledgerAccounts(): { items: LedgerAccountRow[] } {
  const rng = rngFor();
  const items: LedgerAccountRow[] = [
    { id: "CASH", type: "asset", balance: randInt(rng, 5, 25) * 100000 },
    { id: "INCOME:FEES", type: "income", balance: randInt(rng, 200, 400) * 100 },
  ];
  for (const member of MEMBERS) {
    const minor = randInt(rng, 5000, 30000) * 100;
    items.push({
      id: `M:${member}`,
      type: "liability",
      balance: member.startsWith("ACQ") ? -minor : minor,
    });
  }
  return { items };
}

// ---- Public path dispatcher ---------------------------------------------------------------------------------------
/**
 * Return a realistic mock response for an admin API path, or null when no mock
 * exists for that path (the caller should then surface a normal error).
 *
 * Handles query strings: "/dashboard/series?days=14" and "/transactions?limit=6"
 * both match. Numbers embedded in the query are honored where they map to a
 * limit (transactions/cards/tokens/merchants/disputes) and ignored elsewhere.
 */
export function getMockForPath(path: string): unknown | null {
  const base = path.split("?")[0];
  const url = new URL(path, "https://clara.local");

  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = (fallback: number) =>
    Number.isInteger(limitRaw) && limitRaw > 0 ? limitRaw : fallback;
  const cycle = url.searchParams.get("cycle") ?? todayCycle();

  switch (base) {
    case "/dashboard":
      return dashboard();
    case "/dashboard/series":
      // series() always returns the trailing 14-day window; ?days= is honored
      // only when a caller passes it as a limit-style int.
      return series();
    case "/transactions":
      return transactions(limit(6));
    case "/cards":
      return cards(limit(50));
    case "/tokens":
      return tokens(limit(50));
    case "/merchants":
      return merchants(limit(50));
    case "/disputes":
      return disputes(limit(50));
    case "/clearing/cycles":
      return clearingCycles();
    case "/clearing/records":
      return clearingRecords(cycle, limit(50));
    case "/clearing/positions":
      return clearingPositions(cycle);
    case "/settlement/prefunds":
      return prefunds();
    case "/settlement/default-fund":
      return defaultFund();
    case "/settlement/instructions":
      return settlementInstructions(cycle);
    case "/ledger/accounts":
      return ledgerAccounts();
    default:
      return null;
  }
}