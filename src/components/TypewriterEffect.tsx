"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TypewriterEffectProps {
  text: string;
  className?: string;
  cursorClassName?: string;
}

export function TypewriterEffect({ text, className, cursorClassName }: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 100); // Typing speed

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return (
    <div className={className}>
      <span>{displayedText}</span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className={`inline-block w-[2px] h-[1em] bg-foreground ml-1 align-middle ${cursorClassName}`}
      />
    </div>
  );
}
