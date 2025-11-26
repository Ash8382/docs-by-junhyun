"use client";

import Image from "next/image";

interface TechItem {
  name: string;
  logo: string;
}

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

interface MarqueeProps {
  items: TechItem[];
  reverse?: boolean;
}

function Marquee({ items, reverse = false }: MarqueeProps) {
  return (
    <div className="group flex overflow-hidden gap-6 [--duration:30s] [--gap:1.5rem]">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={`flex shrink-0 gap-6 ${
              reverse ? "animate-marquee-reverse" : "animate-marquee"
            } group-hover:[animation-play-state:paused]`}
          >
            {items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex flex-col items-center justify-center flex-shrink-0"
              >
                <div className="bg-card rounded-2xl p-5 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 group/item cursor-pointer border border-border">
                  <div className="relative w-12 h-12 transition-all duration-300 group-hover/item:scale-110">
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
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

export function TechCarousel() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="py-6 bg-muted/30 dark:bg-muted/10 rounded-2xl border border-border/50 dark:border-border/30">
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 dark:text-muted-foreground/60 mb-4 px-6">
            Technologies
          </h3>
          <Marquee items={technologies} />
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 dark:text-muted-foreground/60 mb-4 px-6">
            Tools
          </h3>
          <Marquee items={tools} reverse />
        </div>
      </div>
    </div>
  );
}
