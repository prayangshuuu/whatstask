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
