import type { Request, Response } from "express";
import { SPECIALTY_VALUES } from "../constants";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type SpecializationResponse = {
  specialization: string[];
};

function parseSpecializationResponse(rawText: string): SpecializationResponse {
  const parsed = JSON.parse(rawText) as Partial<SpecializationResponse>;

  if (!Array.isArray(parsed.specialization)) {
    throw new Error("Gemini response did not include a specialization array");
  }

  const specialization = parsed.specialization.filter(
    (value): value is string => typeof value === "string",
  );

  if (specialization.length === 0) {
    throw new Error("Gemini response returned an empty specialization array");
  }

  return { specialization };
}

async function loadAI(text: string) {
  const { GoogleGenAI } = await import("@google/genai");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const prompt = `
      Analyze the following text and return only valid JSON in this exact shape:
      {"specialization":["cardiology","dermatology"]}

      Choose only from these options: ${SPECIALTY_VALUES.toString()}

      Data: ${text}
    `

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });

  const rawText = response.text?.trim() ?? "";

  if (!rawText) {
    throw new Error("Gemini returned an empty response");
  }

  return parseSpecializationResponse(rawText);
}

export async function getDoctorSpecialization(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const text =
      req.body && typeof req.body === "object" && typeof req.body.text === "string"
        ? req.body.text.trim()
        : typeof req.query.text === "string"
          ? req.query.text.trim()
          : "";

    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }

    const response = await loadAI(text);

    res.json(response);
  } catch (err) {
    console.error("Error with Gemini API:", err);
    res.status(500).json({ error: "Failed to establish connection" });
  }
}

