import { GoogleGenerativeAI } from "@google/generative-ai";
import { Strategy, SimulationResult } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function simulateMarket(
  strategy: Strategy,
  scenario: {
    brand_name: string;
    industry: string;
    objective: string;
    client_personality: string;
  }
): Promise<SimulationResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `You are a social media market simulation engine
for a university marketing course called CampaignLab.

Evaluate this campaign strategy and return realistic
performance scores based on STRATEGIC QUALITY, not randomness.
A well-targeted strategy with smart budget allocation should
score higher than a scattered one.

SCENARIO:
Brand: ${scenario.brand_name}
Industry: ${scenario.industry}
Objective: ${scenario.objective}
Client personality: ${scenario.client_personality}
Virtual budget: €10,000

TEAM STRATEGY:
Platform allocation: ${JSON.stringify(strategy.platforms)}
Content pillars: ${strategy.content_pillars.join(", ")}
Target demographic: ${strategy.target_demographic}
Posting frequency: ${strategy.posting_frequency}
Creative format: ${strategy.creative_format}

Return ONLY this JSON object (no markdown, no extra text):
{
  "reach": <integer, estimated people reached>,
  "engagement_rate": <float, percentage 0-100>,
  "conversion_rate": <float, percentage 0-100>,
  "roi": <float, return on investment multiplier e.g. 2.4>,
  "reach_explanation": <string, 1-2 sentences>,
  "engagement_explanation": <string, 1-2 sentences>,
  "conversion_explanation": <string, 1-2 sentences>,
  "roi_explanation": <string, 1-2 sentences>,
  "overall_verdict": <string, 2-3 sentence strategic verdict>
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    return JSON.parse(text) as SimulationResult;
  } catch {
    throw new Error("Gemini returned invalid JSON: " + text);
  }
}
