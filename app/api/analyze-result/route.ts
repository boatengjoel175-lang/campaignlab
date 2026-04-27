import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { result, strategy, scenario } = await request.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `You are a marketing coach reviewing a student's campaign simulation results.

BRAND: ${scenario.brand_name} (${scenario.industry}) — Objective: ${scenario.objective}
CLIENT: ${scenario.client_personality}

RESULTS:
- Reach: ${result.reach?.toLocaleString()} people — ${result.reach_explanation}
- Engagement: ${result.engagement_rate}% — ${result.engagement_explanation}
- Conversion: ${result.conversion_rate}% — ${result.conversion_explanation}
- ROI: ${result.roi}× — ${result.roi_explanation}

STRATEGY USED:
- Platforms: ${JSON.stringify(strategy?.platforms)}
- Content Pillars: ${strategy?.content_pillars?.join(", ")}
- Target: ${strategy?.target_demographic}
- Frequency: ${strategy?.posting_frequency}
- Format: ${strategy?.creative_format}

Give exactly 2-3 short bullet points for what worked well, and 2-3 for what to improve next time.
Keep each point under 15 words. Be specific to their actual strategy choices.

Return ONLY this JSON (no markdown, no extra text):
{"worked":["point 1","point 2","point 3"],"improve":["point 1","point 2","point 3"]}`;

    const r = await model.generateContent(prompt);
    let text = r.response.text();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("analyze-result error:", error);
    // Graceful fallback so the UI never breaks
    return NextResponse.json({
      worked: [
        "Engaged with a multi-platform approach",
        "Aligned strategy with campaign objective",
      ],
      improve: [
        "Revisit budget split across platforms for better ROI",
        "Consider tighter demographic and content pillar alignment",
      ],
    });
  }
}
