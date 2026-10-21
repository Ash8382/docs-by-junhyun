import type { StandardProject } from "./types";

export const kokoaClone = {
  kind: "standard",
  slug: "kokoa-clone",
  title: "코코아톡 (Kokoa Clone)",
  period: "2023.04.01 ~ 2023.05.01",
  team: "Individual Project",
  summary: "HTML과 CSS로 구현한 카카오톡 클론 코딩",
  stack: ["HTML5", "CSS3"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/Ellsy23/kokoa-clone-2023",
    },
    {
      kind: "live",
      label: "Live Demo (Check Note)",
      href: "https://ellsy23.github.io/kokoa-clone-2023/",
    },
  ],
  screens: [
    {
      src: "/kokoa-clone-thumb.png",
      alt: "Kokoa Clone Project Screenshot",
      width: 505,
      height: 635,
    },
  ],
  overview: [
    "노마드코더의 카카오톡 클론 코딩 강의를 수강하며 진행한 프로젝트입니다. HTML과 CSS 개념을 확실히 이해하고, 실제 애플리케이션의 UI를 직접 구현해보며 실전 감각을 익히는 것을 목표로 했습니다.",
  ],
  achievements: [
    "**UI/UX 정밀 구현**: HTML과 CSS만을 사용하여 카카오톡의 사용자 인터페이스를 픽셀 단위로 정교하게 재현했습니다. 레이아웃 구성과 스타일링 능력이 크게 늘어난 작업입니다.",
    "웹 페이지에 **반응형 디자인**을 적용해 다양한 화면 크기에서도 깨지지 않고 자연스럽게 동작하도록 구현했습니다.",
    "시맨틱 태그를 적절히 활용하여 **웹 접근성과 표준**을 준수하는 마크업을 작성했습니다.",
  ],
  note: {
    title: "참고 사항",
    text: "현재 배포된 페이지에서 CSS 파일 로드 문제(CSP 정책 및 404 에러)로 인해 스타일이 정상적으로 적용되지 않을 수 있습니다. 정확한 구현 화면과 코드는 GitHub 저장소를 통해 확인해 주시면 감사하겠습니다.",
  },
} satisfies StandardProject;
