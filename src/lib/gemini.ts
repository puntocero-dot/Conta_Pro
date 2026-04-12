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
      Eres un experto en contabilidad de El Salvador. 
      Analiza esta imagen de factura, ticket o DTE (Documento Tributario Electrónico).
      Extrae la siguiente información en formato JSON puro:
      {
        "date": "YYYY-MM-DD",
        "total": number,
        "provider": "nombre comercial del establecimiento",
        "description": "resumen de lo comprado"
      }

      Instrucciones específicas:
      - Para la fecha: Si es un DTE, busca "Fecha de emisión". Si no, busca la fecha más relevante. Formato YYYY-MM-DD.
      - Para el total: Busca "Total a pagar", "Monto Total de la Operación", "Total" o "Suma". Usa solo números (ej: 936.43).
      - Para el proveedor: Busca el nombre más prominente (ej: Unicomer, La Curacao, Super Selectos).
      - Si no encuentras un campo, devuelve null.
      
      Responde SOLO con el objeto JSON, sin texto adicional ni bloques de código markdown.
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
    console.log("Raw Gemini Response:", text);

    // Clean up response: remove Markdown blocks and whitespace
    let cleanJson = text.trim();
    if (cleanJson.includes("```")) {
      cleanJson = cleanJson.split(/```(?:json)?/)[1]?.split("```")[0]?.trim() || cleanJson;
    }

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw text:", text);
      // Fallback: try to find anything that looks like JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw parseError;
    }
  } catch (error) {
    console.error("Error extracting invoice data with Gemini:", error);
    return null;
  }

}
