import { Nav } from "@/components/landing/Nav";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { Footer } from "@/components/landing/Footer";
import { LandingAnimations } from "@/components/landing/LandingAnimations";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-primary font-sans text-text-primary">
      <Nav />
      <LandingAnimations>
        <HeroSection />
        <AboutSection />
        <PricingSection />
        <TestimonialsSection />
        <DemoSection />
      </LandingAnimations>
      <Footer />
    </div>
  );
}
