"use client";

import { motion } from "framer-motion";

interface TimelineItem {
  title: string;
  role: string;
  period: string;
  description: string;
}

const items: TimelineItem[] = [
  {
    title: "PiCKCARE (픽케어)",
    role: "Frontend Developer",
    period: "2025.10 ~ 현재",
    description: "프론트엔드 개발 및 서비스 기획 참여, 백엔드 로직 지원",
  },
  {
    title: "PFPlay 개발팀",
    role: "Team Member",
    period: "2024.08 ~ 2025.02",
    description: "사이드 프로젝트 개발 참여",
  },
  {
    title: "멀티캠퍼스 프론트엔드 개발자 취업캠프",
    role: "Trainee",
    period: "2023.08 ~ 2023.12",
    description: "프론트엔드 심화 과정 수료",
  },
  {
    title: "현직자&취준생 개발팀 멘티",
    role: "Mentee",
    period: "2023.09 ~ 2023.11",
    description: "현직 개발자 멘토링 참여",
  },
];

export function Timeline() {
  return (
    <div className="relative border-l border-muted ml-2 pl-6 space-y-8">
      {items.map((item, index) => (
        <motion.div
          key={index}
          className="relative"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: index * 0.15 }}
        >
          <motion.span
            className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.3, delay: index * 0.15 + 0.2 }}
          />
          <h3 className="text-lg font-bold">{item.title}</h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm text-muted-foreground mb-1">
            <span className="font-medium text-foreground">{item.role}</span>
            <span className="hidden sm:inline">&middot;</span>
            <span>{item.period}</span>
          </div>
          <p className="text-muted-foreground">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
