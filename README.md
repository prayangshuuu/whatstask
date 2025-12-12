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
- Connect exactly one WhatsApp number per user (for login/authentication)
- Set a separate notification number in your profile (where reminders are actually sent)
- Create to-do items and reminders with:
  - Single reminder time (one-time)
  - Recurring schedules (daily, or specific weekdays)
- Instant WhatsApp notifications at scheduled reminder times
- API-based reminder processing (can be triggered manually or via cron)

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
- `notifyNumber`: Optional field for the WhatsApp number where reminders will be sent
- Each user can have multiple todos and one WhatsApp session
- **Important**: The notification number (`notifyNumber`) is separate from the WhatsApp login number (`WhatsAppSession.phoneNumber`). This allows using one device/business number for login and a different personal number for receiving reminders.

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

### WhatsApp Client Management

WhatsApp clients are started directly from the API when a user clicks "Scan WhatsApp QR":

- **Direct Client Initialization**: When `/api/whatsapp/session` POST is called, it immediately starts a whatsapp-web.js client for that user
- **QR Code Generation**: The client generates a QR code asynchronously. On QR event:
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

### How Reminders Are Sent

- **WhatsApp Login**: Uses `WhatsAppSession.phoneNumber` - this is the device/business account used to authenticate with WhatsApp Web
- **Reminder Delivery**: Uses `User.notifyNumber` - this is the personal WhatsApp number where reminder messages are actually sent
- **Separation of Concerns**: This design allows you to:
  - Use a business/device number for WhatsApp Web login (stored in `WhatsAppSession.phoneNumber`)
  - Receive reminders on your personal number (stored in `User.notifyNumber`)
- **Safety**: If `notifyNumber` is not set, reminders are skipped with clear logging. Users are prompted to set their notification number in the Profile page.

### Future Integration

The reminder processor is fully integrated with `whatsapp-web.js` and sends real WhatsApp messages. Reminders are sent to the user's notification number (`User.notifyNumber`) when their WhatsApp session is ready.

### Setting Up Automated Reminders

To run reminders automatically, you can set up an external cron job or scheduled task that calls `POST /api/reminders/process` at regular intervals (e.g., every minute).
