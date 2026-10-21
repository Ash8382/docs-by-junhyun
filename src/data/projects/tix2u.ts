import type { StandardProject } from "./types";

export const tix2u = {
  kind: "standard",
  slug: "tix2u",
  title: "Tix2U",
  period: "2023.11.17 ~ 2023.12.22",
  team: "Team Project (FE 2명)",
  summary: "전시, 공연 등 다양한 문화생활 티켓을 구매할 수 있는 서비스",
  stack: ["TypeScript", "Next.js", "React", "Chakra UI", "Supabase", "Figma"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/Tix2U",
    },
    {
      kind: "live",
      label: "Live Demo (Expired)",
      href: "https://tix2u.vercel.app/",
    },
  ],
  screens: [
    {
      src: "/tix2u-thumb.png",
      alt: "Tix2U Project Screenshot",
      width: 720,
      height: 391,
    },
  ],
  overview: [
    "Tix2U는 티켓 구매 서비스입니다. 다양한 문화생활을 즐기고 싶은 20~30대, 그리고 예술의 알고리즘을 탐구하는 사람들을 위해 만들었습니다. 공공 데이터(공연예술통한전산망 API)를 활용하여 실제 공연 정보를 제공하며 개발자 양성 교육과정의 최종 프로젝트로 진행되었습니다.",
  ],
  overviewCallout: {
    title: "목표",
    text: "프론트엔드에서 최대한의 기능을 구현하는 것을 목표로, 기획부터 디자인, 개발, 배포까지 전 과정을 경험했습니다.",
  },
  role: [
    {
      title: "메인 페이지",
      items: [
        "이미지 캐러셀 적용으로 시각적 몰입도 향상",
        "티켓 포스터 이미지 확대/축소 인터랙션 구현",
        "로딩 스피너 및 스켈레톤 UI로 UX 개선",
      ],
    },
    {
      title: "카테고리 및 기능",
      items: [
        "Infinite Scroll로 끊김 없는 리스트 탐색 구현",
        "장바구니 및 찜하기(WishList) 기능 구현",
        "반응형 디자인 및 ErrorBoundary를 통한 에러 처리",
      ],
    },
  ],
  achievements: [
    "**단기간 집중 개발**: 1개월이라는 제한된 시간 안에 기획부터 배포까지의 전 과정을 완주했습니다. 그 과정에서 타임라인 관리 능력을 길렀습니다.",
    "**풀사이클 경험**: 프론트엔드 개발뿐만 아니라 디자인 구성, 서버 구축(Supabase), 배포, 리팩토링까지 경험하며 서비스 전체 구조에 대한 이해를 넓혔습니다.",
    "**사용자 중심 UI/UX**: 스켈레톤 UI, 무한 스크롤 등 사용자의 편의성을 고려한 다양한 인터페이스 패턴을 직접 구현했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "현재 배포된 Vercel 페이지는 데이터가 정상적으로 로드되지 않을 수 있습니다. 연동된 공공 데이터 API의 URL이 만료되었기 때문입니다. 프로젝트의 소스 코드와 상세 구현 내용은 GitHub 저장소를 통해 확인해 주시면 감사하겠습니다.",
  },
} satisfies StandardProject;
