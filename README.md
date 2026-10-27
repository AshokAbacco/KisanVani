# KisanVani — From Farm to Market

KisanVani is a full-stack platform for India's fresh-produce supply chain. Farmers list harvests, **Market Mandi Owners** trade wholesale lots, **shopkeepers** run a weighing-scale POS and buy stock, **drivers** carry loads with live GPS tracking, and **admins** run the platform. Every role works from the same orders, weights and payments, so nothing is typed twice and every step is audited.

---

## Contents

1. [Technology stack](#technology-stack)
2. [Folder structure](#folder-structure)
3. [Prerequisites](#prerequisites)
4. [Installation (quick start)](#installation-quick-start)
5. [PostgreSQL and pgAdmin setup](#postgresql-and-pgadmin-setup)
6. [Environment variables](#environment-variables)
7. [Prisma migrations](#prisma-migrations)
8. [Development seed and demo accounts](#development-seed-and-demo-accounts)
9. [Running the apps](#running-the-apps)
10. [Dashboards and roles](#dashboards-and-roles)
11. [Business rules and data model decisions](#business-rules-and-data-model-decisions)
12. [API documentation](#api-documentation)
13. [Real-time tracking, GPS and maps](#real-time-tracking-gps-and-maps)
14. [Thermal printer and weighing scale](#thermal-printer-and-weighing-scale)
15. [Testing](#testing)
16. [Production deployment](#production-deployment)
17. [Security considerations](#security-considerations)
18. [Troubleshooting](#troubleshooting)
19. [Known limitations](#known-limitations)

---

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, JavaScript/JSX, Tailwind CSS 3, React Router 6, Axios, React Hook Form, Recharts, Socket.IO client, Leaflet + React-Leaflet, lucide-react icons |
| Backend | Node.js (CommonJS), Express 4, Prisma ORM 7 (with the `pg` driver adapter), PostgreSQL 14+, JWT (access) + rotating opaque refresh tokens, bcrypt, Zod, Socket.IO 4, Multer (local disk or S3-compatible storage), Helmet, CORS, express-rate-limit, Winston, Nodemailer |
| Testing | Jest + Supertest + socket.io-client against a real PostgreSQL test database |
| Tooling | ESLint 9 (flat config) for both apps, concurrently for running both apps together |

Prisma 7 runs its query compiler in WebAssembly and talks to PostgreSQL through `@prisma/adapter-pg`, so there is no native query-engine binary at runtime. The Prisma **CLI** (migrations) still downloads its schema engine on first use.

---

## Folder structure

```
KisanVani/
├── package.json              # optional root scripts (install all, run both apps, lint, test)
├── README.md
├── server/
│   ├── prisma/
│   │   ├── schema.prisma     # complete data model (enums, relations, indexes)
│   │   ├── migrations/       # SQL migrations (use these in production)
│   │   └── seed.js           # development seed — goes through the real service layer
│   ├── prisma.config.js      # Prisma 7 config (schema path, migrations, seed, DATABASE_URL)
│   ├── src/
│   │   ├── app.js            # Express app: security middleware, routes, errors
│   │   ├── server.js         # HTTP + Socket.IO server, graceful shutdown, jobs
│   │   ├── config/           # env validation, Prisma client, logger
│   │   ├── constants/        # roles, order/trip state machines, default settings
│   │   ├── controllers/      # cross-cutting controllers (health)
│   │   ├── middlewares/      # authenticate/authorize, validate, rate limits, uploads, errors
│   │   ├── repositories/     # shared data-access helpers (index of module repositories)
│   │   ├── routes/           # /api/v1 router
│   │   ├── services/         # audit, notifications, storage (local/S3), email, settings, access control
│   │   ├── sockets/          # Socket.IO auth + trip tracking rooms
│   │   ├── jobs/             # token cleanup, stale-trip alerts, document-expiry reminders
│   │   ├── templates/        # e-mail templates
│   │   ├── utils/            # ApiError, money (Decimal), pagination, numbering, CSV, geo
│   │   ├── validators/       # shared Zod schemas
│   │   └── modules/          # one folder per domain: *.routes / *.controller / *.service / *.validation (+ *.repository where useful)
│   │       ├── auth  admin  shop  farmer  mandi  driver  vehicle
│   │       ├── products  categories  inventory  billing  procurement  customers  suppliers
│   │       └── orders  transport  tracking  payments  settlements  notifications  reports  settings
│   ├── tests/                # Jest suites + runner that targets a *_test database
│   ├── uploads/  logs/
│   └── .env.example
└── client/
    ├── public/               # favicon, logo, images
    ├── src/
    │   ├── auth/             # Login, Register, ForgotPassword, VerifyOTP, ResetPassword
    │   ├── components/       # common, forms, tables, charts, maps, modals, feedback
    │   ├── constants/        # roles, sidebar navigation, status tones
    │   ├── context/          # Auth, Toast, Settings
    │   ├── dashboards/       # admin, shop, farmer, mandi, driver — each with its own pages
    │   ├── features/         # shared feature screens: orders, transport, tracking, procurement, payments, reports, billing, products, account
    │   ├── hooks/            # useAsync, useList, useTripTracking, useLocationSharing…
    │   ├── i18n/             # translation provider + locales (en, hi, kn)
    │   ├── layouts/          # Public, Auth, Dashboard, Print
    │   ├── pages/            # public website
    │   ├── routes/           # AppRouter, ProtectedRoute, RoleRoute
    │   ├── services/         # Axios client (silent refresh), API wrappers, socket
    │   ├── store/            # POS bill reducer
    │   ├── utils/  validators/
    │   └── App.jsx  main.jsx  index.css
    └── .env.example
```

---

## Prerequisites

- **Node.js** 20.19+, 22.12+ or 24+ (required by Prisma 7)
- **npm** 10+
- **PostgreSQL** 14 or newer (tested with 16)
- **pgAdmin 4** (optional, for managing the database visually)
- Chrome or Edge for the optional USB/serial weighing scale (Web Serial API)

---

## Installation (quick start)

```bash
# 1. Unzip and enter the project
cd KisanVani

# 2. Install everything (root, server, client) and generate the Prisma client
npm run setup

# 3. Create the database (see the pgAdmin section) and edit server/.env:
#    DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/kisanvani?schema=public"
#    JWT_ACCESS_SECRET / JWT_REFRESH_SECRET -> long random strings

# 4. Create the tables and load demo data
npm run db:migrate          # prisma migrate dev (applies prisma/migrations)
npm run db:seed

# 5. Run API (http://localhost:5000) and web app (http://localhost:5173) together
npm run dev
```

Without the root scripts:

```bash
cd server && npm install && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed && npm run dev
cd client && npm install && npm run dev
```

---

## PostgreSQL and pgAdmin setup

1. **Install PostgreSQL** (Windows/macOS installer from postgresql.org, or `sudo apt install postgresql` on Ubuntu). Remember the password you set for the `postgres` user.
2. **Open pgAdmin 4** and connect to your server (right-click *Servers → Register → Server…*, host `localhost`, port `5432`, user `postgres`).
3. **Create the application database**: right-click *Databases → Create → Database…*, name it `kisanvani`, owner `postgres`, *Save*.
4. **(Recommended) Create a dedicated user** instead of using `postgres`: *Login/Group Roles → Create*, name `kisanvani_app`, set a password under *Definition*, enable *Can login?* under *Privileges*. Then on the `kisanvani` database → *Properties → Security*, grant `ALL` to `kisanvani_app` (or make it the owner). Prisma Migrate also needs permission to create a temporary *shadow database* in development, so for `migrate dev` either use `postgres` or give the role `CREATEDB`.
5. **Create the test database** for automated tests: another database named `kisanvani_test` (the name must end in `_test`).
6. **Set the connection string** in `server/.env`:
   ```
   DATABASE_URL="postgresql://kisanvani_app:YOUR_PASSWORD@localhost:5432/kisanvani?schema=public"
   ```
   URL-encode special characters in the password (e.g. `@` → `%40`).
7. **Run migrations** (`npm run db:migrate`), then in pgAdmin refresh *kisanvani → Schemas → public → Tables*. You should see 36 tables such as `users`, `orders`, `trips`, `sales_invoices`, plus `_prisma_migrations`.
8. **Inspect data**: right-click a table → *View/Edit Data → All Rows*, or use *Tools → Query Tool* (e.g. `SELECT "orderNumber", status, total FROM orders ORDER BY "createdAt" DESC;`). `npm --prefix server run prisma:studio` opens Prisma Studio as an alternative.

Column names are camelCase, so quote them in SQL: `"createdAt"`.

---

## Environment variables

### `server/.env`

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | | `5000` | API port |
| `NODE_ENV` | | `development` | `development`, `test` or `production` |
| `DATABASE_URL` | yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | yes | — | Signs 15-minute access tokens. **≥ 32 random characters in production** (the server refuses to start otherwise) |
| `JWT_REFRESH_SECRET` | yes | — | Key for HMAC-hashing refresh tokens at rest. Same strength rule |
| `CLIENT_URL` | | `http://localhost:5173` | Allowed browser origin(s), comma-separated. Also used for reset links |
| `JWT_ACCESS_EXPIRES_IN` | | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | | `7` | Refresh token lifetime |
| `BCRYPT_ROUNDS` | | `12` | Password hashing cost |
| `COOKIE_SECURE` / `COOKIE_SAME_SITE` | | `false` / `lax` | Refresh-cookie flags. Use `COOKIE_SECURE=true` behind HTTPS; `none` only if web and API are on different sites |
| `PUBLIC_SERVER_URL` | | `http://localhost:5000` | Used to build URLs for locally stored uploads |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | | empty | Password-reset e-mail. If `SMTP_HOST` is empty, development logs the code/link to the server console; production reports e-mail as unavailable |
| `STORAGE_DRIVER` | | `local` | `local` (disk under `UPLOAD_DIR`) or `s3` |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | | `uploads`, `5` | Local upload folder and size cap |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` | for `s3` | | Any S3-compatible store (AWS S3, Cloudflare R2, MinIO, Spaces). Set `S3_ENDPOINT` for non-AWS stores |
| `TRACKING_MIN_INTERVAL_SEC` | | `5` | Server-enforced minimum gap between GPS points per trip |
| `TRACKING_STALE_AFTER_SEC` | | `120` | Default staleness threshold (also editable in Platform settings) |
| `LOG_LEVEL`, `LOG_TO_FILE` | | `info`, `true` | Winston logging; files go to `server/logs/` |

### `client/.env`

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | API base URL |
| `VITE_SOCKET_URL` | origin of the API URL | Socket.IO server, if different |

The shipped `.env` files contain **development placeholders only**. Never commit real `.env` files (they are git-ignored; only `.env.example` is tracked).

---

## Prisma migrations

| Command (in `server/`) | When |
|---|---|
| `npm run prisma:generate` | After install and after every schema change |
| `npm run prisma:migrate` | Development: applies pending migrations and creates new ones from schema changes (`prisma migrate dev`) |
| `npm run prisma:deploy` | Production/CI: applies committed migrations only (`prisma migrate deploy`) |
| `npm run prisma:validate` | Check `schema.prisma` |
| `npm run prisma:studio` | Browse data |

The initial migration lives in `prisma/migrations/20261026000000_init/`. Schema changes should always go through a new migration — do not use `prisma db push` against shared or production databases. Prisma 7 reads the connection URL from `prisma.config.js` (which loads `server/.env`), not from `schema.prisma`.

---

## Development seed and demo accounts

`npm run prisma:seed` fills an **empty** database; `npm run prisma:seed -- --reset` wipes it first (refused when `NODE_ENV=production`). The seed calls the same services the API uses, so stock, reservations, settlements and audit entries are all consistent. It creates a 30-product catalogue, stock for the shop, POS bills (cash, UPI, udhar), harvest listings, mandi lots, verified vehicles, one order taken all the way from placement through transport and delivery to receipt and payment, orders waiting for action, an open load for drivers and a pending driver registration.

**Development-only credentials** (sign in with e-mail *or* mobile, and choose the matching role):

| Role (login tile) | E-mail | Mobile | Password |
|---|---|---|---|
| Admin | admin@kisanvani.local | 9000000001 | `Admin@12345` |
| Shopkeeper | shop@kisanvani.local | 9000000002 | `Shop@12345` |
| Farmer | farmer@kisanvani.local | 9000000003 | `Farmer@12345` |
| Market Mandi | mandi@kisanvani.local | 9000000004 | `Mandi@12345` |
| Driver | driver@kisanvani.local | 9000000005 | `Driver@12345` |

Also seeded: a second farmer (`farmer2@kisanvani.local`), a second driver (`driver2@kisanvani.local`) and a driver awaiting approval (mobile `9000000008`). **Do not seed production databases**; create the first production admin with the seed's admin block removed or through a one-off script, and change its password immediately.

---

## Running the apps

| | Development | Production build |
|---|---|---|
| API | `cd server && npm run dev` (nodemon) | `npm start` |
| Web | `cd client && npm run dev` → http://localhost:5173 | `npm run build` → static files in `client/dist`; `npm run preview` to test locally |
| Both | `npm run dev` from the project root | |

Health check: `GET http://localhost:5000/health` (reports database status).

---

## Dashboards and roles

Each account has exactly **one role**. The login screen asks for the role, but the server verifies it against the account and refuses a mismatch; every API call is authorised again on the server, and the UI only hides what the API would refuse anyway.

| Role | Accent | Main screens |
|---|---|---|
| **Admin** (`/admin`) | slate | Platform overview (counts, order volume, trade value, registrations, completed trips, live trip map) · Farmer / Shopkeeper / Market Mandi Owner / Driver management · Users & roles (create accounts, approve, suspend, deactivate, sign out sessions) · Vehicle verification · Products & categories · Orders (view all; cancel for moderation only) · Transport & trips (assign drivers) · Payments & settlements (read-only) · Reports with CSV export · Notifications (broadcast) · Platform settings · Audit logs |
| **Shopkeeper** (`/shop`) | green | Overview · Billing & weighing (POS) · Sales history (view, reprint, cancel) · Udhar / Khata · Customers · Stock & rates master · Inventory (levels + ledger + adjustments) · Purchases from suppliers · Suppliers · Order from farmers · Order from Market Mandi · My orders · Deliveries (live tracking) · Payments · Reports · Shop GPS profile · Settings |
| **Farmer** (`/farmer`) | green | Dashboard · My crops · Harvest listings (publish, pause, complete) · Post new harvest (photos, GPS) · Orders from shops · Orders from mandis · Transport requests · Payments & earnings · Sales history · Reports · Farmer profile · Settings |
| **Market Mandi Owner** (`/mandi`) | amber/orange | Dashboard (lots, wholesale orders, volume, trade value, commission) · Mandi lots / create lot · Wholesale products · Incoming shop orders · Order management · Farmer procurement · Partners · Transport & logistics · Vehicle assignments · Settlements · Payments · Reports · Mandi profile (incl. commission %) · Settings |
| **Driver** (`/driver`) | blue | Dashboard · My trips · Transport assignments (accept assigned trips or take open loads) · Live tracking · Pickup confirmation · Delivery confirmation · Trip history · Vehicle details · Vehicle documents · Earnings · Notifications · Profile · Settings |

Self-registration is available for Farmer, Shopkeeper, Market Mandi Owner and Driver. By default Market Mandi Owners and Drivers start as **pending approval** (configurable in *Platform settings → Accounts*). Admin accounts can only be created by an admin.

The UI uses "Market Mandi" on the login screen and "Market Mandi Owner" as the formal role name throughout.

---

## Business rules and data model decisions

**Money and weights.** All amounts are `Decimal(14,2)` and all quantities `Decimal(12,3)` kilograms (gram precision). Arithmetic uses Prisma's `Decimal` (decimal.js) with half-up rounding — never JavaScript floats. API responses serialise decimals as strings (e.g. `"71.88"`, trailing zeros omitted); the client formats them in Indian style (₹1,23,456.00). Timestamps are stored in UTC and shown in the browser's timezone; daily report buckets use Asia/Kolkata.

**Unified `Order` model.** Shop ← Farmer purchases, Shop ← Market Mandi wholesale orders and Market Mandi ← Farmer procurement share one `Order` + `OrderItem` model with a `type` (instead of separate `PurchaseOrder`/`WholesaleOrder` tables). They share the same lifecycle, reservation, transport, payment and settlement logic. `PurchaseOrder`/`PurchaseOrderItem` are used for the shop's **off-platform supplier purchases**.

**Order lifecycle.** `PLACED → ACCEPTED → PREPARING → READY → DISPATCHED → DELIVERED → RECEIVED`, plus `REJECTED` (seller, at PLACED) and `CANCELLED` (buyer before acceptance processing; seller until ready). Reasons are mandatory for rejection/cancellation. Every transition is a guarded `UPDATE … WHERE status = <expected>` and is recorded in `order_status_history`. A linked trip's pickup moves the order to DISPATCHED and its delivery to DELIVERED automatically. Admins may only cancel (moderation), never act for a party; that action is audited.

**Reservations.** Placing an order deducts quantity from the listing/lot in a single conditional `UPDATE … WHERE available >= qty`, so concurrent buyers can never oversell. Listings flip to `SOLD_OUT` at zero and back to `ACTIVE` when a rejection/cancellation releases quantity. Order and bill creation are idempotent (client-generated key, unique per buyer/shop), so double taps and retries are safe.

**Receipt, stock and settlement.** When the buyer confirms receipt, in one transaction: the order becomes RECEIVED (only once), a shop's inventory increases by the *received* kilos (ledger type `ORDER_RECEIPT`), and a `Settlement` is created from received kilos × agreed price. When a Market Mandi buys from a farmer, the mandi's commission % is deducted from the farmer's net; an optional platform fee % applies to all settlements. Shortfalls between ordered and received quantity are not returned to the seller's listing (they are treated as transit/quality loss and are visible on the order).

**POS billing.** Prices always come from the shop's stock & rates master on the server; the client sends only items and weights. Stock is deducted with conditional updates inside the bill transaction, invoice numbers come from an atomic per-shop counter (`KV-<shopCode>-<yy>-<seq>`), discounts are capped by a platform setting, and udhar bills update the customer's balance with a guarded check against their credit limit. Cancelling a bill restores stock, reverses udhar and marks payments refunded. Reprints are counted and audited.

**Trips.** `ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED`, with `REJECTED` (driver, from ASSIGNED), `CANCELLED` (assigner/requester before pickup; driver after accepting) and `FAILED` (driver, after pickup); reasons are required. Rejected/failed/reassigned loads go back to `OPEN`. Vehicles must be verified, active, insured and large enough for the load.

**Audit.** Logins, registrations, approvals, status changes, rate changes, stock adjustments, cancellations, payments, settings changes and admin exports are written to `audit_logs`. The application has no endpoint to edit or delete audit entries or payments.

---

## API documentation

All endpoints are under **`/api/v1`**. Unless marked *public*, they require `Authorization: Bearer <accessToken>`.

**Responses**

```json
{ "success": true, "data": { … }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [{ "path": "mobile", "message": "…" }] } }
```

**Status codes**: `200` OK · `201` created · `400` bad request · `401` not signed in / token expired (`TOKEN_EXPIRED`) · `403` wrong role or inactive account · `404` not found (also used for records you may not see) · `409` conflict (state changed, insufficient stock, duplicate) · `422` validation / business-rule failure · `429` rate limited · `5xx` server error.

**List endpoints** accept `page`, `limit` (≤100), `search`, `sortBy`, `sortOrder` (`asc`/`desc`), `from`, `to` (dates) plus the filters noted.

**Auth & session** — refresh tokens are httpOnly cookies scoped to `/api/v1/auth`.

| Method & path | Access | Notes |
|---|---|---|
| POST `/auth/register` | public, rate-limited | Role-specific fields (shopName / farmName / mandiName / licenseNumber). ADMIN not allowed |
| POST `/auth/login` | public, rate-limited | `{ identifier, password, role }` — identifier is e-mail or mobile; role must match the account |
| POST `/auth/refresh` | cookie | Rotates the refresh token; reuse of an old token revokes the whole family |
| POST `/auth/logout` | cookie | Revokes the refresh token |
| POST `/auth/forgot-password` | public | Always 200 (no account enumeration); e-mails a 6-digit code + link |
| POST `/auth/verify-otp` | public | `{ identifier, otp }` → `{ resetToken }`; max 5 attempts |
| POST `/auth/reset-password` | public | `{ token, password }`; single use; signs out all devices |
| GET / PATCH `/auth/me` | any role | Profile, address/GPS and role profile fields |
| POST `/auth/me/avatar` | any role | multipart `avatar` |
| POST `/auth/change-password`, `/auth/logout-all` | any role | |

**Administration**

| Method & path | Access |
|---|---|
| GET `/admin/dashboard` | ADMIN — counts and charts (`from`, `to`) |
| GET, POST `/admin/users` · GET, PATCH `/admin/users/:id` | ADMIN — filters `role`, `status` |
| POST `/admin/users/:id/status` | ADMIN — `{ status: ACTIVE|SUSPENDED|DEACTIVATED, reason }` |
| POST `/admin/users/:id/revoke-sessions` | ADMIN |
| GET `/admin/audit-logs` | ADMIN — filters `action`, `entityType`, `actorId`, `entityId` |
| GET `/settings/public` | public — map tiles, tracking interval, discount cap… |
| GET `/settings` · PUT `/settings/:key` | ADMIN — each key validated by type; audited |
| GET `/categories` · POST, PATCH, DELETE `/categories/:id` | read: any role · write: ADMIN (in-use categories are deactivated) |
| GET `/products`, `/products/:id` · POST, PATCH `/products/:id`, POST `/products/:id/image` | read: any role (`categoryType`, `categoryId`) · write: ADMIN |
| POST `/notifications/broadcast` | ADMIN — `{ role?, title, message, link? }` |

**Shop: stock, POS, customers, suppliers, purchases**

| Method & path | Access |
|---|---|
| GET `/shop/dashboard` | SHOPKEEPER |
| GET, POST `/inventory` · GET, PATCH `/inventory/:id` · POST `/inventory/:id/adjust` · GET `/inventory/transactions` | SHOPKEEPER (own stock) — filters `categoryType`, `lowStock` |
| GET `/billing/pos-config` | SHOPKEEPER |
| POST `/billing/invoices` | SHOPKEEPER — `{ idempotencyKey, items:[{inventoryItemId, quantityKg}], paymentMode: CASH|UPI|CREDIT, discount?, amountPaid?, customerName?, customerMobile? }` → 201 (or 200 for a repeated key) |
| GET `/billing/invoices`, `/billing/invoices/:id` | SHOPKEEPER (own), ADMIN (all) |
| POST `/billing/invoices/:id/print` · POST `/billing/invoices/:id/cancel` | SHOPKEEPER (own) |
| GET, POST `/customers` · GET, PATCH `/customers/:id` · POST `/customers/:id/collect` | SHOPKEEPER — khata ledger in GET by id |
| GET, POST `/suppliers` · GET, PATCH `/suppliers/:id` | SHOPKEEPER |
| GET, POST `/procurement/purchases` · GET `/procurement/purchases/:id` · POST `…/receive`, `…/cancel`, `…/payments` | SHOPKEEPER — stock increases only on receipt |

**Marketplace and orders**

| Method & path | Access |
|---|---|
| GET `/procurement/harvest-listings` (+`/:id`) | SHOPKEEPER, MANDI_OWNER, ADMIN — ACTIVE listings only; filters `categoryType`, `productId`, `district`, `minPrice`, `maxPrice`; includes `distanceKm` |
| GET `/procurement/mandi-lots` (+`/:id`) | SHOPKEEPER, ADMIN — AVAILABLE lots only |
| GET `/farmers/dashboard`, `/farmers/crops` | FARMER |
| GET, POST `/farmers/listings` · GET, PATCH `/farmers/listings/:id` · POST `…/status` · POST, DELETE `…/images` | FARMER (own) |
| GET `/mandi/dashboard`, `/mandi/products`, `/mandi/partners` · PUT `/mandi/commission` | MANDI_OWNER |
| GET, POST `/mandi/lots` · GET, PATCH `/mandi/lots/:id` · POST `…/status` · POST, DELETE `…/images` | MANDI_OWNER (own) |
| POST `/orders` | SHOPKEEPER (`source` HARVEST or MANDI_LOT), MANDI_OWNER (HARVEST) — `{ idempotencyKey, source, items:[{sourceId, quantityKg}], deliveryAddress?, expectedDeliveryAt?, notes? }` |
| GET `/orders` · GET `/orders/:id` | buyer/seller (own; `as=buyer|seller`, `type`, `status` comma list), ADMIN (all) |
| POST `/orders/:id/transition` | seller/buyer per state machine; ADMIN cancel only — `{ status, reason?, items?[{itemId, deliveredQuantityKg}] }` |
| POST `/orders/:id/receive` | buyer — `{ items:[{itemId, receivedQuantityKg}] }` |

**Transport, tracking, vehicles**

| Method & path | Access |
|---|---|
| POST `/transport/requests` | FARMER, SHOPKEEPER, MANDI_OWNER, ADMIN (optionally tied to an order you are party to) |
| GET `/transport/requests` (+`/:id`) | own/related requests; DRIVER sees OPEN loads; ADMIN all |
| POST `/transport/requests/:id/cancel` | requester, ADMIN |
| POST `/transport/requests/:id/claim` | DRIVER — `{ vehicleId, transportCharge? }` |
| GET `/transport/available-drivers` · POST `/transport/trips` | ADMIN, MANDI_OWNER (own loads) — assign `{ transportRequestId, driverId, vehicleId, transportCharge, estimatedArrivalAt? }` |
| GET `/transport/trips` (+`/:id`) | driver, assigner, requester, order parties, ADMIN |
| POST `/transport/trips/:id/transition` | driver / manager per state machine — `{ status, reason?, loadedQuantityKg?, deliveredQuantityKg?, estimatedArrivalAt? }` |
| POST `/transport/trips/:id/proof` | DRIVER — multipart `file` (image/PDF) + `receiverName`, `deliveredQuantityKg` |
| GET `/tracking/active` | trips the caller may see (ADMIN all) |
| POST `/tracking/trips/:id/locations` | assigned DRIVER only; REST fallback for sockets; rate-limited |
| GET `/tracking/trips/:id/locations` | trip parties and ADMIN |
| GET `/drivers/dashboard`, `/drivers/earnings` | DRIVER |
| GET, POST `/vehicles` · GET, PATCH `/vehicles/:id` · POST, DELETE `/vehicles/:id/documents[/:docId]` | DRIVER (own); GET for ADMIN |
| POST `/vehicles/:id/verify`, `/vehicles/:id/documents/:docId/verify` | ADMIN |

**Money, notifications, reports**

| Method & path | Access |
|---|---|
| GET `/payments`, `/payments/summary` | own payments (ADMIN all) — filters `purpose`, `mode`, `as` |
| POST `/payments/orders/:orderId` | order buyer — capped at the amount due |
| POST `/payments/trips/:tripId` | trip requester/assigner — after delivery |
| GET `/settlements` (+`/:id`) | payer/payee (ADMIN all) |
| GET `/notifications`, `/notifications/unread-count` · POST `/notifications/:id/read`, `/notifications/read-all` | any role (own) |
| GET `/reports/summary` | role-specific figures for `from`/`to` (max 1 year) |
| GET `/reports/export?dataset=…` | CSV, scoped to the caller: `sales`, `stock`, `credit`, `orders`, `settlements`, `trips`, `payments`, `users` (ADMIN) |

**Socket.IO** (same origin as the API; `auth: { token: <accessToken> }`)

| Event | Direction | Payload |
|---|---|---|
| `trip:subscribe` / `trip:unsubscribe` | client → server | `{ tripId }` → ack `{ ok, trip?, error? }` (only trip parties and admins) |
| `trip:location` | driver → server | `{ tripId, latitude, longitude, accuracy?, speed?, heading?, recordedAt? }` → ack |
| `trip:location`, `trip:status`, `trip:tracking-stopped`, `trip:stale` | server → trip room | live updates |
| `notification:new` | server → user | new notification |

---

## Real-time tracking, GPS and maps

- Drivers **switch location sharing on themselves** from the trip screen. The browser asks for permission; sharing only works on HTTPS or `localhost`.
- Points are accepted only from the **assigned driver**, only while the trip is `ACCEPTED`, `PICKED_UP` or `IN_TRANSIT`, at most once per `TRACKING_MIN_INTERVAL_SEC` (enforced in the database update, so parallel connections cannot bypass it). The client sends every *Platform settings → tracking.locationIntervalSec* seconds (default 15). Each point is stored with its timestamp in `trip_locations`.
- Watchers see the latest position, the travelled path and **"Live — updated N seconds ago"**. After *tracking.staleAfterSec* (default 120 s) without a point, the marker turns grey and the panel says **"Driver offline — last seen …"**. A background job also emits `trip:stale`. No location is ever invented.
- Sharing stops automatically, and the server refuses further points, when the trip is delivered, failed, rejected or cancelled.
- Only the driver, whoever assigned or requested the trip, the order's buyer and seller, and admins can read a trip's location (REST and socket rooms are checked on the server; unrelated users get "not found").
- **Maps** use Leaflet with OpenStreetMap tiles by default. Change *Platform settings → map.tileUrl / map.attribution* to use another provider (e.g. MapTiler, Stadia, Thunderforest or a self-hosted tile server); keep the provider's required attribution. The OSM public tile server is for light use only — use a commercial or self-hosted provider in production. "Navigate" buttons open Google Maps directions.

---

## Thermal printer and weighing scale

**80 mm thermal memo.** *Save & print* on the billing screen (or the printer icon in *Sales history*) opens `/shop/invoices/:id/print`, laid out for 72 mm printable width with a monospace font.
1. Install the printer's Windows/macOS/Linux driver (most ESC/POS printers — Epson TM-T82/T88, TVS RP3160, Retsol, Xprinter — ship one) and set paper size to 80 mm (or "Roll paper 80 × 297").
2. In the browser print dialog choose the thermal printer, **Margins: None**, **Scale: 100%**, and turn off headers/footers. Chrome remembers these per printer.
3. For one-click printing on a dedicated counter PC, start Chrome with `--kiosk-printing` so the dialog is skipped.
Reprints are marked "DUPLICATE" on the memo and logged.

**Weighing scale (optional).** Manual entry and quick weights always work. To read a scale directly, an admin enables *Platform settings → Billing → weighing scale* and sets the baud rate. On the billing screen, *Connect scale* opens the browser's serial-port picker (Chrome/Edge, HTTPS or localhost). Scales that stream lines like `ST,GS,+ 1.250kg` or `500 g` over RS-232/USB-serial are supported; the latest reading fills the weight box. Configure the scale for continuous output. Other protocols may need adjustments in `client/src/features/billing/useWeighingScale.js` (`parseScaleLine`).

---

## Testing

```bash
# 1. Create the test database once (name must end in _test)
createdb -U postgres kisanvani_test        # or in pgAdmin

# 2. Run the suites (applies migrations to the test DB, then Jest)
cd server
TEST_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/kisanvani_test" npm test
#   Windows PowerShell: $env:TEST_DATABASE_URL="…"; npm test
#   If TEST_DATABASE_URL is unset, the DATABASE_URL database name gets a _test suffix.
#   SKIP_MIGRATE=1 skips the migrate step.

# 3. Lint and build
npm run lint                      # server
cd ../client && npm run lint && npm run build
```

The test database is wiped between suites. **58 tests across 5 suites** cover:

- **auth** — registration rules, approval flow, server-side role check, generic login errors, suspension, forged tokens, refresh rotation and reuse detection, logout, OTP reset (single use, lockout), password change, per-role API access, profile updates
- **billing** — exact decimal maths, server pricing, invoice numbering, idempotent double submit, all-or-nothing stock deduction, 6 parallel sales on 3 kg of stock (never negative), cross-shop isolation, discount cap, udhar limit and collection, cancellation, reprint audit, stock adjustments
- **orders** — listing lifecycle, minimums and availability, parallel buyers cannot oversell, rejection releases stock, transition permissions and order, delivered/received quantities, receipt adds stock once, settlement maths incl. mandi commission, payment caps, admin moderation
- **transport** — vehicle normalisation/verification/re-verification, document signature checks, the full trip lifecycle driving the order, rejection back to market, a race between two claims, location authorization (REST and Socket.IO), rate limiting, stop-on-termination
- **modules** — catalogue CRUD and admin-only writes, stock master, customers, supplier purchase receipt, mandi lots, admin user management safeguards, settings validation and audit, broadcasts, reports and scoped CSV exports, API conventions, optional-date handling

**Manual end-to-end procedure** (what was exercised in a real browser before packaging): sign in as the shopkeeper, bill 500 g tomato + 750 g carrot by UPI (₹58.00) and open the memo; order 60 kg tomatoes from the farmer marketplace; as the farmer accept → start preparing → request transport; as admin assign Manjunath on *Transport & trips → Requests*; as the driver accept the trip and *Share my location* (allow the browser prompt); as the shop open the order → *Track live*; as the driver confirm pickup → start trip → confirm delivery; as the shop confirm receipt and check *Inventory* and *Payments → Settlements*.

---

## Production deployment

1. **Database**: managed PostgreSQL (or your own) with backups. Use a dedicated role with least privilege for the app; run `npm run prisma:deploy` from CI/CD or a release step (not `migrate dev`).
2. **Secrets**: generate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with `openssl rand -base64 48`; keep them in your platform's secret store. Rotating `JWT_REFRESH_SECRET` signs everyone out.
3. **API**: `NODE_ENV=production`, `COOKIE_SECURE=true`, `CLIENT_URL=https://app.example.com`, `PUBLIC_SERVER_URL=https://api.example.com`. Run with a process manager (`pm2 start src/server.js --name kisanvani-api`, systemd or a container). Behind a reverse proxy (Nginx/Caddy/ALB) terminate TLS and **enable WebSocket upgrades** for `/socket.io/`. `app.set('trust proxy', 1)` assumes one proxy hop for correct client IPs in rate limiting.
4. **Single vs multiple instances**: Socket.IO rooms are in-memory. For more than one API instance add the Socket.IO Redis adapter and enable sticky sessions; the express-rate-limit memory store should also move to Redis.
5. **Uploads**: use `STORAGE_DRIVER=s3` with a bucket (or CDN) that serves files publicly or via your proxy. Local disk only suits a single server with persistent storage.
6. **Web app**: `VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build` and serve `client/dist` from any static host/CDN with an SPA fallback to `index.html` (Nginx: `try_files $uri /index.html;`). Same-site domains (`app.` and `api.` of one domain) keep `COOKIE_SAME_SITE=lax` working.
7. **E-mail**: configure SMTP (SES, SendGrid, Postmark, Zoho…) so password resets work.
8. **Maps**: switch from the public OSM tile server to a provider suited to production traffic.
9. **Monitoring**: point uptime checks at `/health`; ship `server/logs/*.log` or stdout JSON logs to your log platform.

---

## Security considerations

- Passwords: bcrypt (cost 12). Login errors do not reveal whether an account exists; timing is equalised.
- Access tokens: 15-minute JWTs kept in memory on the client (never in localStorage). Refresh tokens: random 48-byte values in an httpOnly, SameSite cookie scoped to `/api/v1/auth`, stored only as HMAC-SHA256 hashes, rotated on every use, with family-wide revocation on reuse. Password change/reset revokes sessions and invalidates older access tokens.
- Every request re-loads the user, so suspensions and role changes apply immediately. Roles are never taken from the client.
- Object-level authorisation everywhere: users only see their own stock, bills, listings, lots, orders, trips, payments and locations; others' records return 404.
- Zod validation on every body/query/param; IDs must be UUIDs; unknown setting keys are rejected.
- Helmet security headers, strict CORS allow-list, JSON body limit, rate limits (general, auth, GPS), uploads restricted by MIME type, size and **magic-byte signature**; served with `nosniff`.
- CSV exports neutralise spreadsheet formula injection.
- All stock, reservation, billing, payment and settlement changes run in database transactions with conditional updates; idempotency keys prevent duplicates.
- Financial records and audit logs cannot be edited or deleted through the API.
- Location data is shared only during active trips with trip parties.
- Production start-up refuses weak/default JWT secrets.

Before going live, also: enable HTTPS everywhere, review CORS origins, set up database backups and point-in-time recovery, add CAPTCHA to public auth forms if abused, and review the privacy policy and terms pages with legal counsel.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Invalid environment configuration` on start | A required variable is missing or too short in `server/.env` (`DATABASE_URL`, JWT secrets ≥ 8 chars; ≥ 32 in production) |
| `Cannot connect to PostgreSQL` | Is PostgreSQL running? Check host/port/user/password in `DATABASE_URL`; URL-encode special characters in the password |
| `P1010` / permission denied during migrate | The DB user lacks rights; grant privileges or use the database owner. `migrate dev` also needs `CREATEDB` for the shadow database |
| `relation "users" does not exist` | Run `npm run prisma:migrate` (or `prisma:deploy`) |
| `@prisma/client did not initialize yet` | Run `npm run prisma:generate` |
| Prisma CLI cannot download its engine (corporate proxy/offline) | Allow `binaries.prisma.sh`, set `HTTPS_PROXY`, or point `PRISMA_SCHEMA_ENGINE_BINARY` at a pre-downloaded engine |
| Browser shows CORS errors / signed out on refresh | `CLIENT_URL` must exactly match the web origin (scheme, host and port). For different sites use HTTPS with `COOKIE_SAME_SITE=none` |
| "Cannot reach the KisanVani server" | Check `VITE_API_BASE_URL` and that the API is running; rebuild the client after changing `.env` |
| Login says the account is registered as another role | Choose the matching tile on the login screen |
| Driver/mandi cannot sign in after registering | The account awaits approval: Admin → Users & roles → *Awaiting approval* → Approve |
| No password-reset e-mail | Configure SMTP. In development the code and link are printed in the API console |
| Location sharing does nothing | Use HTTPS or localhost, allow location permission, keep the trip screen open; the trip must be accepted |
| Map tiles are blank | The tile server is unreachable or blocks your traffic — set another provider in Platform settings |
| Thermal memo has margins or is too small | Print dialog: margins None, scale 100%, paper 80 mm |
| "Connect scale" missing | Enable it in Platform settings → Billing; use Chrome/Edge over HTTPS/localhost |
| Node prints a `pg` "client.query() when the client is already executing" deprecation warning | Emitted by Prisma's executor for nested writes inside transactions on `pg` 8; harmless. Keep `pg` on major version 8 until Prisma adds pg 9 support |

---

## Known limitations

- **Languages**: English is complete; Hindi and Kannada cover the main navigation, auth and account screens; Telugu, Tamil, Malayalam and Marathi are set up in `client/src/i18n` but not yet translated (they show as "coming soon"). Missing strings fall back to English.
- **SMS/OTP by SMS** is not implemented; password-reset codes are delivered by e-mail. Accounts without an e-mail cannot self-reset in production — an admin can create a new temporary password by recreating access (or add an SMS provider in `email.service.js`'s place).
- **Payments are recorded, not processed**: KisanVani records cash/UPI/bank payments between users; it does not integrate a payment gateway or generate UPI QR codes. The shop's UPI ID is shown on the POS and memo.
- **Weighing scales**: Web Serial integration targets scales that stream ASCII weights; proprietary protocols may need a custom parser. Bluetooth scales are not supported.
- **Tracking** works while the driver keeps the trip screen open in the browser; background tracking with the screen off needs a native app.
- **Contact form** opens the visitor's e-mail app addressed to support rather than storing messages server-side.
- **Scale-out**: Socket.IO and rate limiting use in-memory stores; add Redis for multiple API instances.
- **Build environment note**: the packaged project was verified on Node 22 and PostgreSQL 16 — install, Prisma client generation, schema validation, all 58 backend tests, ESLint for both apps, the production client build, API start-up, a crawl of all 72 dashboard pages for the five roles and a scripted multi-role browser workflow all passed. In that environment the Prisma CLI's schema-engine download was blocked, so the initial migration SQL was generated with the matching Prisma 7.10.1 schema engine (WebAssembly build) and applied with `psql`; `prisma migrate dev/deploy` itself will run normally on a machine with internet access.
