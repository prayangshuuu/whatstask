import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RepeatType } from "@prisma/client";
import { todoUpdateSchema } from "@/lib/validation";
import { computeDailyRemindAt, computeWeeklyRemindAt } from "@/lib/todoHelpers";

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

    // Validate request body
    const validationResult = todoUpdateSchema.safeParse(body);
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

    const validatedData = validationResult.data;

    // Determine the effective repeatType (use new value if provided, otherwise existing)
    const effectiveRepeatType = validatedData.repeatType ?? existingTodo.repeatType;

    // Build update data, excluding lastNotifiedAt
    const updateData: {
      title?: string;
      description?: string | null;
      remindAt?: Date;
      repeatType?: RepeatType;
      repeatDays?: string | null;
      isCompleted?: boolean;
    } = {};

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description || null;
    }

    if (validatedData.repeatType !== undefined) {
      updateData.repeatType = validatedData.repeatType as RepeatType;
    }

    // Handle remindAt computation based on repeatType
    if (effectiveRepeatType === "NONE") {
      // For NONE, require remindAt in request
      if (validatedData.remindAt !== undefined) {
        updateData.remindAt = new Date(validatedData.remindAt);
      } else if (validatedData.repeatType === "NONE" && existingTodo.repeatType !== "NONE") {
        // Switching to NONE but no remindAt provided
        return NextResponse.json(
          { error: "remindAt is required when repeatType is NONE" },
          { status: 400 }
        );
      }
    } else if (effectiveRepeatType === "DAILY") {
      // For DAILY, compute from timeOfDay
      if (validatedData.timeOfDay !== undefined) {
        updateData.remindAt = computeDailyRemindAt(validatedData.timeOfDay);
      } else if (validatedData.repeatType === "DAILY" && existingTodo.repeatType !== "DAILY") {
        // Switching to DAILY but no timeOfDay provided
        return NextResponse.json(
          { error: "timeOfDay is required when repeatType is DAILY" },
          { status: 400 }
        );
      } else if (validatedData.repeatType === undefined && validatedData.timeOfDay === undefined) {
        // Updating existing DAILY todo - keep current remindAt if timeOfDay not changed
        // (remindAt will be updated when reminder is processed)
      }
      updateData.repeatDays = null;
    } else if (effectiveRepeatType === "WEEKLY") {
      // For WEEKLY, compute from timeOfDay and repeatDays
      if (validatedData.timeOfDay !== undefined && validatedData.repeatDays !== undefined && validatedData.repeatDays !== null) {
        const daysArray = Array.isArray(validatedData.repeatDays)
          ? validatedData.repeatDays
          : validatedData.repeatDays.split(",").map((d) => d.trim());
        updateData.remindAt = computeWeeklyRemindAt(validatedData.timeOfDay, daysArray);
        updateData.repeatDays = daysArray.join(",");
      } else if (validatedData.repeatType === "WEEKLY" && existingTodo.repeatType !== "WEEKLY") {
        // Switching to WEEKLY but missing required fields
        return NextResponse.json(
          { error: "timeOfDay and repeatDays are required when repeatType is WEEKLY" },
          { status: 400 }
        );
      } else if (validatedData.repeatDays !== undefined && validatedData.repeatDays !== null) {
        // Updating repeatDays only
        const daysArray = Array.isArray(validatedData.repeatDays)
          ? validatedData.repeatDays
          : validatedData.repeatDays.split(",").map((d) => d.trim());
        updateData.repeatDays = daysArray.join(",");
        // Recompute remindAt if timeOfDay is also provided or use existing time
        if (validatedData.timeOfDay !== undefined) {
          updateData.remindAt = computeWeeklyRemindAt(validatedData.timeOfDay, daysArray);
        } else {
          // Use existing remindAt time but recompute with new days
          const existingTime = `${existingTodo.remindAt.getHours().toString().padStart(2, "0")}:${existingTodo.remindAt.getMinutes().toString().padStart(2, "0")}`;
          updateData.remindAt = computeWeeklyRemindAt(existingTime, daysArray);
        }
      }
    }

    if (validatedData.isCompleted !== undefined) {
      updateData.isCompleted = validatedData.isCompleted;
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

