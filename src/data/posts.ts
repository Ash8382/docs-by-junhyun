export type PostCategory = "project" | "post";

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: PostCategory;
  tags?: string[];
  image?: string;
}

export const posts: Post[] = [
  {
    slug: "pickcare-frontend-architecture",
    title: "픽케어 프론트엔드 아키텍처 — 10가지 설계 결정과 그 이유",
    description: "선제적 토큰 리프레시, Query Key Factory, TipTap 에디터 확장 15개, Atomic Design 하이브리드 등 실무에서 직접 설계한 프론트엔드 아키텍처 패턴 정리.",
    date: "2025.12.20",
    category: "post",
    tags: ["React", "Next.js", "TypeScript", "아키텍처", "React Query", "TipTap"],
    image: "/posts/tiptap-og.jpg",
  },
  {
    slug: "ai-programming-semantic-drift",
    title: "AI 코딩의 근본적 한계와 Semantic Drift 문제",
    description: "LLM이 코드를 생성할 때 발생하는 의미적 드리프트 문제와, 임베딩 공간에 곡률을 부여해 버그 경로를 억제하는 아이디어 정리.",
    date: "2026.03.12",
    category: "post",
    tags: ["AI", "LLM", "코딩"],
    image: "/posts/ai-semantic-drift.png",
  },
  {
    slug: "ai-ide-tools-2025",
    title: "AI IDE 도구들 비교: Conductor, Claude Code, Antigravity 등",
    description: "Conductor의 Git Worktree 병렬 작업, Claude Code CLI, Antigravity, Tavily RAG, Atlas 브라우저 등 AI 개발 도구 생태계 정리.",
    date: "2026.02.13",
    category: "post",
    tags: ["AI", "IDE", "Claude Code", "개발도구"],
    image: "/posts/ai-ide-tools.png",
  },
  {
    slug: "react-server-components",
    title: "React Server Components 제대로 이해하기",
    description: "RSC가 기존 SSR과 어떻게 다른지, 그리고 Next.js App Router에서 실제로 어떻게 동작하는지 정리했습니다.",
    date: "2026.03.10",
    category: "post",
    tags: ["React", "Next.js", "RSC"],
    image: "/posts/rsc-diagram.webp",
  },
  {
    slug: "tailwind-v4-migration",
    title: "Tailwind CSS v4 마이그레이션 후기",
    description: "Tailwind v3에서 v4로 마이그레이션하면서 겪은 변경점과 삽질 기록. @theme, @plugin 등 새로운 문법 정리.",
    date: "2026.03.05",
    category: "post",
    tags: ["Tailwind CSS", "CSS"],
    image: "/posts/tailwindcss-logo.png",
  },
  {
    slug: "til-zustand-persist",
    title: "TIL: Zustand persist 미들웨어 사용 시 hydration 이슈",
    description: "SSR 환경에서 Zustand persist를 사용할 때 발생하는 hydration mismatch 해결 방법을 알아봤다.",
    date: "2026.02.28",
    category: "post",
    tags: ["Zustand", "React", "TIL"],
    image: "/posts/zustand-logo.png",
  },
  {
    slug: "react-context",
    title: "React Context, Composition vs Inheritance 정리",
    description: "Context API를 활용한 전역 상태 관리와 합성(Composition) vs 상속(Inheritance) 패턴의 차이를 정리했다.",
    date: "2023.09.23",
    category: "post",
    tags: ["React", "Context", "디자인패턴"],
    image: "/posts/react-logo.png",
  },
  {
    slug: "react-forms-and-lifting-state",
    title: "React Forms와 State 끌어올리기",
    description: "Controlled Component로 폼을 다루는 방법과, 여러 컴포넌트 간 상태를 공유하기 위한 Lifting State Up 패턴 학습 기록.",
    date: "2023.09.22",
    category: "post",
    tags: ["React", "Forms", "State"],
    image: "/posts/react-logo.png",
  },
  {
    slug: "react-hooks-and-events",
    title: "React Hooks, 이벤트 핸들링, 조건부 렌더링",
    description: "useState, useEffect 등 Hooks의 기본 개념부터 이벤트 처리, 조건부 렌더링, 리스트와 Keys까지 한번에 정리.",
    date: "2023.09.21",
    category: "post",
    tags: ["React", "Hooks", "이벤트"],
    image: "/posts/react-logo.png",
  },
  {
    slug: "react-intro-jsx-components",
    title: "React 입문: JSX, 렌더링, 컴포넌트와 Props",
    description: "React의 시작점. JSX 문법, Rendering Elements, 컴포넌트 설계와 Props, State와 Lifecycle까지 기초 개념 정리.",
    date: "2023.09.20",
    category: "post",
    tags: ["React", "JSX", "컴포넌트"],
    image: "/posts/react-logo.png",
  },
  {
    slug: "javascript-es6",
    title: "JavaScript ES6 핵심 문법 총정리",
    description: "let/const, 화살표 함수, 템플릿 리터럴, 구조분해 할당, 스프레드 연산자, Promise 등 ES6 핵심 문법을 섹션별로 정리했다.",
    date: "2023.09.19",
    category: "post",
    tags: ["JavaScript", "ES6"],
    image: "/posts/javascript-logo.png",
  },
  {
    slug: "web3-i18n-nft",
    title: "Web3, NFT, i18n 개념 정리 - PFPlay 프로젝트 사전 학습",
    description: "PFPlay 합류 전 Web3 생태계, NFT(PFP) 개념, 그리고 다국어 지원(i18n) 구현 방법을 사전 학습한 기록.",
    date: "2024.07.20",
    category: "post",
    tags: ["Web3", "NFT", "i18n"],
    image: "/posts/web3-concept.jpg",
  },
  {
    slug: "pfplay",
    title: "PFPlay",
    description: "PFP NFT와 디제잉을 결합한 Web3 소셜 플랫폼",
    date: "2024.08 ~ 2025.02",
    category: "project",
    tags: ["TypeScript", "Next.js", "React", "Tailwind CSS"],
    image: "/pfplay-thumb.png",
  },
  {
    slug: "python-pycharm",
    title: "Python & PyCharm 학습 기록",
    description: "PyCharm IDE 설정부터 Python 기초 문법, 가상환경, 패키지 관리까지 학습하며 정리한 내용.",
    date: "2023.10.28",
    category: "post",
    tags: ["Python", "PyCharm"],
    image: "/posts/pycharm-logo.jpg",
  },
  {
    slug: "tix2u",
    title: "Tix2U",
    description: "전시, 공연 등 다양한 문화생활 티켓 구매 서비스",
    date: "2023.11 ~ 2023.12",
    category: "project",
    tags: ["React", "TypeScript"],
    image: "/tix2u-thumb.png",
  },
  {
    slug: "stock2u",
    title: "Stock2U",
    description: "위치 기반 재고 공유 서비스",
    date: "2023.09 ~ 2023.11",
    category: "project",
    tags: ["React", "TypeScript"],
    image: "/stock2u-thumb.png",
  },
  {
    slug: "typescript-basics",
    title: "TypeScript 기초 정리 - 타입 시스템부터 제네릭까지",
    description: "JavaScript에서 TypeScript로 넘어가며 배운 타입 시스템, 인터페이스, 제네릭, 유틸리티 타입 등 핵심 개념 정리.",
    date: "2023.09.25",
    category: "post",
    tags: ["TypeScript"],
    image: "/posts/typescript-logo.png",
  },
  {
    slug: "eutcha",
    title: "EUTCHA",
    description: "리액트와 협업에 익숙해지기 위한 프론트엔드 비기너 프로젝트",
    date: "2023.09 ~ 2023.10",
    category: "project",
    tags: ["React"],
    image: "/eutcha-thumb.png",
  },
  {
    slug: "todo-app",
    title: "Todo App",
    description: "HTML, CSS, JS로 구현한 투두 리스트 앱",
    date: "2023.05 ~ 2023.06",
    category: "project",
    tags: ["HTML", "CSS", "JavaScript"],
    image: "/todo-app-thumb.png",
  },
  {
    slug: "kokoa-clone",
    title: "코코아톡 (Kokoa Clone)",
    description: "HTML, CSS로 구현한 카카오톡 클론 코딩",
    date: "2023.04 ~ 2023.05",
    category: "project",
    tags: ["HTML", "CSS"],
    image: "/kokoa-clone-thumb.png",
  },
];

function parseDateForSort(date: string): string {
  // "2024.08 ~ 2025.02" → "2025.02" (끝 날짜 기준)
  // "2023.09.23" → "2023.09.23"
  const parts = date.split("~").map((s) => s.trim());
  return parts[parts.length - 1];
}

function sortByDateDesc(a: Post, b: Post): number {
  return parseDateForSort(b.date).localeCompare(parseDateForSort(a.date));
}

export const sortedPosts = [...posts].sort(sortByDateDesc);

export function getPostsByCategory(category?: PostCategory): Post[] {
  const sorted = sortedPosts;
  if (!category) return sorted;
  return sorted.filter((post) => post.category === category);
}

export const categoryLabels: Record<PostCategory, string> = {
  project: "Project",
  post: "Post",
};
