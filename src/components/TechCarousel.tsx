"use client";

import { useState } from "react";
import Image from "next/image";

interface TechItem {
  name: string;
  logo: string;
}

// Technologies
const technologies: TechItem[] = [
  { name: "React", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" },
  { name: "Next.js", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" },
  { name: "TypeScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
  { name: "JavaScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" },
  { name: "Tailwind CSS", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" },
  { name: "Node.js", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" },
  { name: "HTML5", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" },
  { name: "CSS3", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" },
  { name: "Java", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
];

// Tools & Frameworks
const tools: TechItem[] = [
  { name: "Git", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
  { name: "GitHub", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" },
  { name: "Figma", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg" },
  { name: "Jira", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg" },
  { name: "Slack", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg" },
  { name: "Storybook", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/storybook/storybook-original.svg" },
  { name: "Three.js", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/threejs/threejs-original.svg" },
  { name: "Webpack", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/webpack/webpack-original.svg" },
  { name: "Docker", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" },
];

const ANIMATION_SPEED = 0.8; // Fast speed


interface CarouselRowProps {
  items: TechItem[];
  direction: "left" | "right";
  isPaused: boolean;
}

function CarouselRow({ items, direction, isPaused }: CarouselRowProps) {
  // Quadruple items for ultra-seamless loop (no visible reset)
  const duplicatedItems = [...items, ...items, ...items, ...items];

  return (
    <div className="w-full overflow-hidden">
      <div 
        className="flex gap-6"
        style={{
          animationName: `carousel-scroll-${direction}`,
          animationDuration: '30s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationPlayState: isPaused ? 'paused' : 'running',
          willChange: 'transform',
        }}
      >
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className="flex flex-col items-center justify-center gap-2 flex-shrink-0"
          >
            {/* Icon Card with Background and Shadow */}
            <div className="bg-card rounded-2xl p-5 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-border">
              <div className="relative w-12 h-12 transition-all duration-300 group-hover:scale-110">
                <Image
                  src={item.logo}
                  alt={item.name}
                  fill
                  className={`object-contain ${
                    item.name === "Three.js" || item.name === "GitHub"
                      ? "dark:invert"
                      : ""
                  }`}
                />
              </div>
            </div>
            {/* Hidden label */}
            <span className="text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap sr-only">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TechCarousel() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div 
        className="py-6 bg-muted/30 dark:bg-muted/10 rounded-2xl border border-border/50 dark:border-border/30"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Technologies Row - Moving Right */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 dark:text-muted-foreground/60 mb-4 px-6">
            Technologies
          </h3>
          <CarouselRow 
            items={technologies} 
            direction="right" 
            isPaused={isPaused}
          />
        </div>

        {/* Tools Row - Moving Left */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 dark:text-muted-foreground/60 mb-4 px-6">
            Tools
          </h3>
          <CarouselRow 
            items={tools} 
            direction="left" 
            isPaused={isPaused}
          />
        </div>
      </div>
    </div>
  );
}
