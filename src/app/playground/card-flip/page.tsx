"use client";

import { useState } from "react";
import Link from "next/link";
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
    title: "Collaboration",
    description: "팀과 함께 더 나은 결과를 만듭니다",
    gradient: "from-orange-500 to-amber-400",
    techStack: ["Git", "Figma", "Jira", "Slack"],
    funFact: "좋은 커뮤니케이션이 좋은 코드를 만듭니다",
  },
  {
    title: "Testing",
    description: "안정적인 코드를 위한 테스트를 작성합니다",
    gradient: "from-rose-500 to-red-400",
    techStack: ["Jest", "Storybook", "React Testing Library"],
    funFact: "테스트는 미래의 나를 위한 선물입니다",
  },
  {
    title: "DevOps",
    description: "배포와 운영 환경을 이해합니다",
    gradient: "from-indigo-500 to-violet-400",
    techStack: ["Docker", "Vercel", "GitHub Actions"],
    funFact: "자동화할 수 있다면 자동화합니다",
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
        {/* Front Face */}
        <div
          className={`relative aspect-[4/3] rounded-2xl bg-gradient-to-br ${card.gradient} p-6 flex flex-col justify-end shadow-lg hover:shadow-2xl transition-shadow`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute inset-0 rounded-2xl bg-black/10" />
          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white mb-2">{card.title}</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              {card.description}
            </p>
          </div>
          <div className="absolute top-4 right-4 text-white/40">
            <svg
              width="24"
              height="24"
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

        {/* Back Face */}
        <div
          className="absolute inset-0 aspect-[4/3] rounded-2xl bg-secondary/80 border border-border p-6 flex flex-col justify-between shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">
              Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {card.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium border border-border"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-muted-foreground text-xs italic leading-relaxed max-w-[80%]">
              {card.funFact}
            </p>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground shrink-0"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function CardFlipPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          href="/playground"
          className="text-purple-400 hover:text-purple-300 inline-block transition-colors mb-6 text-sm"
        >
          &larr; Back to Playground
        </Link>

        <h1 className="text-3xl font-bold mb-2">3D Card Flip Gallery</h1>
        <p className="text-muted-foreground mb-8">
          카드를 클릭하면 뒤집어서 기술 스택을 확인할 수 있습니다.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {cards.map((card) => (
            <FlipCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
