import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "../../../lib/supabaseClient";

// Initialize OpenAI client for NVIDIA endpoints
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY || "dummy-key-for-build",
  baseURL: process.env.NVIDIA_API_KEY ? "https://integrate.api.nvidia.com/v1" : "https://api.openai.com/v1",
});

// JSON Schema for verification result
const verificationSchema = {
  type: "json_schema",
  json_schema: {
    name: "verification_results",
    schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              requirement: { type: "string" },
              extracted_value: { type: "string" },
              status: { type: "string", enum: ["PASS", "FAIL", "WARNING", "NOT FOUND"] },
              confidence: { type: "number" },
              explanation: { type: "string" },
              evidence_text: { type: "string" }
            },
            required: ["requirement", "status", "confidence", "explanation"]
          }
        }
      },
      required: ["results"]
    }
  }
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { rawText, words, tenderName } = body;

    if (!rawText) {
      return NextResponse.json({ error: "No raw text provided" }, { status: 400 });
    }

    // 1. Fetch Tender Rules
    const { data: rulesData, error: rulesError } = await supabase
      .from("tender_rules")
      .select("*")
      .eq("tender_name", tenderName)
      .maybeSingle();

    if (rulesError) {
      console.error("Rules fetch error:", rulesError);
    }

    let rules = [];
    if (rulesData && rulesData.rules) {
      rules = typeof rulesData.rules === "string" ? JSON.parse(rulesData.rules) : rulesData.rules;
    } else {
      // Fallback dummy rules if none found
      rules = [
        { category: "Financial", requirement: "Minimum turnover: ₹5 Crore" },
        { category: "Technical", requirement: "Warranty: Minimum 18 months" },
        { category: "Make in India", requirement: "Local Content Minimum: 60%" },
        { category: "Eligibility", requirement: "OEM authorization required" },
      ];
    }

    // 2. Call NVIDIA Nim (or OpenAI) for XAI Verification
    let aiResults = [];
    if (process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY) {
      try {
        const prompt = `
          You are an AI Compliance Verification Engine. 
          Your task is to verify if the provided bidder document text meets the tender requirements.
          
          TENDER REQUIREMENTS:
          ${rules.map((r, i) => `${i + 1}. [${r.category}] ${r.requirement}`).join("\n")}
          
          BIDDER DOCUMENT TEXT:
          """
          ${rawText}
          """
          
          For each requirement, find the relevant evidence, extract the submitted value, and determine the status (PASS, FAIL, WARNING, or NOT FOUND).
          Provide a detailed explanation and the exact evidence text snippet from the document.
        `;

        const response = await openai.chat.completions.create({
          model: process.env.NVIDIA_API_KEY ? "nvidia/llama-3.1-nemotron-70b-instruct" : "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: verificationSchema,
          temperature: 0.1,
          max_tokens: 1024,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          aiResults = parsed.results || [];
        }
      } catch (err) {
        console.error("AI API Error:", err);
      }
    } else {
      console.warn("No NVIDIA_API_KEY or GEMINI_API_KEY found, skipping AI verification step");
    }

    // Map AI results to the words array to get bounding boxes
    const enrichedResults = aiResults.map((res) => {
      let bbox = null;
      if (res.evidence_text && words && words.length > 0) {
        bbox = findBboxForMatch(res.evidence_text, words);
      }
      return {
        ...res,
        bbox,
      };
    });

    return NextResponse.json({
      success: true,
      results: enrichedResults,
    });
  } catch (error) {
    console.error("Verification API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to find Bounding Box from words array
function findBboxForMatch(matchString, words) {
  if (!matchString || !words || !words.length) return null;
  const target = matchString.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!target) return null;

  for (let i = 0; i < words.length; i++) {
    let combined = "";
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let j = i; j < words.length && combined.length < target.length + 10; j++) {
      combined += words[j].text.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (!words[j].bbox) continue;
      const { x0, y0, x1, y1 } = words[j].bbox;
      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);
      
      if (combined.includes(target) || (target.includes(combined) && combined.length >= target.length * 0.8)) {
        return { x0: minX, y0: minY, x1: maxX, y1: maxY };
      }
    }
  }
  return null;
}
