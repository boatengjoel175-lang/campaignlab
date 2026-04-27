import { createClient } from "@/lib/supabase-server";
import { simulateMarket } from "@/lib/gemini";
import { NextResponse } from "next/server";

// Extend Vercel function timeout — sequential Gemini calls need up to 5 min
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: "session_id required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the session for scenario context
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Fetch all submitted teams for this session
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .eq("session_id", session_id)
      .eq("submitted", true);

    if (teamsError || !teams || teams.length === 0) {
      return NextResponse.json(
        { error: "No submitted teams found" },
        { status: 400 }
      );
    }

    // Call Gemini for each team and save results
    const scenario = {
      brand_name: session.brand_name,
      industry: session.industry,
      objective: session.objective,
      client_personality: session.client_personality,
    };

    const processed = [];
    const failed = [];

    for (const team of teams) {
      if (!team.strategy) continue;

      try {
        // Call Gemini — skip this team if Gemini fails, don't abort the batch
        const result = await simulateMarket(team.strategy, scenario);

        const { error: insertError } = await supabase
          .from("results")
          .insert({
            team_id: team.id,
            session_id: session_id,
            reach: result.reach,
            engagement_rate: result.engagement_rate,
            conversion_rate: result.conversion_rate,
            roi: result.roi,
            reach_explanation: result.reach_explanation,
            engagement_explanation: result.engagement_explanation,
            conversion_explanation: result.conversion_explanation,
            roi_explanation: result.roi_explanation,
            overall_verdict: result.overall_verdict,
          });

        if (insertError) {
          console.error(`DB insert failed for team ${team.team_name}:`, insertError);
          failed.push(team.team_name);
        } else {
          processed.push({ team_id: team.id, team_name: team.team_name });
        }
      } catch (teamError) {
        console.error(`Gemini failed for team ${team.team_name}:`, teamError);
        failed.push(team.team_name);
      }
    }

    // Fail if zero teams were processed
    if (processed.length === 0) {
      return NextResponse.json(
        { success: false, error: "Gemini simulation failed for all teams", failed },
        { status: 500 }
      );
    }

    // Update session status to completed
    await supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", session_id);

    return NextResponse.json({
      success: true,
      processed: processed.length,
      teams: processed,
      ...(failed.length > 0 && { partial_failures: failed }),
    });
  } catch (error: unknown) {
    console.error("Simulation error:", error);
    const message = error instanceof Error ? error.message : "Simulation failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
