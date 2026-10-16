import type { StandardProject } from "./types";

export const pfplay = {
  kind: "standard",
  slug: "pfplay",
  title: "PFPlay",
  period: "2024.08.04 ~ 2025.02.02",
  team: "Team Project",
  summary: "PFP NFT와 디제잉을 결합한 소셜 플랫폼",
  stack: ["TypeScript", "Next.js", "React", "Tailwind CSS", "Zustand", "Jest", "Storybook"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/pfplay/pfplay-web",
    },
  ],
  screens: [
    {
      src: "/pfplay-thumb.png",
      alt: "PFPlay Project Screenshot",
      width: 1024,
      height: 601,
    },
    {
      src: "/projects/pfplay/home.webp",
      alt: "PFPlay 첫 화면",
      width: 2880,
      height: 1800,
    },
  ],
  overview: [
    "PFPlay는 PFP(Profile Picture) NFT와 디제잉 문화를 결합한 Web3 기반 소셜 플랫폼입니다. 사용자는 자신의 NFT를 활용해 아이덴티티를 표현하고 음악을 통해 다른 사용자들과 소통할 수 있습니다.",
  ],
  overviewCallout: {
    title: "개발 인원 (총 9명)",
    items: ["PM 2명", "Frontend 3명 (본인 참여)", "Backend 2명", "Design 1명", "Marketing 1명"],
  },
  role: [
    "**디제잉 규칙 안내 모달**을 구현했습니다. 디제잉 등록 전 사용자에게 필수 규칙을 안내해 UX 흐름을 개선했습니다.",
    "**로그인 페이지 개편**: 기존 로그인 페이지의 UI/UX를 전면적으로 리뉴얼해 사용자 접근성을 끌어올렸습니다.",
  ],
  achievements: [
    "**실무 수준의 프론트엔드 환경 경험**: 글로벌 사용자 대상의 Web3 플랫폼을 개발하며 다국어 지원(i18n), 디자인 시스템 구축(Storybook) 등 최신 개발 트렌드를 실전에서 익혔습니다.",
    "**협업 커뮤니케이션 능력**이 늘었습니다. PM, 백엔드, 디자이너, 마케터 등 다양한 직군과 긴밀하게 협업하며 대규모 프로젝트의 워크플로우를 이해했습니다.",
    "**UX 중심의 기능 구현**: 단순히 기능만 구현하고 끝내지 않았습니다. 사용자 경험(UX)을 고려해 모달과 로그인 페이지를 설계했고 서비스 품질을 높였습니다.",
    "**코드 품질 및 유지보수**: 실무 멘토링을 통해 유지보수 가능한 코드 작성법과 컴포넌트 설계 원칙을 학습하고 적용했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "본 프로젝트는 투자 유치 및 수익 구조 설계 단계까지 진행되었으나, 개인적인 취업 준비 기간이 길어짐에 따라 부득이하게 중도 하차하게 되었습니다. 비록 끝까지 함께하지는 못했지만, 초기 기획부터 핵심 기능 구현 단계까지 열정적으로 참여하며 많은 성장을 이룬 프로젝트입니다.",
  },
} satisfies StandardProject;
