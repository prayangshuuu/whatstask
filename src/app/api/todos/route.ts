import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RepeatType } from "@prisma/client";
import { todoCreateSchema } from "@/lib/validation";
import { computeDailyRemindAt, computeWeeklyRemindAt } from "@/lib/todoHelpers";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const todos = await prisma.todo.findMany({
      where: { userId: user.id },
      orderBy: { remindAt: "asc" },
    });

    return NextResponse.json(todos);
  } catch (error) {
    console.error("Get todos error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = todoCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validationResult.error.issues.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { title, description, repeatType, remindAt, timeOfDay, repeatDays } =
      validationResult.data;

    // Compute remindAt based on repeatType
    let remindAtDate: Date;
    let finalRepeatDays: string | null = null;

    if (repeatType === "NONE") {
      // Use provided remindAt directly
      remindAtDate = new Date(remindAt!);
    } else if (repeatType === "DAILY") {
      // Compute next occurrence from timeOfDay
      remindAtDate = computeDailyRemindAt(timeOfDay!);
    } else {
      // WEEKLY: compute next occurrence from timeOfDay and repeatDays
      const daysArray = Array.isArray(repeatDays)
        ? repeatDays
        : (repeatDays as string).split(",").map((d) => d.trim());
      finalRepeatDays = daysArray.join(",");
      remindAtDate = computeWeeklyRemindAt(timeOfDay!, daysArray);
    }

    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        title,
        description: description || null,
        remindAt: remindAtDate,
        repeatType: repeatType as RepeatType,
        repeatDays: finalRepeatDays,
        isCompleted: false,
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Create todo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

