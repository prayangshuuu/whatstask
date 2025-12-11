import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RepeatType } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const todo = await prisma.todo.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!todo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error("Get todo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Ensure user owns the todo
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    // Build update data, excluding lastNotifiedAt
    const updateData: {
      title?: string;
      description?: string | null;
      remindAt?: Date;
      repeatType?: RepeatType;
      repeatDays?: string | null;
      isCompleted?: boolean;
    } = {};

    if (body.title !== undefined) {
      updateData.title = body.title;
    }

    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }

    if (body.remindAt !== undefined) {
      const remindAtDate = new Date(body.remindAt);
      if (isNaN(remindAtDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid remindAt date format" },
          { status: 400 }
        );
      }
      updateData.remindAt = remindAtDate;
    }

    if (body.repeatType !== undefined) {
      if (!["NONE", "DAILY", "WEEKLY"].includes(body.repeatType)) {
        return NextResponse.json(
          { error: "repeatType must be NONE, DAILY, or WEEKLY" },
          { status: 400 }
        );
      }
      updateData.repeatType = body.repeatType as RepeatType;
    }

    if (body.repeatDays !== undefined) {
      updateData.repeatDays = body.repeatDays || null;
    }

    if (body.isCompleted !== undefined) {
      updateData.isCompleted = Boolean(body.isCompleted);
    }

    const updatedTodo = await prisma.todo.update({
      where: {
        id,
        userId: user.id,
      },
      data: updateData,
    });

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error("Update todo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Ensure user owns the todo
    const existingTodo = await prisma.todo.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    await prisma.todo.delete({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error("Delete todo error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

