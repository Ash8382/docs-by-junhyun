import type { StandardProject } from "./types";

export const stock2u = {
  kind: "standard",
  slug: "stock2u",
  title: "Stock2U",
  period: "2023.09.21 ~ 2023.11.16",
  team: "Team Project (5명)",
  summary: "위치 기반 재고 공유 서비스",
  stack: ["TypeScript", "React", "Chakra UI", "Zustand", "Figma", "Jira"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/Stock2U-front",
    },
    {
      kind: "live",
      label: "Live Demo (Check Note)",
      href: "https://stock2u-front.vercel.app/",
    },
  ],
  screens: [
    {
      src: "/stock2u-thumb.png",
      alt: "Stock2U Project Screenshot",
      width: 719,
      height: 392,
    },
  ],
  overview: [
    "Stock2U는 판매자와 소비자를 연결하는 서비스입니다. 위치 기반으로 재고 상품을 공유하고 판매할 수 있습니다. 해커톤 K-Digital Training 대회 출전용 프로젝트로 시작하여 본선에 진출하는 성과를 거두었습니다.",
  ],
  overviewCallout: {
    title: "개발 인원 (총 5명)",
    items: ["Frontend 3명 (본인 참여)", "Backend 2명"],
  },
  role: [
    "**UI/UX 디자인 및 퍼블리싱**: 메인 페이지의 디자인을 설계하고 반응형 웹으로 구현하여 사용자 접근성을 높였습니다.",
    "**마이페이지 구현**: 일반 사용자와 판매자용 마이페이지를 각각 구현했습니다. 사용자 유형에 따라 맞춤형 기능을 제공했습니다.",
    "**REST API 연동**: 백엔드 API와 프론트엔드를 연동하여 실제 데이터를 처리하고 화면에 표시했습니다.",
  ],
  achievements: [
    "**협업 프로세스 체득**: 백엔드 개발자와 함께한 첫 협업 프로젝트였습니다. Swagger UI로 API 명세서를 확인하고 호출 방식을 논의하면서 효율적인 소통이 얼마나 중요한지 깨달았습니다.",
    "**새로운 툴 적응**: Jira, Figma 등 실무에서 사용되는 협업 툴을 처음 도입했습니다. 프로젝트 관리 및 디자인 커뮤니케이션 능력은 여기서 키웠습니다.",
    "**문제 해결 능력**: PM과 프론트엔드 역할을 병행하며 팀 내 이슈를 조율하고 프로젝트 일정을 관리하는 경험을 했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "현재 Vercel을 통해 배포된 사이트는 백엔드 서버와의 연결 문제 또는 배포 설정 이슈로 인해 정상적으로 접속되지 않을 수 있습니다. 프로젝트 종료 후 유지보수 기간이 만료되었거나 외부 API 의존성에 문제가 생긴 것으로 짐작합니다. 상세한 코드 구조와 구현 내용은 GitHub 저장소를 참고해 주시기 바랍니다.",
  },
} satisfies StandardProject;
