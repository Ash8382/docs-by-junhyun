import type { StandardProject } from "./types";

export const todoApp = {
  kind: "standard",
  slug: "todo-app",
  title: "Todo App",
  period: "2023.05.01 ~ 2023.06.01",
  team: "Individual Project (with Mentor)",
  summary: "프론트엔드 입문자를 위한 Todo App 만들기 과제",
  stack: ["HTML5", "CSS3", "JavaScript"],
  links: [
    {
      kind: "github",
      label: "GitHub Repository",
      href: "https://github.com/geezers-io/todo-app-assignment",
    },
    {
      kind: "live",
      label: "Live Demo",
      href: "https://geezers-io.github.io/todo-app-assignment/",
    },
  ],
  screens: [
    {
      src: "/todo-app-thumb.png",
      alt: "Todo App Screenshot",
      width: 1024,
      height: 603,
    },
  ],
  overview: [
    "HTML과 CSS, 순수 JavaScript만으로 구현한 Todo List 애플리케이션입니다. 프론트엔드 개발의 기초를 다지기 위한 과제 프로젝트로 진행되었습니다.",
  ],
  achievements: [
    "**기본기 강화**: HTML5와 CSS3로 시맨틱한 마크업과 레이아웃을 구성했습니다. 동적인 기능은 JavaScript로 구현하며 웹 개발의 핵심 기초를 다졌습니다.",
    "**상태 관리 이해**: 외부 라이브러리 없이 순수 JavaScript로 데이터의 상태(State)를 관리하고 UI에 반영하면서 프론트엔드 개발의 기본적인 데이터 흐름을 익혔습니다.",
    "**사용자 경험(UX) 고려**: 단순한 기능 구현을 넘어 사용자가 직관적으로 사용할 수 있는 디자인과 인터랙션을 고민하고 적용했습니다.",
  ],
} satisfies StandardProject;
