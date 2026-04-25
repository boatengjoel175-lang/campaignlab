import type { Metadata } from "next";
import StudentView from "@/components/StudentView";

export const metadata: Metadata = {
  title: "Student Strategy Builder | CampaignLab",
};

export default function StudentPage() {
  return <StudentView />;
}
