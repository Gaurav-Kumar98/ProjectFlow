import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { getSettings } from "@/lib/db";
import { Attachment } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { title, description, attachments } = (await request.json()) as {
      title: string;
      description: string;
      attachments: Attachment[];
    };

    const settings = getSettings();
    if (!settings.geminiApiKey) {
      return NextResponse.json({ error: "Gemini API Key is not configured." }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });

    // Prepare content for Gemini
    const contents: any[] = [];
    
    // Add text prompt
    const prompt = `
You are an AI assistant helping a developer categorize and summarize tasks in a fast-capture kanban board.
Analyze the provided task information and/or screenshots, and return a JSON object with:
- title: A concise, descriptive title for the task (if the current title is empty or generic like 'Untitled screenshot task').
- description: A short, helpful summary or description of the task based on the provided text or screenshot.
- taskType: Choose ONE of: "Feature", "Bug", "Enhancement", "UI Fix", "Refactor", "Research", "Idea", "AI Prompt", "Note".
- tags: An array of 1 to 3 relevant string tags (e.g. ["frontend", "auth", "ui"]).

Current Task Information:
Title: ${title}
Description: ${description}

Generate remaining information based on what is available. Do not return markdown blocks, just the raw JSON.`;
    
    contents.push({ text: prompt });

    // Process attachments
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.filePath) {
          try {
            const data = readFileSync(attachment.filePath);
            contents.push({
              inlineData: {
                data: data.toString("base64"),
                mimeType: attachment.fileType
              }
            });
          } catch (error) {
            console.error("Failed to read attachment:", attachment.filePath, error);
          }
        }
      }
    }

    let responseText: string | null = null;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contents,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || null;
        break; // Success
      } catch (error: any) {
        // Retry on 503 (Unavailable / High Demand) or 429 (Too Many Requests)
        const status = error?.status || error?.response?.status;
        if ((status === 503 || status === 429) && retries > 1) {
          retries--;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw error;
        }
      }
    }

    if (!responseText) {
      throw new Error("Failed to generate content from Gemini");
    }

    const parsed = JSON.parse(responseText);
    
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("AI AutoFill Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process AI request" }, { status: 500 });
  }
}
