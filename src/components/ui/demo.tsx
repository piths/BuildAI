import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { Hero2 } from "@/components/ui/hero-2-1";

function DemoHeroGeometric() {
  return (
    <HeroGeometric
      badge="Kokonut UI"
      title1="Elevate Your"
      title2="Digital Vision"
    />
  );
}

const DemoOne = () => {
  return (
    <div>
      <Hero2 />
    </div>
  );
};

export { DemoHeroGeometric, DemoOne };
