import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function extractInvoiceData(imageUrl: string) {
  if (!API_KEY) {
    console.error("GOOGLE_AI_API_KEY is missing");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // Fetch image as base64
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const prompt = `
      Analiza esta imagen de factura o ticket y extrae la siguiente información en formato JSON puro:
      {
        "date": "YYYY-MM-DD",
        "total": number,
        "provider": "nombre del establecimiento",
        "description": "breve resumen"
      }
      Si no puedes encontrar un campo, deja el valor como null.
      Asegúrate de que la fecha esté en formato YYYY-MM-DD.
      Responde SOLO con el JSON.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: "image/jpeg",
        },
      },
      prompt,
    ]);

    const text = result.response.text();
    // Clean up potential markdown code blocks
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error extracting invoice data with Gemini:", error);
    return null;
  }
}
