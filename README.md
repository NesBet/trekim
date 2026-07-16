# Trekim Tavern

A full-featured e-commerce and point-of-sale platform for **Trekim Tavern**, a premium drinks lounge located along Magadi Road in Kiserian, Kenya. Built with Next.js 15, Prisma 7, PostgreSQL, and Tailwind CSS.

## Features

- **Customer Portal** — Browse inventory, add to cart, place orders with Paystack payment integration
- **Point of Sale (POS)** — Salespersons can create orders, process payments, and manage walk-in customers
- **Admin Dashboard** — Manage products, users, orders; update order statuses; soft/hard delete orders
- **Role-Based Access** — Three roles: `ADMIN`, `SALESPERSON`, `CUSTOMER` with route-level middleware enforcement
- **OTP Email Verification** — Sign-up verification via n8n webhooks (email-based OTP with hashing & expiry)
- **Floating Cart** — Persistent cart across the browsing experience
- **Dark Mode** — Theme toggle with `next-themes`
- **Responsive Design** — Mobile-first UI with Tailwind CSS
- **Security Headers** — X-Frame-Options, HSTS, CSP via Next.js custom headers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 7 |
| Auth | JWT (jose) + bcryptjs |
| Payments | Paystack |
| Styling | Tailwind CSS |
| Validation | Zod |
| Icons | Lucide React |
| Email/OTP | n8n (self-hosted webhooks) |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase or any provider)
- n8n instance (for OTP email verification)
- Paystack account (for payment processing)

### Environment Variables

Create a `.env` file in the root:

```env
# Database (use session-mode pooler for CLI, transaction-mode for runtime)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Auth
JWT_SECRET="your-secure-secret-key"

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_..."
PAYSTACK_SECRET_KEY="sk_test_..."

# App
NEXT_PUBLIC_APP_URL="https://your-domain.com"
ADMIN_PASSWORD="default-admin-password"

# n8n OTP webhooks
N8N_OTP_SEND_WEBHOOK="https://your-n8n-instance/webhook/send-otp"
N8N_OTP_VERIFY_WEBHOOK="https://your-n8n-instance/webhook/verify-otp"
N8N_WEBHOOK_SECRET="your-shared-secret"
```

### Installation

```bash
npm install
```

### Database Setup

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed default users and products
npx prisma db seed
```

The seed creates:
- **Admin** — `admin@trekim.co.ke` (password from `ADMIN_PASSWORD` env)
- **Salesperson** — `sales@trekim.co.ke` (password: `sales123`)
- **Customer** — `customer@trekim.com` (password: `customer123`)
- 15 sample drink products with pricing and categories

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Connection Notes

The app uses **PgBouncer connection pooling** for production:

- **Port 5432 (session mode)** — Use for Prisma CLI commands (`db push`, `migrate`, `studio`)
- **Port 6543 (transaction mode)** — Use for runtime (swap `DATABASE_URL` when running the app)

On Supabase free tier, direct connections may be IPv6-only. The pooler URLs at `pooler.supabase.com` provide IPv4 connectivity.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (auth)/signup/       # Sign-up page
│   ├── admin/               # Admin dashboard
│   │   ├── orders/          # Order management
│   │   ├── products/        # Product management
│   │   └── users/           # User management
│   ├── api/
│   │   ├── auth/            # Login, signup, verify-otp, logout, me
│   │   ├── orders/          # Order CRUD with role-based access
│   │   ├── paystack/        # Initialize, verify, webhook, STK push
│   │   └── products/        # Product CRUD
│   ├── cart/                # Shopping cart page
│   ├── dashboard/           # Salesperson dashboard & POS
│   ├── inventory/           # Public product catalog
│   ├── orders/              # Customer order history
│   └── payment/             # Payment callback handling
├── components/
│   ├── auth/                # Login & signup forms
│   ├── cart/                # Floating cart button
│   ├── layout/              # Navbar, footer, theme toggle
│   ├── products/            # Product card & form
│   └── ui/                  # Button, card, input, modal, table
├── lib/
│   ├── auth.ts              # JWT creation, password hashing, session management
│   ├── auth-edge.ts         # Edge-compatible JWT verification (middleware)
│   ├── auth-context.tsx     # React context for auth state
│   ├── cart-context.tsx     # React context for cart state
│   ├── n8n.ts               # n8n webhook client
│   ├── paystack.ts          # Paystack API client
│   ├── prisma.ts            # Prisma client singleton
│   ├── rate-limit.ts        # In-memory rate limiter
│   └── utils.ts             # Formatting & validation utilities
├── middleware.ts             # Route protection & role enforcement
└── types/
    └── paystack-inline.d.ts  # Paystack Inline type declarations
```

## Authentication Flow

1. **Sign Up** — User submits name, email, phone, password → API validates, calls n8n send-OTP webhook → n8n emails 6-digit OTP → User enters OTP → API calls n8n verify-OTP → on success, user is created in DB, JWT session is set
2. **Login** — Email + password → bcrypt verify → JWT set as httpOnly cookie
3. **Session** — JWT cookie (`trekim_token`) with 7-day expiry, verified on every request via middleware
4. **Inactivity Timeout** — Auto-logout after 30 minutes of inactivity (client-side check)

## Roles & Permissions

| Route | CUSTOMER | SALESPERSON | ADMIN |
|-------|----------|-------------|-------|
| `/inventory` | ✅ | ✅ | ✅ |
| `/cart` | ✅ | ❌ | ❌ |
| `/orders` | ✅ (own) | ❌ | ✅ |
| `/dashboard` | ❌ | ✅ | ✅ |
| `/dashboard/pos` | ❌ | ✅ | ✅ |
| `/admin` | ❌ | ❌ | ✅ |
| `/admin/orders` | ❌ | ❌ | ✅ |
| `/admin/products` | ❌ | ❌ | ✅ |
| `/admin/users` | ❌ | ❌ | ✅ |
| `/api/auth/*` | ✅ | ✅ | ✅ |
| `/api/orders` (GET) | ✅ (own) | ✅ (own) | ✅ (all) |
| `/api/orders` (POST) | ✅ | ✅ | ✅ |
| `/api/orders/[id]` (DELETE) | ✅ (own, unpaid) | ✅ (own, unpaid, soft) | ✅ (any, unpaid, hard) |
| `/api/orders/[id]` (PATCH) | ✅ (cancel own) | ✅ (any) | ✅ (any) |
| `/api/products` (POST/PATCH) | ❌ | ❌ | ✅ |
| `/api/users` | ❌ | ❌ | ✅ |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Validate & send OTP via n8n |
| POST | `/api/auth/verify-otp` | Verify OTP and create user |
| POST | `/api/auth/login` | Email + password login |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/orders` | List orders (filtered by role) |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/[id]` | Get order detail |
| PATCH | `/api/orders/[id]` | Update order status |
| DELETE | `/api/orders/[id]` | Delete order |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product (admin) |
| PATCH | `/api/products/[id]` | Update product (admin) |
| POST | `/api/paystack/initialize` | Initialize Paystack payment |
| POST | `/api/paystack/verify` | Verify Paystack transaction |
| POST | `/api/paystack/webhook` | Paystack webhook handler |

## Deployment

The project is deployed on **Vercel**:

```bash
npm run build
```

The `postinstall` script automatically runs `prisma generate` during builds.

### Vercel Environment Variables

Set all `.env` variables in your Vercel project dashboard. For production, use the **transaction-mode pooler** (port 6543) as `DATABASE_URL` to handle connection pooling.

---

Built by <a href="https://pulsemation.vercel.app">Pulsemation</a>
