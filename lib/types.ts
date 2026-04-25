export interface Session {
  id: string;
  session_code: string;
  professor_id: string;
  brand_name: string;
  industry: string;
  objective: string;
  budget: number;
  client_personality: string;
  time_limit: number;
  status: string;
  curveball: Curveball | null;
  highlighted_reflection: HighlightedReflection | null;
  created_at: string;
}

export interface Team {
  id: string;
  session_id: string;
  team_name: string;
  submitted: boolean;
  strategy: Strategy | null;
  joined_at: string;
}

export interface Strategy {
  platforms: Platform[];
  content_pillars: string[];
  target_demographic: string;
  posting_frequency: string;
  creative_format: string;
}

export interface Platform {
  name: string;
  budget_percent: number;
}

export interface SimulationResult {
  reach: number;
  engagement_rate: number;
  conversion_rate: number;
  roi: number;
  reach_explanation: string;
  engagement_explanation: string;
  conversion_explanation: string;
  roi_explanation: string;
  overall_verdict: string;
}

export interface Curveball {
  type: string;
  message: string;
}

export interface HighlightedReflection {
  team_name: string;
  biggest_mistake: string;
  winning_insight: string;
  biggest_surprise: string;
}

export interface Reflection {
  id: string;
  session_id: string;
  team_id: string;
  biggest_mistake: string;
  winning_insight: string;
  biggest_surprise: string;
  created_at: string;
  team_name?: string;
}
