import type { Metadata } from "next";
import ProfessorView from "@/components/ProfessorView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Professor Dashboard | CampaignLab",
};

export default function ProfessorPage() {
  return <ProfessorView />;
}
