"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { RepeatType } from "@prisma/client";

interface TodoAIResponse {
  title: string;
  description: string;
  remindAt: string; // ISO DateTime string
  repeat: "NONE" | "DAILY" | "WEEKLY";
  aiMessage: string; // Friendly WhatsApp message
}

/**
 * Generate a single todo from user's natural language prompt using Gemini AI
 */
export async function generateTodoFromAI(
  userId: string,
  userPrompt: string
): Promise<TodoAIResponse> {
  // Fetch user to get their Gemini API key
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiApiKey: true },
  });

  if (!user || !user.geminiApiKey) {
    throw new Error("Gemini API key not found. Please set it in your profile settings.");
  }

  // Initialize Google Generative AI
  const genAI = new GoogleGenerativeAI(user.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Construct system prompt
  const systemPrompt = `You are a helpful assistant. Convert the user's natural language request into a JSON object for a To-Do list app.

The JSON structure must include:
- title: A short, concise title for the task (string)
- description: Detailed description of the task (string)
- remindAt: ISO DateTime string (e.g., "2024-12-15T10:00:00.000Z"). Calculate this based on natural language like "tomorrow", "next friday", "in 3 days", etc., relative to the current date and time. Default to tomorrow at 9 AM if not specified.
- repeat: One of "NONE", "DAILY", or "WEEKLY" (string)
- aiMessage: A friendly, emoji-rich WhatsApp message text reminding the user about this task (string, max 200 characters)

Current date and time: ${new Date().toISOString()}

Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

  try {
    // Generate content
    const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${userPrompt}`);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON
    const parsed: TodoAIResponse = JSON.parse(jsonText);

    // Validate required fields
    if (!parsed.title || !parsed.remindAt || !parsed.aiMessage) {
      throw new Error("Invalid response from AI: missing required fields");
    }

    // Validate repeat value
    if (!["NONE", "DAILY", "WEEKLY"].includes(parsed.repeat)) {
      parsed.repeat = "NONE";
    }

    // Validate remindAt is a valid ISO date
    const remindAtDate = new Date(parsed.remindAt);
    if (isNaN(remindAtDate.getTime())) {
      throw new Error("Invalid remindAt date format");
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`AI generation failed: ${error.message}`);
    }
    throw new Error("Unknown error occurred during AI generation");
  }
}

/**
 * Generate multiple todos from user's natural language prompt using Gemini AI
 */
export async function generateBulkTodosFromAI(
  userId: string,
  userPrompt: string
): Promise<TodoAIResponse[]> {
  // Fetch user to get their Gemini API key
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiApiKey: true },
  });

  if (!user || !user.geminiApiKey) {
    throw new Error("Gemini API key not found. Please set it in your profile settings.");
  }

  // Initialize Google Generative AI
  const genAI = new GoogleGenerativeAI(user.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Construct system prompt for bulk generation
  const systemPrompt = `You are a helpful assistant. Convert the user's natural language request into an array of JSON objects for a To-Do list app.

The user may request multiple tasks (e.g., "Plan my week", "Create tasks for my project", etc.). Break down their request into individual todo items.

Each JSON object in the array must include:
- title: A short, concise title for the task (string)
- description: Detailed description of the task (string)
- remindAt: ISO DateTime string (e.g., "2024-12-15T10:00:00.000Z"). Calculate this based on natural language like "tomorrow", "next friday", "in 3 days", etc., relative to the current date and time. Distribute tasks across different times/days if appropriate.
- repeat: One of "NONE", "DAILY", or "WEEKLY" (string)
- aiMessage: A friendly, emoji-rich WhatsApp message text reminding the user about this task (string, max 200 characters)

Current date and time: ${new Date().toISOString()}

Return ONLY a valid JSON array, no markdown, no code blocks, no explanations.`;

  try {
    // Generate content
    const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${userPrompt}`);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // Parse JSON array
    const parsed: TodoAIResponse[] = JSON.parse(jsonText);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      throw new Error("AI response is not an array");
    }

    // Validate and normalize each item
    const validatedTodos = parsed.map((todo, index) => {
      if (!todo.title || !todo.remindAt || !todo.aiMessage) {
        throw new Error(`Invalid todo at index ${index}: missing required fields`);
      }

      // Validate repeat value
      if (!["NONE", "DAILY", "WEEKLY"].includes(todo.repeat)) {
        todo.repeat = "NONE";
      }

      // Validate remindAt is a valid ISO date
      const remindAtDate = new Date(todo.remindAt);
      if (isNaN(remindAtDate.getTime())) {
        throw new Error(`Invalid remindAt date format at index ${index}`);
      }

      return todo;
    });

    return validatedTodos;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`AI generation failed: ${error.message}`);
    }
    throw new Error("Unknown error occurred during AI generation");
  }
}

