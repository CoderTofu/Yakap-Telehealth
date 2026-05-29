import type { Request, Response } from "express";
import { loadAI } from "../services/gemini";

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

