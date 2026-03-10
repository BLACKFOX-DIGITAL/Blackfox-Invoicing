# Invofox 2.0

A self-hosted invoicing and billing application built with Next.js, Prisma, and SQLite.

## Features

- Invoice generation and management
- Customer management with contact details
- Payment tracking
- Email reminders (with ZeptoMail integration)
- Work logs and service-based billing
- Financial statements and reports
- Role-based access control (Owner / Manager / Worker)

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm v9 or later

### 1. Clone the repository

```bash
git clone https://github.com/yourname/invofox.git
cd invofox
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values. At minimum you need:

| Variable | Description | Required |
|---|---|---|
| `AUTH_SECRET` | Random secret for JWT signing. Generate with `openssl rand -base64 32` | ✅ Yes |
| `NEXTAUTH_URL` | Full URL where the app is hosted (e.g. `http://localhost:3000`) | ✅ Yes |
| `DATABASE_URL` | Database connection string. Defaults to SQLite. | ✅ Yes |
| `ZEPTOMAIL_API_TOKEN` | ZeptoMail API token for sending emails. Leave blank for sandbox mode. | Optional |
| `CRON_SECRET` | Secures the automated reminder endpoint. Generate with `openssl rand -base64 32` | Optional |

### 4. Set up the database

```bash
npx prisma migrate deploy
# or for first-time development setup:
npx prisma db push
```

### 5. Seed initial data (optional)

```bash
npx prisma db seed
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment

### Using Node.js

```bash
npm run build
npm start
```

### Using Docker

```bash
docker build -t invofox .
docker run -p 3000:3000 --env-file .env invofox
```

See [`Dockerfile`](./Dockerfile) and [`docker-compose.yml`](./docker-compose.yml) for details.

---

## Email Configuration (ZeptoMail)

1. Create a free ZeptoMail account at [zeptomail.com](https://www.zeptomail.com/)
2. Create a Mail Agent and verify your sending domain
3. Copy your API token and paste it into **Settings → Email API** in the app
4. Optionally configure a Webhook URL for email open/click tracking

---

## Automated Reminders (Cron)

The endpoint `POST /api/reminders/process` processes overdue invoice reminders.

You can trigger it:
- **Manually** from the Reminders page in the UI (requires a logged-in session)
- **Automatically** via any HTTP scheduler (e.g. cron-job.org, GitHub Actions)

For automated calls, pass `CRON_SECRET` as a Bearer token:

```bash
curl -X POST https://your-domain.com/api/reminders/process \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Database

By default Invofox uses **SQLite**, which is great for personal use and evaluation.

For multi-user production deployments, **PostgreSQL** is recommended:

1. Change `prisma/schema.prisma` datasource provider to `"postgresql"`
2. Set `DATABASE_URL` to your PostgreSQL connection string
3. Re-run `npx prisma migrate deploy`

---

## Security Notes

- `AUTH_SECRET` must be a cryptographically random string. Never reuse one between environments.
- The webhook secret is managed through the Settings UI, not environment variables.
- The uploaded logo files are stored in `public/uploads/`. This directory is excluded from git.
- All API routes require authentication except `/api/reminders/process` (cron secret) and `/api/webhooks/zeptomail` (HMAC signature).

---

## License

MIT
