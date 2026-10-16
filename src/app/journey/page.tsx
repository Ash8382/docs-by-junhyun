import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import { JourneyContent } from "@/components/journey/JourneyContent";
import { JourneyStage } from "@/components/journey/JourneyStage";

export const metadata: Metadata = {
  title: "Journey - 이준현",
  description: "A Journey Through Code",
};

export default function JourneyPage() {
  return (
    <>
      <JourneyContent />
      <JourneyStage />
    </>
  );
}
