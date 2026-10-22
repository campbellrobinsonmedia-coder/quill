import { OnboardingWizard } from "./onboarding-wizard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Start writing" };

export default function OnboardingPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <OnboardingWizard />
    </div>
  );
}
