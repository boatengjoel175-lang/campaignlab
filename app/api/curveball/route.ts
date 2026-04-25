import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const curveballMessages: Record<string, string> = {
  budget_cut:
    "BREAKING: A stakeholder just cut the campaign budget in half. You now have €5,000. Adapt your strategy immediately.",
  competitor_viral:
    "BREAKING: Your client's top competitor just went viral on TikTok. TikTok strategy is now worth double. Reconsider your platform allocation.",
  audience_shift:
    "BREAKING: New market research shows your target audience is 10 years younger than originally briefed. Re-evaluate your content and platform choices.",
};

export async function POST(request: Request) {
  try {
    const { session_id, type } = await request.json();

    if (!session_id || !type) {
      return NextResponse.json(
        { error: "session_id and type required" },
        { status: 400 }
      );
    }

    const message = curveballMessages[type];
    if (!message) {
      return NextResponse.json(
        { error: "Invalid curveball type. Valid types: budget_cut, competitor_viral, audience_shift" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("sessions")
      .update({ curveball: { type, message } })
      .eq("id", session_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Curveball injection failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
