import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RepeatType } from "@prisma/client";

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
    const { title, description, remindAt, repeatType, repeatDays } = body;

    // Validation
    if (!title || !remindAt) {
      return NextResponse.json(
        { error: "Title and remindAt are required" },
        { status: 400 }
      );
    }

    if (!["NONE", "DAILY", "WEEKLY"].includes(repeatType)) {
      return NextResponse.json(
        { error: "repeatType must be NONE, DAILY, or WEEKLY" },
        { status: 400 }
      );
    }

    if (repeatType === "WEEKLY" && !repeatDays) {
      return NextResponse.json(
        { error: "repeatDays is required when repeatType is WEEKLY" },
        { status: 400 }
      );
    }

    // Parse remindAt as ISO string
    const remindAtDate = new Date(remindAt);
    if (isNaN(remindAtDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid remindAt date format" },
        { status: 400 }
      );
    }

    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        title,
        description: description || null,
        remindAt: remindAtDate,
        repeatType: repeatType as RepeatType,
        repeatDays: repeatDays || null,
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

