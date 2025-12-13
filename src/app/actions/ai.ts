"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { RepeatType } from "@prisma/client";

interface TodoAIResponse {
  title: string;
  description: string;
  remindAt: string; // ISO DateTime string
  repeatType: "NONE" | "DAILY" | "WEEKLY";
  aiMessage: string; // Friendly WhatsApp reminder message
}

interface BulkTodosResponse {
  tasks: TodoAIResponse[];
}

/**
 * Get current user with their Gemini API key
 */
async function getCurrentUserWithApiKey() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const userWithKey = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, geminiApiKey: true },
  });

  if (!userWithKey) {
    throw new Error("User not found.");
  }

  if (!userWithKey.geminiApiKey || !userWithKey.geminiApiKey.trim()) {
    throw new Error("Gemini API key not found. Please set it in your profile settings.");
  }

  return userWithKey;
}

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
function parseAIResponse(text: string): any {
  let jsonText = text.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  return JSON.parse(jsonText);
}

/**
 * Generate a single todo from user's natural language prompt using Gemini AI
 */
export async function generateTodoFromAI(
  userPrompt: string
): Promise<TodoAIResponse> {
  try {
    // Get current user with API key
    const user = await getCurrentUserWithApiKey();

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(user.geminiApiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Construct system prompt
    const systemPrompt = `You are a task manager assistant. Extract task details from the user's input. Return a SINGLE JSON object with keys: title (string), description (string), remindAt (ISO string, calculate relative to now), repeatType (enum: NONE, DAILY, WEEKLY), aiMessage (string: a friendly, emoji-rich WhatsApp reminder message for this task).

Current date and time: ${new Date().toISOString()}

Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

    // Generate content
    const result = await model.generateContent(`${systemPrompt}\n\nUser input: ${userPrompt}`);
    const response = await result.response;
    const text = response.text();

    // Parse JSON
    const parsed = parseAIResponse(text);

    // Validate required fields
    if (!parsed.title || !parsed.remindAt || !parsed.aiMessage) {
      throw new Error("Invalid response from AI: missing required fields");
    }

    // Validate repeatType
    if (!["NONE", "DAILY", "WEEKLY"].includes(parsed.repeatType)) {
      parsed.repeatType = "NONE";
    }

    // Validate remindAt is a valid ISO date
    const remindAtDate = new Date(parsed.remindAt);
    if (isNaN(remindAtDate.getTime())) {
      throw new Error("Invalid remindAt date format");
    }

    return {
      title: parsed.title,
      description: parsed.description || "",
      remindAt: parsed.remindAt,
      repeatType: parsed.repeatType as "NONE" | "DAILY" | "WEEKLY",
      aiMessage: parsed.aiMessage,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
    if (error instanceof Error) {
      // Check for quota/rate limit errors
      if (error.message.includes("429") || error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("AI quota exceeded. Please check your Google Cloud billing plan or wait a few minutes before trying again. The free tier has daily limits.");
      }
      throw new Error(`AI generation failed: ${error.message}`);
    }
    throw new Error("Unknown error occurred during AI generation");
  }
}

/**
 * Generate a WhatsApp message for a todo (when user doesn't provide one in manual mode)
 */
export async function generateMessageForTodo(
  title: string,
  description: string,
  repeatType: "NONE" | "DAILY" | "WEEKLY"
): Promise<string> {
  try {
    const user = await getCurrentUserWithApiKey();

    const genAI = new GoogleGenerativeAI(user.geminiApiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const repeatLabel =
      repeatType === "DAILY"
        ? " (Daily)"
        : repeatType === "WEEKLY"
        ? " (Weekly)"
        : "";

    const prompt = `Generate a friendly, emoji-rich WhatsApp reminder message for this task:

Title: ${title}
Description: ${description || "No description"}
Repeat: ${repeatType}${repeatLabel}

Return ONLY the message text, no JSON, no markdown, no code blocks, no explanations. Make it warm, friendly, and include relevant emojis.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    // Fallback to standard format if AI fails
    const repeatLabel =
      repeatType === "DAILY"
        ? " (Daily)"
        : repeatType === "WEEKLY"
        ? " (Weekly)"
        : "";
    return (
      "⏰ Reminder: " +
      title +
      repeatLabel +
      (description ? "\n\n" + description : "") +
      "\n\nSent via WhatsTask"
    );
  }
}

/**
 * Generate multiple todos from user's planning prompt using Gemini AI
 */
export async function generateTodosFromAI(
  userPrompt: string
): Promise<TodoAIResponse[]> {
  try {
    // Get current user with API key
    const user = await getCurrentUserWithApiKey();

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(user.geminiApiKey!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Construct system prompt
    const systemPrompt = `You are a planning assistant. The user will describe their week or day. Return a JSON Object containing an array named 'tasks'. Each item in the array must follow the structure: { title, description, remindAt, repeatType, aiMessage }.

Structure:
- title: string (short, concise title)
- description: string (detailed description)
- remindAt: ISO DateTime string (calculate relative to current date/time)
- repeatType: "NONE" | "DAILY" | "WEEKLY"
- aiMessage: string (friendly, emoji-rich WhatsApp reminder message)

Current date and time: ${new Date().toISOString()}

Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

    // Generate content
    const result = await model.generateContent(`${systemPrompt}\n\nUser input: ${userPrompt}`);
    const response = await result.response;
    const text = response.text();

    // Parse JSON
    const parsed: BulkTodosResponse = parseAIResponse(text);

    // Validate it's an object with tasks array
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error("AI response is not a valid tasks array");
    }

    // Validate and normalize each task
    const validatedTasks = parsed.tasks.map((task, index) => {
      if (!task.title || !task.remindAt || !task.aiMessage) {
        throw new Error(`Invalid task at index ${index}: missing required fields`);
      }

      // Validate repeatType
      if (!["NONE", "DAILY", "WEEKLY"].includes(task.repeatType)) {
        task.repeatType = "NONE";
      }

      // Validate remindAt is a valid ISO date
      const remindAtDate = new Date(task.remindAt);
      if (isNaN(remindAtDate.getTime())) {
        throw new Error(`Invalid remindAt date format at index ${index}`);
      }

      return {
        title: task.title,
        description: task.description || "",
        remindAt: task.remindAt,
        repeatType: task.repeatType as "NONE" | "DAILY" | "WEEKLY",
        aiMessage: task.aiMessage,
      };
    });

    return validatedTasks;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse AI response as JSON: ${error.message}`);
    }
    if (error instanceof Error) {
      // Check for quota/rate limit errors
      if (error.message.includes("429") || error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("AI quota exceeded. Please check your Google Cloud billing plan or wait a few minutes before trying again. The free tier has daily limits.");
      }
      throw new Error(`AI generation failed: ${error.message}`);
    }
    throw new Error("Unknown error occurred during AI generation");
  }
}
