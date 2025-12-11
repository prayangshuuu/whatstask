import { PrismaClient, RepeatType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create Prisma client for seed (separate from Next.js app)
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});

async function main() {
  const demoEmail = "demo@prayangshu.com";
  const demoPassword = "User123!";

  // Check if demo user exists, create if not
  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoUser) {
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
      },
    });
    console.log(`Created demo user: ${demoEmail}`);
  } else {
    console.log(`Demo user already exists: ${demoEmail}`);
  }

  // Helper function to get next Sunday at 10:00
  function getNextSunday(): Date {
    const now = new Date();
    const nextSunday = new Date(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(10, 0, 0, 0);
    
    // If it's Sunday and before 10 AM, use today; otherwise use next Sunday
    if (dayOfWeek === 0 && now.getHours() < 10) {
      nextSunday.setDate(now.getDate());
    }
    
    return nextSunday;
  }

  // Helper function to get time 10-15 minutes in the future
  function getFutureTime(): Date {
    const now = new Date();
    const future = new Date(now);
    const minutesToAdd = 10 + Math.floor(Math.random() * 6); // 10-15 minutes
    future.setMinutes(now.getMinutes() + minutesToAdd);
    return future;
  }

  // Helper function to get today at 13:00 (1 PM)
  function getTodayAt1PM(): Date {
    const now = new Date();
    const todayAt1PM = new Date(now);
    todayAt1PM.setHours(13, 0, 0, 0);
    
    // If it's already past 1 PM today, set for tomorrow
    if (now.getHours() >= 13) {
      todayAt1PM.setDate(todayAt1PM.getDate() + 1);
    }
    
    return todayAt1PM;
  }

  // Seed todos
  const todos = [
    {
      title: "Eat lunch at 1 PM",
      description: "Daily lunch reminder",
      remindAt: getTodayAt1PM(),
      repeatType: RepeatType.DAILY,
      repeatDays: null,
    },
    {
      title: "Plan week on Sunday",
      description: "Weekly planning",
      remindAt: getNextSunday(),
      repeatType: RepeatType.WEEKLY,
      repeatDays: "SUN",
    },
    {
      title: "Drink water",
      description: "One-time reminder to drink water",
      remindAt: getFutureTime(),
      repeatType: RepeatType.NONE,
      repeatDays: null,
    },
  ];

  for (const todoData of todos) {
    // Check if todo with same title already exists for this user
    const existingTodo = await prisma.todo.findFirst({
      where: {
        userId: demoUser.id,
        title: todoData.title,
      },
    });

    if (!existingTodo) {
      await prisma.todo.create({
        data: {
          userId: demoUser.id,
          ...todoData,
        },
      });
      console.log(`Created todo: "${todoData.title}"`);
    } else {
      console.log(`Todo already exists: "${todoData.title}"`);
    }
  }

  console.log("\n✅ Seed complete!");
  console.log(`   Demo user: ${demoEmail}`);
  console.log(`   Password: ${demoPassword}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

