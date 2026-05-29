import { SPECIALTY_VALUES } from "../constants";

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

export async function loadAI(text: string) {
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

