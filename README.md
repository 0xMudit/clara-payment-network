<div align="center">

<h1>Clara Network</h1>

**An open-source, Mastercard/Visa-style card payment network you can run on your own machine — the scheme operator, the issuer, and the acquirer, end to end.**

It is a working simulation of a four-party network: an ISO 8583 switch that routes authorizations by BIN, clearing and net settlement with prefunded member accounts, a double-entry ledger, card issuing with EMV-style cryptograms and network tokens, merchant acquiring, a disputes engine, an HSM simulation with dual-control key ceremonies, issuer stand-in processing with circuit breakers, and instant payments (pacs.008 RTP) — surfaced through a read-only Admin API and a live web console.

<p>
<a href="https://github.com/0xMudit/clara-card-network/actions/workflows/ci.yml"><img src="https://github.com/0xMudit/clara-card-network/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license" /></a>
<img src="https://img.shields.io/badge/Go-%E2%89%A51.26-00ADD8.svg?logo=go&logoColor=white" alt="Go 1.26 or newer" />
<img src="https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
<img src="https://img.shields.io/badge/Redis-7-DC382D.svg?logo=redis&logoColor=white" alt="Redis 7" />
<img src="https://img.shields.io/badge/platform-Docker-2496ED.svg?logo=docker&logoColor=white" alt="Docker" />
</p>

<a href="https://clara-network.vercel.app"><img src="docs/screenshots/01-operations-dashboard.png" alt="Clara Network operations dashboard: network-wide transaction, clearing, merchant, dispute, card, and token counts" width="880" /></a>

</div>

---

> **Runtime notice.** Clara Network is an educational **simulator**. It must never be connected to real card infrastructure, and no real cardholder data or keys are used anywhere in the repository. It implements production-grade specifications (ISO 8583, ISO 20022, EMV, PCI DSS principles) and real key-management machinery, but the HSM is an in-process simulation and the deployment is a single-node sandbox. Status: **v0.1.0-beta** — all ten blueprint phases implemented, `make smoke` verifies the stack end to end.

## Why Clara Network

Payment-network internals are locked behind scheme memberships, certifications, and NDAs, so almost nobody gets to read — let alone run — the machinery. Clara Network opens it up:

- **It runs on your machine.** One `docker compose up` boots the switch, the issuer/acquirer/clearing/ledger/card/disputes/HSM/resilience/instant sims, PostgreSQL, and Redis. There is no scheme backend in the middle — the network is the code in this repository.
- **It speaks the real standards.** ISO 8583 authorizations on the wire, ISO 20022 pacs.008/pacs.009 for instant payments and settlement, EMV-style ARQC cryptograms with ATC anti-replay, ISO 9564 PIN blocks, ISO 9797-1 retail MACs, and TR-31-style key blocks.
- **It shows its work.** Every authorization lands in an audit log, every net position posts as a balanced journal entry, every settlement instruction is inspectable XML, and the Admin API exposes all of it.
- **It fails realistically.** Member defaults draw on the default fund, issuer outages trip circuit breakers and fall back to stand-in processing, reconciliation catches a corrupted statement, and disputes move through representment to arbitration with SLA deadlines.
- **It is documented like a scheme.** The `docs/` library is not API reference — it is the operating manual a real network's members would read, from BIN numbering to chargeback reason codes to PFMI oversight principles.

## Features

| Area | What you get |
| --- | --- |
| **Switch** | ISO 8583 authorization switching with BIN-based routing (DE100 or a BIN table), per-issuer failover lists, and idempotent replay protection. |
| **Risk** | In-path velocity rules (per card / per merchant) counted in Redis, with configurable decline codes. |
| **Clearing & settlement** | Clearing file capture, per-member net positions, prefunded caps, a default fund for member defaults, and ISO 20022 pacs.009 settlement instructions. |
| **Ledger** | Append-only double-entry journal, reconciliation against the settlement agent's statement, with mismatch and orphan-in-ledger classification. |
| **Issuing** | BIN ranges, card personalization, EMV-style ARQC verification with ATC anti-replay, a token vault (PAN to token + PAR), and mobile-wallet provisioning. |
| **Acquiring** | Merchant boarding with MATCH/OFAC negative-list screening, MCC risk tiering, fee withholding, rolling reserves, and scheduled payouts. |
| **Disputes** | Reason-code taxonomy; a file to representment, rule, arbitration lifecycle; associated-transaction checks; SLA tracking; chargeback-ratio monitoring. |
| **Key management** | HSM simulation: dual-control M-of-N key ceremonies, AES key wrap (RFC 3394), TR-31 key blocks, PIN blocks (formats 0/4), retail MACs, rotation, audit, and dual-control zeroize. |
| **Resilience** | Stand-in processing (SIP/STIP) with per-issuer limits and negative/valid-card files, circuit breakers with half-open probing, p99 latency metrics, and 91-burst outage detection. |
| **Instant payments** | pacs.008 credit transfers settled 24/7/365 against prefunded positions, a 20-second SLA, verify-and-reserve capacity checks, AC04/AC01/AG01/FF01 rejections, and pacs.002 status reports. |
| **Admin API** | Read-only REST service (`:8083`) over the shared PostgreSQL schema — transactions, clearing, settlement, ledger, cards, tokens, merchants, and disputes. |
| **Web console** | Next.js dashboard on Vercel + Supabase + Railway with one-click persona login and per-role page access. |

## Screenshots

Sign in by picking a persona — the console gates every page by role, so each seat sees a different network. All screenshots are full size in [`docs/screenshots/`](docs/screenshots/).

**Getting in**

| Persona login | Landing page |
| --- | --- |
| <img src="docs/screenshots/12-demo-role-selection.png" width="420" alt="Persona login: Scheme Operator, Issuer, Acquirer, Merchant, or Viewer" /> | <img src="docs/screenshots/14-landing-page.png" width="420" alt="Clara Network landing page" /> |
| Pick Scheme Operator, Issuer, Acquirer, Merchant, or Viewer and you are signed in instantly — no typing. | The front door, with the persona picker one click away. |

**Scheme operator**

| Operations dashboard (`/ops`) | Transactions |
| --- | --- |
| <img src="docs/screenshots/01-operations-dashboard.png" width="420" alt="Operations dashboard" /> | <img src="docs/screenshots/08-transactions.png" width="420" alt="Switch transaction audit log" /> |
| The whole network at a glance: transaction, clearing, merchant, dispute, card, and token counts. | The switch's authorization audit log, filterable by status and currency. |

| Clearing cycles | Settlement instructions |
| --- | --- |
| <img src="docs/screenshots/09-clearing.png" width="420" alt="Clearing cycles with per-member net positions" /> | <img src="docs/screenshots/10-clearing-instructions.png" width="420" alt="pacs.009 settlement instructions" /> |
| Clearing cycles with per-member net positions. | The pacs.009 XML instructions that move money between members. |

| Settlement | Ledger |
| --- | --- |
| <img src="docs/screenshots/03-settlement.png" width="420" alt="Settlement and prefunding" /> | <img src="docs/screenshots/05-ledger.png" width="420" alt="Double-entry ledger" /> |
| Prefund account balances against caps, the default fund, and settlement instructions. | The append-only double-entry journal with computed balances per account. |

| Disputes | Merchants |
| --- | --- |
| <img src="docs/screenshots/06-scheme-disputes.png" width="420" alt="Scheme disputes view" /> | <img src="docs/screenshots/11-merchants.png" width="420" alt="Merchant directory" /> |
| Reason codes, lifecycle stage, SLA deadlines, evidence, and fees across all members. | Boarded merchants with MCC, risk tier, reserves, and limits. |

**Issuer**

| Issuer dashboard (`/issuer`) | Cards |
| --- | --- |
| <img src="docs/screenshots/04-issuer-dashboard.png" width="420" alt="Issuer dashboard" /> | <img src="docs/screenshots/07-cards.png" width="420" alt="Issued cards" /> |
| The issuer's portfolio: cards, tokens, and authorization activity. | Issued cards with masked PAN, status, product, and the ATC anti-replay counter. |

**Acquirer**

| Acquirer dashboard (`/acquirer`) | Acquirer disputes |
| --- | --- |
| <img src="docs/screenshots/17-acquirer-dashboard.png" width="420" alt="Acquirer dashboard" /> | <img src="docs/screenshots/16-acquirer-disputes.png" width="420" alt="Acquirer disputes view" /> |
| The acquirer's book: merchants, funding lines, and dispute exposure. | Chargebacks against the acquirer's merchants, with representment deadlines. |

**Viewer**

| Overview (`/overview`) | Operations activity |
| --- | --- |
| <img src="docs/screenshots/15-viewer-overview.png" width="420" alt="Read-only viewer overview" /> | <img src="docs/screenshots/13-operations-activity.png" width="420" alt="Operations activity feed" /> |
| The read-only seat: portfolio-wide metrics without operational controls. | The live feed of what the network is doing right now. |

## Requirements

- **Go 1.26+** to build and run the services and simulators.
- **Docker Desktop** with Linux containers for the full stack (`deploy/docker-compose.yml`).
- **PostgreSQL 16** and **Redis 7** — both optional. Every component falls back to an in-memory store when `CLARA_PG_DSN` / `CLARA_REDIS_ADDR` are unset.
- **Node.js 20+** only if you run the Next.js admin console under [`web/`](web/README.md).

> On Windows, `go test ./...` is blocked by AppLocker / Microsoft Defender Application Control on unsigned test binaries. Run the suite inside the provided Docker target (`docker build --target test`) or under WSL2.

## Quick start

```bash
# 1. Clone
git clone https://github.com/0xMudit/clara-card-network.git
cd clara-card-network

# 2. Run unit and integration tests (Linux, or the Docker target below)
go test ./...

# Or run the suite inside a Linux container
docker build --target test -t clara-network-test .

# 3. Boot the full 14-service stack (postgres, redis, switch, issuer-sim,
#    acquirer-sim, clearing-sim, ledger-sim, cardsvc, card-sim, acquiring-sim,
#    disputes-sim, hsm-sim, resilience-sim, instant-sim, adminapi)
docker compose -f deploy/docker-compose.yml up --build

# 4. Watch the demos run
docker compose -f deploy/docker-compose.yml logs switch acquirer-sim \
  clearing-sim ledger-sim card-sim acquiring-sim disputes-sim hsm-sim \
  resilience-sim instant-sim
```

The acquirer-sim sends six authorizations with BIN routing; a velocity rule declines the sixth with response code `59`. The one-shot sims then run to completion and exit `0`: a settlement cycle with a member default covered by the default fund, a clean ledger and reconciliation run, the issuing stack (cryptogram verify, tokenize, provision), acquiring (boarding, fees, reserves), disputes (representment, arbitration, chargeback ratios), the HSM drill (key ceremonies, PIN verify, retail MAC, rotation, zeroize), the resilience drill (failover, circuit-breaker trip, stand-in, 91-burst alert, half-open probe recovery), and instant payments (pacs.008 in, ACSC/RJCT out, SLA timeout).

Prefer to run a single service? Each command has a Make target and a `go run`:

```bash
go run ./cmd/switch        # ISO 8583 switch, TCP :8080
go run ./cmd/issuer-sim    # issuer host
go run ./cmd/clearing-sim  # clearing + net settlement demo
go run ./cmd/hsm-sim       # HSM key-ceremony demo
make run-resilience        # outage chaos drill
```

## Configuration

All configuration is via `CLARA_*` environment variables. The most useful:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `CLARA_LISTEN` | switch, issuer-sim, cardsvc | Listen address (`:8080`, `:8082`, `:8081` by default). |
| `CLARA_SWITCH` | acquirer-sim | Switch address to connect to (`localhost:8080`). |
| `CLARA_ISSUER_ROUTES` | switch | JSON `{receiving-institution-id: host:port}`; a value may be a comma-separated failover list. |
| `CLARA_BIN_TABLE` | switch | JSON BIN table, e.g. `{"entries":{"400000":"1000001000"}}`, when the message omits DE100. |
| `CLARA_RISK_RULES` | switch | JSON velocity rule set (per card / per merchant), Redis-backed when available. |
| `CLARA_REDIS_ADDR` | switch | Idempotency and risk counters (memory fallback). |
| `CLARA_PG_DSN` | switch, sims, adminapi | Optional persistence: audit, clearing, ledger, acquiring, disputes. |
| `CLARA_SEND_DE100` | acquirer-sim | Set `false` to omit DE100 and exercise BIN routing. |
| `CLARA_SCENARIO`, `CLARA_CYCLE`, `CLARA_OUT`, `CLARA_MISMATCH` | clearing/ledger sims | Batch scenario (`default`), cycle id, output dir (`out/clearing`), reconciliation-mismatch drill. |
| `CLARA_ISSUER_MASTER_KEY` | cardsvc, card-sim | 16-byte AES master key for card key derivation and cryptogram verification. |
| `CLARA_INSTANT_SLA` | instant-sim | SLA for the timeout drill (`3s`; the scheme default is 20s). |

Full reference: [`docs/27-implementation-status.md`](docs/27-implementation-status.md) section 27.5.

## How it works

```
  Acquirer host                          Clara switch                         Issuer host
 ┌───────────────┐   ISO 8583       ┌───────────────────────┐   ISO 8583   ┌──────────────┐
 │ acquirer-sim  │ ───────────────▶ │ routing (DE100 / BIN)  │ ───────────▶ │ issuer-sim   │
 └───────────────┘  TCP, len-prefix │ risk  ──▶ velocity     │              └──────────────┘
                                    │ failover list          │                     │
                                    │ idempotent replay      │◀──── ARQC verify ───┘
                                    │ circuit breaker + SIP  │
                                    └───────────┬───────────┘
                                                │ auth audit (PostgreSQL)
                                                ▼
   ┌───────────────────────┐   net positions   ┌────────────────────┐   balanced      ┌──────────────┐
   │ clearing-sim          │ ────────────────▶ │ ledger-sim         │ ──────────────▶ │ PostgreSQL    │
   │ capture · netting ·   │   pacs.009 XML    │ double-entry,      │   journal       │ (shared      │
   │ prefund · default fund│ ────────────────▶ │ reconciliation     │                 │  schema)     │
   └───────────────────────┘                   └────────────────────┘                 └──────┬───────┘
   cardsvc (issuing, tokens) · acquiring-sim (boarding, funding) · disputes-sim            │
   hsm-sim (keys, PIN, MAC) · resilience-sim (stand-in, breakers) · instant-sim (RTP)      ▼
                                                                              adminapi (:8083)  ─▶  Next.js web console
```

The switch parses and rebuilds ISO 8583 messages over 2-byte length-prefixed TCP, routes each authorization by DE100 or a BIN table, runs in-path velocity rules, and falls over across a per-issuer route list before invoking stand-in processing. Clearing nets every captured batch to a per-member position, applies prefunded caps and the default fund, and emits pacs.009 instructions; the ledger posts each net position as a balanced journal and reconciles it against the settlement agent's statement. All of it lands in one PostgreSQL schema that the read-only Admin API and the web console read back.

## Project layout

```
cmd/            One entry point per service and simulator (switch, issuer-sim, adminapi, ...)
internal/       Core libraries: iso8583, framing, switchsrv, binrouting, risk, clearing,
                ledger, cardsvc, acquiring, disputes, hsm, resilience, instant, adminapi, env
deploy/         docker-compose.yml (14 services) and the shared schema.sql
docs/           The 27-document research and specification library, plus architecture images
web/            Next.js admin console (Vercel + Supabase + Railway)
scripts/        smoke.sh / smoke.ps1 end-to-end checks
Makefile        build, test, vet, docker-test, run-<sim>, compose-up, smoke
```

## Admin API and web console

The Admin API is a read-only REST service on `:8083` (`http://localhost:18083` in the Docker stack) that queries the shared PostgreSQL schema.

```bash
# start the admin API (requires CLARA_PG_DSN)
go run ./cmd/adminapi
```

| Endpoint | Description |
| --- | --- |
| `GET /health` | Liveness probe. |
| `GET /api/v1/dashboard` | Summary counts (transactions, clearing, merchants, disputes, cards, tokens). |
| `GET /api/v1/dashboard/series` | Time series for the dashboard charts (`?days=30`). |
| `GET /api/v1/transactions` | Switch transaction audit log (filter by status, currency). |
| `GET /api/v1/clearing/cycles` | Clearing cycle list. |
| `GET /api/v1/clearing/records` | Clearing records (filter by cycle). |
| `GET /api/v1/clearing/positions` | Per-member net positions. |
| `GET /api/v1/settlement/instructions` | Settlement pacs.009 instructions. |
| `GET /api/v1/settlement/prefunds` | Prefund account balances vs caps. |
| `GET /api/v1/settlement/default-fund` | Default fund balance. |
| `GET /api/v1/ledger/accounts` | Double-entry ledger accounts and computed balances. |
| `GET /api/v1/ledger/entries` | Journal entry lines per account. |
| `GET /api/v1/cards` | Issued cards (masked PAN, status, product, ATC). |
| `GET /api/v1/bin-ranges` | BIN range assignments. |
| `GET /api/v1/tokens` | Network tokens (PAR, device, requestor). |
| `GET /api/v1/merchants` | Boarded merchants (MCC, risk tier, reserves, limits). |
| `GET /api/v1/funding-lines` | Merchant funding line balances. |
| `GET /api/v1/disputes` | Disputes (reason code, stage, status, evidence, fees). |
| `GET /api/v1/disputes/overdue` | Disputes past SLA deadline. |
| `GET /api/v1/disputes/{id}/ratio` | Chargeback ratio by merchant. |

The Next.js console under [`web/`](web/README.md) sits on top of it through a BFF (`/api/data/*`) that authenticates via Supabase, enforces a role allow-list, and proxies to the Go `adminapi`. Try the live demo and pick a persona at <https://clara-network.vercel.app/login>.

## Scripts

| Command | Description |
| --- | --- |
| `make build` | `go build ./...` |
| `make test` | `go test ./...` |
| `make vet` | `go vet ./...` |
| `make docker-test` | Run the test suite inside a Linux container. |
| `make compose-up` | Boot the full Docker Compose stack in the background. |
| `make smoke` | One-click end-to-end smoke test: boot, seed, verify DB + Admin API + frontend build; prints PASS/FAIL and exits non-zero on failure. |
| `make run-switch`, `make run-issuer`, `make run-clearing`, ... | Run any single service or simulator. |
| `cd web; npm run db:users` | Provision the demo persona accounts (password `ClaraDemo!2026`). |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Tests will not run on Windows | AppLocker / Defender block unsigned test binaries. Use `docker build --target test -t clara-network-test .` or WSL2. |
| `go run ./cmd/adminapi` exits immediately | It needs `CLARA_PG_DSN`. Rows only exist after a clearing cycle has run. |
| Demo console returns 500s | The Supabase free-tier database pauses after 7 days idle and takes the Admin API down with it. The daily [`keepalive`](.github/workflows/keepalive.yml) workflow pings it; pages otherwise fall back to realistic mock data. |
| Switch declines a request | Check the audit log (`GET /api/v1/transactions`) for response code `59` (risk), `51` (insufficient funds), or `91` (issuer unavailable / stand-in). |
| A one-shot sim exits non-zero | Read its logs with `docker compose -f deploy/docker-compose.yml logs <service>`; each sim verifies an invariant and fails loudly. |

## Roadmap

Ten blueprint phases are complete (v0.1.0-beta). Remaining work — load and capacity testing, a production HSM backend, and the post-beta backlog — is tracked in [`ROADMAP.md`](ROADMAP.md) and the [issue tracker](https://github.com/0xMudit/clara-card-network/issues).

## Documentation library

The repository carries a 27-document research and specification library under [`docs/`](docs/00-README.md) covering the four-party model, card numbering, ISO 8583, ISO 20022, EMV, tokenization, 3-D Secure, PCI DSS, interchange economics, scheme governance, settlement liquidity, stand-in processing, disputes, instant payments, and the full system design blueprint. Start at [`docs/00-README.md`](docs/00-README.md); the build blueprint is [`docs/25-clara-network-system-design.md`](docs/25-clara-network-system-design.md) and the as-built status is [`docs/27-implementation-status.md`](docs/27-implementation-status.md).

The architecture diagrams — the end-to-end system, the ISO 8583 authorization flow, clearing/settlement/liquidity, the issuer and tokenization stack, and the security/HSM/resilience topology — live in [`docs/images/`](docs/images/) with the prompts that generated them in [`docs/26-architecture-image-prompts.md`](docs/26-architecture-image-prompts.md).

## Contributing

Contributions are welcome — issues, docs, and pull requests alike. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup and the reviewable-PR bar, and [`docs/28-contributor-architecture-guide.md`](docs/28-contributor-architecture-guide.md) for where the code lives. Please read the [Code of Conduct](CODE_OF_CONDUCT.md); it applies to every project space.

## Security

Clara Network is a simulator and must not be connected to real card infrastructure, but it implements real key-management and message-security machinery worth respecting. Please report vulnerabilities privately per [`SECURITY.md`](SECURITY.md) rather than in a public issue.

## License

[MIT](LICENSE) — see the LICENSE file for details.
