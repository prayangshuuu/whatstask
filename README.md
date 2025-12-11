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

After setting up the database and running migrations, you can seed the database with a demo user and sample todos:

```bash
npx prisma db seed
```

### Demo User

The seed script creates a demo user with the following credentials:

- **Email**: demo@prayangshu.com
- **Password**: User123!

This demo user includes 2-3 sample todos:
- Daily lunch reminder at 1 PM
- Weekly planning reminder on Sundays at 10 AM
- One-time water reminder (10-15 minutes in the future)

You can use these credentials to log in and explore the application. Running `npx prisma db seed` will create this user and sample todos if they don't already exist.

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

## Database Models

The application uses the following main models:

### User
- Stores user authentication information (email, password hash)
- Each user can have multiple todos and one WhatsApp session

### Todo
- Stores reminder tasks with scheduling information
- Supports one-time, daily, and weekly repeat patterns
- Tracks completion status and last notification time

### WhatsAppSession
- Stores WhatsApp connection information for each user
- Fields include:
  - `status`: Connection status ("disconnected" | "connecting" | "qr_pending" | "ready" | "error")
  - `qrData`: Base64-encoded QR code image data URL for frontend display
  - `lastQrAt`: Timestamp when QR code was last generated
  - `lastConnectedAt`: Timestamp when session was last successfully connected
  - `sessionData`: Serialized session information for whatsapp-web.js integration
- Each user can have exactly one WhatsApp session

## Reminder Worker

The reminder worker is a background process that checks for due reminders and sends WhatsApp notifications.

### Running the Worker

To start the reminder processor, run:

```bash
npm run worker
```

The worker will:
- Start immediately and sync WhatsApp clients, then check for due reminders
- Poll every 60 seconds to:
  1. Sync WhatsApp sessions and start/restart clients
  2. Process due reminders
- Log which reminders are being processed with detailed information:
  - User email
  - Phone number (if WhatsApp session exists)
  - Todo title and reminder time
  - Repeat type and schedule
- Process todos that are:
  - Not completed
  - Have a `remindAt` time that has passed
  - Haven't been notified yet (or need re-notification)
- Update `lastNotifiedAt` after processing
- Handle repeat logic:
  - **NONE**: One-time reminder (no rescheduling, only updates `lastNotifiedAt`)
  - **DAILY**: Reschedule for next day at the same time
  - **WEEKLY**: Reschedule for next matching weekday (preserves time-of-day)
    - If `repeatDays` is provided (e.g., "SUN,MON"), finds next matching day
    - If not provided, treats as same weekday next week

### WhatsApp Session Sync

The worker automatically manages WhatsApp client connections:

- **Automatic Client Management**: Every 60 seconds, the worker checks for WhatsAppSession rows with status `"connecting"`, `"qr_pending"`, or `"ready"` and ensures they have active whatsapp-web.js clients
- **QR Code Generation**: When a session has status `"connecting"`, the worker starts a client which generates a QR code. On QR event:
  - `status` is set to `"qr_pending"`
  - `qrData` is stored as a base64-encoded image data URL
  - `lastQrAt` is updated
- **Connection Ready**: When the client successfully connects:
  - `status` is set to `"ready"`
  - `qrData` is cleared
  - `lastConnectedAt` is updated
- **Error Handling**: If client initialization fails, `status` is set to `"error"`

**Important**: The worker must be running (`npm run worker`) for WhatsApp clients to be initialized and QR codes to be generated. When a user sets their WhatsAppSession status to `"connecting"` (via the API), the worker will pick it up on the next sync cycle and start the client.

### Logging

The worker provides detailed logging:
- Timestamped log entries for each processing cycle
- Clear warnings when WhatsApp sessions are missing or not ready
- Success messages when reminders would be sent
- Processing duration metrics

### Future Integration

Currently, the worker logs what would be sent (e.g., "Would send WhatsApp reminder to +1234567890 for todo 'Eat lunch'"). A future step is to plug in `whatsapp-web.js` to actually send WhatsApp messages where logs currently say "would send". The worker is designed to be easily extended with actual WhatsApp sending functionality.
