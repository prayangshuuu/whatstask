"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RepeatType } from "@prisma/client";
import { computeDailyRemindAt, computeWeeklyRemindAt } from "@/lib/todoHelpers";

interface CreateTodoData {
  title: string;
  description: string;
  remindAt?: string;
  repeatType: "NONE" | "DAILY" | "WEEKLY";
  timeOfDay?: string;
  repeatDays?: string[];
  aiMessage?: string;
}

export async function createTodo(data: CreateTodoData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Compute remindAt based on repeatType
  let remindAtDate: Date;
  let finalRepeatDays: string | null = null;

  if (data.repeatType === "NONE") {
    if (!data.remindAt) {
      throw new Error("remindAt is required for one-time reminders");
    }
    remindAtDate = new Date(data.remindAt);
  } else if (data.repeatType === "DAILY") {
    if (!data.timeOfDay) {
      throw new Error("timeOfDay is required for daily reminders");
    }
    remindAtDate = computeDailyRemindAt(data.timeOfDay);
  } else {
    // WEEKLY
    if (!data.timeOfDay || !data.repeatDays || data.repeatDays.length === 0) {
      throw new Error("timeOfDay and repeatDays are required for weekly reminders");
    }
    finalRepeatDays = data.repeatDays.join(",");
    remindAtDate = computeWeeklyRemindAt(data.timeOfDay, data.repeatDays);
  }

  const todo = await prisma.todo.create({
    data: {
      userId: user.id,
      title: data.title,
      description: data.description || null,
      remindAt: remindAtDate,
      repeatType: data.repeatType as RepeatType,
      repeatDays: finalRepeatDays,
      isCompleted: false,
      aiMessage: data.aiMessage || null,
    },
  });

  return todo;
}

export async function createBulkTodos(tasks: CreateTodoData[]) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const createdTodos = [];

  for (const task of tasks) {
    // Compute remindAt based on repeatType
    let remindAtDate: Date;
    let finalRepeatDays: string | null = null;

    if (task.repeatType === "NONE") {
      if (!task.remindAt) {
        continue; // Skip invalid tasks
      }
      remindAtDate = new Date(task.remindAt);
    } else if (task.repeatType === "DAILY") {
      if (!task.timeOfDay) {
        continue;
      }
      remindAtDate = computeDailyRemindAt(task.timeOfDay);
    } else {
      // WEEKLY
      if (!task.timeOfDay || !task.repeatDays || task.repeatDays.length === 0) {
        continue;
      }
      finalRepeatDays = task.repeatDays.join(",");
      remindAtDate = computeWeeklyRemindAt(task.timeOfDay, task.repeatDays);
    }

    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        title: task.title,
        description: task.description || null,
        remindAt: remindAtDate,
        repeatType: task.repeatType as RepeatType,
        repeatDays: finalRepeatDays,
        isCompleted: false,
        aiMessage: task.aiMessage || null,
      },
    });

    createdTodos.push(todo);
  }

  return createdTodos;
}

