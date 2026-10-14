import type { StandardProject } from "./types";

export const eutcha = {
  kind: "standard",
  slug: "eutcha",
  title: "EUTCHA",
  period: "2023.09.28 ~ 2023.10.09",
  team: "Team Project (FE 2명)",
  summary: "리액트와 협업에 익숙해지기 위한 프론트엔드 비기너 프로젝트",
  stack: ["React", "JavaScript", "Chakra UI", "Emotion", "TMDB API", "ESLint", "Prettier"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/EUTCHA",
    },
    {
      kind: "live",
      label: "Live Demo",
      href: "https://eutcha.vercel.app/",
    },
  ],
  screens: [
    {
      src: "/eutcha-thumb.png",
      alt: "EUTCHA Project Screenshot",
      width: 1024,
      height: 818,
    },
  ],
  overview: [
    "TMDB Open API를 활용하여 영화 정보를 제공하는 웹 애플리케이션 EUTCHA를 구축했습니다. 리액트와 협업에 익숙해지려고 진행한 프론트엔드 입문 프로젝트입니다.",
  ],
  overviewCallout: {
    title: "주요 특징",
    items: [
      "모바일 중심 디자인 (Max-width 1024px)",
      "TMDB API 기반 영화 데이터 연동",
      "WhatCha의 컬러셋을 레퍼런스로 활용",
    ],
  },
  roleIntro: "프로젝트 전반의 스타일링(CSS)과 주요 페이지 구현을 담당했습니다.",
  role: [
    "**공통 레이아웃 & 스타일**: Header, Home, About 페이지의 CSS 스타일링을 전담해 디자인을 일관되게 맞췄습니다.",
    "**상세 페이지 (Detail)**: 영화 상세 정보(포스터, 트레일러, 평점, 줄거리 등)를 보여주는 페이지의 라우팅과 스타일을 구현했습니다.",
    "**기능 구현**: 데이터 페칭 최적화는 인피니트 스크롤(Infinite Scroll) 기능을 직접 구현하며 익혔습니다.",
  ],
  extraSections: [
    {
      title: "기술 스택 및 규칙",
      items: [
        "**Framework/Library**: React 18, Chakra UI, Emotion",
        "**Code Quality**: ESLint, Prettier를 도입하여 코드 컨벤션을 유지했습니다.",
        "**API**: TMDB Open API로 실제 영화 데이터를 다뤘습니다.",
      ],
    },
  ],
} satisfies StandardProject;
