"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface TechItem {
  name: string;
  logo: string;
}

const techStack: TechItem[] = [
  { name: "React", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" },
  { name: "Next.js", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" },
  { name: "TypeScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
  { name: "JavaScript", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" },
  { name: "Tailwind CSS", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" },
  { name: "Node.js", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" },
  { name: "HTML5", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" },
  { name: "CSS3", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" },
  { name: "Git", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
  { name: "GitHub", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" },
  { name: "Figma", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg" },
  { name: "Java", logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
];

export function TechCarousel() {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Duplicate the array for seamless loop
  const duplicatedTech = [...techStack, ...techStack];

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let currentPosition = 0;
    const speed = 0.5; // pixels per frame

    const animate = () => {
      if (!isPaused) {
        currentPosition -= speed;
        
        // Reset position when we've scrolled through one full set
        const resetPoint = -(scrollContainer.scrollWidth / 2);
        if (currentPosition <= resetPoint) {
          currentPosition = 0;
        }
        
        scrollContainer.style.transform = `translateX(${currentPosition}px)`;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPaused]);

  return (
    <div className="w-full overflow-hidden py-8 bg-muted/30 rounded-lg">
      <div 
        ref={scrollRef}
        className="flex gap-12"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {duplicatedTech.map((tech, index) => (
          <div
            key={`${tech.name}-${index}`}
            className="flex flex-col items-center justify-center min-w-[100px] gap-3 group cursor-pointer"
          >
            <div className="relative w-16 h-16 transition-transform group-hover:scale-110 filter grayscale group-hover:grayscale-0">
              <Image
                src={tech.logo}
                alt={tech.name}
                fill
                className="object-contain"
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
              {tech.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
