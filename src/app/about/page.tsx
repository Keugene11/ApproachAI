import { Suspense } from "react";
import LandingPage from "@/components/LandingPage";

export default function AboutPage() {
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  );
}
