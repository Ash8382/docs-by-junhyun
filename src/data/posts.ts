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
    slug: "react-server-components",
    title: "React Server Components 제대로 이해하기",
    description: "RSC가 기존 SSR과 어떻게 다른지, 그리고 Next.js App Router에서 실제로 어떻게 동작하는지 정리했습니다.",
    date: "2026.03.10",
    category: "post",
    tags: ["React", "Next.js", "RSC"],
  },
  {
    slug: "tailwind-v4-migration",
    title: "Tailwind CSS v4 마이그레이션 후기",
    description: "Tailwind v3에서 v4로 마이그레이션하면서 겪은 변경점과 삽질 기록. @theme, @plugin 등 새로운 문법 정리.",
    date: "2026.03.05",
    category: "post",
    tags: ["Tailwind CSS", "CSS"],
  },
  {
    slug: "til-zustand-persist",
    title: "TIL: Zustand persist 미들웨어 사용 시 hydration 이슈",
    description: "SSR 환경에서 Zustand persist를 사용할 때 발생하는 hydration mismatch 해결 방법을 알아봤다.",
    date: "2026.02.28",
    category: "post",
    tags: ["Zustand", "React", "TIL"],
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

export function getPostsByCategory(category?: PostCategory): Post[] {
  if (!category) return posts;
  return posts.filter((post) => post.category === category);
}

export const categoryLabels: Record<PostCategory, string> = {
  project: "프로젝트",
  post: "글",
};
