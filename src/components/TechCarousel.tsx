"use client";

import { motion } from "framer-motion";

interface TechItem {
  name: string;
  icon: string; // SVG path or emoji
}

const techStack: TechItem[] = [
  { name: "React", icon: "⚛️" },
  { name: "Next.js", icon: "▲" },
  { name: "TypeScript", icon: "TS" },
  { name: "Tailwind CSS", icon: "🎨" },
  { name: "JavaScript", icon: "JS" },
  { name: "Node.js", icon: "🟢" },
  { name: "Three.js", icon: "🎮" },
  { name: "Framer Motion", icon: "🎬" },
  { name: "Git", icon: "📦" },
  { name: "Figma", icon: "🎯" },
  { name: "Storybook", icon: "📚" },
  { name: "Zustand", icon: "🐻" },
];

export function TechCarousel() {
  // Duplicate the array for seamless loop
  const duplicatedTech = [...techStack, ...techStack];

  return (
    <div className="w-full overflow-hidden py-8 bg-muted/30 rounded-lg">
      <motion.div
        className="flex gap-8"
        animate={{
          x: [0, -50 * techStack.length],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 20,
            ease: "linear",
          },
        }}
        whileHover={{ animationPlayState: "paused" }}
      >
        {duplicatedTech.map((tech, index) => (
          <div
            key={`${tech.name}-${index}`}
            className="flex flex-col items-center justify-center min-w-[120px] gap-2 group cursor-pointer"
          >
            <div className="text-4xl transition-transform group-hover:scale-110">
              {tech.icon}
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {tech.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
