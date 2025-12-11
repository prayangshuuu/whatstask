# WhatsTask

WhatsTask is a smart to-do and reminder engine that sends instant notifications to your WhatsApp using an unofficial asynchronous automation method. Stay organized, stay updated, and never miss a task again.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- bcrypt + jose (for authentication)
- whatsapp-web.js (for WhatsApp automation)

## High-Level Features

- User authentication with email + password (custom implementation using bcrypt + jose)
- Connect exactly one WhatsApp number per user
- Create to-do items and reminders with:
  - Single reminder time (one-time)
  - Recurring schedules (daily, or specific weekdays)
- Instant WhatsApp notifications at scheduled reminder times
- Asynchronous worker system for message delivery

## Setup

(Will be filled later)

## Database Setup

To set up the PostgreSQL database, run the following SQL commands:

```sql
CREATE DATABASE whatstask;
CREATE USER whatstaask WITH PASSWORD 'IDk421@!';
GRANT ALL PRIVILEGES ON DATABASE whatstask TO whatstaask;
```

After creating the database, configure your `.env` file with the connection string (note: special characters in the password need to be URL encoded):

```
DATABASE_URL="postgresql://whatstaask:IDk421%40%21@localhost:5432/whatstask?schema=public"
```

Then run Prisma migrations:

```bash
npx prisma migrate dev
```

Note: Make sure to copy `.env.example` to `.env` and update it with your actual database credentials. Never commit `.env` files to version control.
