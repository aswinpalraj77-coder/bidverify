import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabaseClient';

/**
 * Parses a raw tender document text to extract compliance requirements using Gemini.
 * @param {string} tenderName - Name or reference of the tender
 * @param {string} documentText - The extracted text of the tender PDF
 * @returns {Promise<Object[]>} - Array of rule objects extracted
 */
export async function parseAndSaveTenderRules(tenderName, documentText) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
You are a procurement expert AI. I will provide the text of a tender document.
Please extract all explicit compliance requirements (e.g., minimum turnover, required certifications like MSME/Udyam, ISO, Make in India local content percentage, EPFO/ESIC registrations).
Return them as a JSON array of objects.

Output format MUST be a clean JSON array (no markdown block, just raw JSON) like this:
[
  { "requirement": "Minimum Local Content", "category": "Make in India", "threshold": 50, "unit": "%" },
  { "requirement": "EPFO Registration", "category": "Statutory", "threshold": null, "unit": null },
  { "requirement": "Annual Turnover", "category": "Financial", "threshold": 10000000, "unit": "INR" }
]

Tender Document Text:
${documentText.slice(0, 15000)} // Truncate if necessary for limits
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const jsonText = response.text;
    const rules = JSON.parse(jsonText);

    // Save to Supabase
    const { data, error } = await supabase
      .from('tender_rules')
      .upsert({ tender_name: tenderName, rules: rules }, { onConflict: 'tender_name' })
      .select();

    if (error) {
      throw new Error("Failed to save rules to Supabase: " + error.message);
    }

    return rules;
  } catch (error) {
    console.error("Error parsing tender rules:", error);
    throw error;
  }
}
