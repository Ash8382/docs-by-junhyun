"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface CardData {
  title: string;
  description: string;
  gradient: string;
  techStack: string[];
  funFact: string;
}

const cards: CardData[] = [
  {
    title: "Frontend",
    description: "React, Next.js, TypeScript로 사용자 경험을 설계합니다",
    gradient: "from-blue-500 to-cyan-400",
    techStack: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    funFact: "매일 새로운 UI 패턴을 탐구합니다",
  },
  {
    title: "3D & Creative",
    description: "Three.js로 몰입감 있는 인터랙티브 경험을 만듭니다",
    gradient: "from-purple-500 to-pink-400",
    techStack: ["Three.js", "R3F", "WebGL", "GLSL"],
    funFact: "브라우저에서 GPU의 힘을 끌어냅니다",
  },
  {
    title: "State Management",
    description: "복잡한 상태를 깔끔하게 관리합니다",
    gradient: "from-emerald-500 to-teal-400",
    techStack: ["Zustand", "React Query", "Context API"],
    funFact: "상태가 단순할수록 코드는 강해집니다",
  },
  {
    title: "Cloud & Infra",
    description: "클라우드 환경에서 서비스를 구축하고 운영합니다",
    gradient: "from-amber-500 to-yellow-400",
    techStack: ["AWS", "S3", "Docker", "Vercel", "GitHub Actions"],
    funFact: "자동화할 수 있다면 자동화합니다",
  },
  {
    title: "Collaboration",
    description: "팀과 함께 효율적으로 소통하고 협업합니다",
    gradient: "from-orange-500 to-amber-400",
    techStack: ["Git", "GitHub Issues", "Figma", "Jira", "Slack"],
    funFact: "좋은 커뮤니케이션이 좋은 코드를 만듭니다",
  },
  {
    title: "API & Testing",
    description: "API 문서화와 안정적인 테스트를 작성합니다",
    gradient: "from-rose-500 to-red-400",
    techStack: ["Swagger", "Apidog", "Jest", "Storybook", "React Testing Library"],
    funFact: "테스트는 미래의 나를 위한 선물입니다",
  },
];

function FlipCard({ card }: { card: CardData }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={() => setIsFlipped((prev) => !prev)}
    >
      <motion.div
        className="relative w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ scale: 1.03 }}
      >
        {/* Front */}
        <div
          className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${card.gradient} p-5 flex flex-col justify-end shadow-lg hover:shadow-2xl transition-shadow`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute inset-0 rounded-2xl bg-black/10" />
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-1">{card.title}</h3>
            <p className="text-white/80 text-xs leading-relaxed">
              {card.description}
            </p>
          </div>
          <div className="absolute top-3 right-3 text-white/40">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 aspect-[4/3] rounded-2xl bg-secondary/80 border border-border p-5 flex flex-col justify-between shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <h3 className="text-base font-bold text-foreground mb-3">
              Tech Stack
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {card.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium border border-border"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <p className="text-muted-foreground text-xs italic leading-relaxed">
            {card.funFact}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function SkillCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <FlipCard key={card.title} card={card} />
      ))}
    </div>
  );
}
