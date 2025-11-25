# 👨‍💻 Lee Junhyun's Portfolio

> **사용자를 위한 창의적 몰입, 성장을 즐기는 프론트엔드 개발자 이준현의 포트폴리오 웹사이트입니다.**

Next.js와 TypeScript, Tailwind CSS를 기반으로 구축되었으며, 3D 인터랙션과 부드러운 애니메이션을 통해 몰입감 있는 사용자 경험을 제공합니다.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/) (Page transitions, Hover effects)
- **3D Graphics**: [Three.js](https://threejs.org/) / [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) (Interactive Background)
- **Deployment**: [Vercel](https://vercel.com/)

## ✨ Key Features

- **Interactive 3D Background**: 마우스 움직임에 반응하는 은은한 별 입자 배경 (`Background3D`)
- **Dynamic UI**: `Framer Motion`을 활용한 부드러운 페이드인 및 호버 인터랙션
- **Typewriter Effect**: 첫인상을 강렬하게 남기는 타이핑 애니메이션
- **Responsive Design**: 모바일, 태블릿, 데스크탑 등 모든 디바이스에 최적화된 레이아웃
- **Project Showcase**: 주요 프로젝트(PFPlay, Tix2U 등) 상세 소개 페이지

## 📂 Project Structure

```bash
src/
├── app/                 # Next.js App Router pages
│   ├── blog/            # Project detail pages
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/          # Reusable UI components
│   ├── Background3D.tsx # Three.js star field
│   ├── PostCard.tsx     # Project preview card
│   ├── Header.tsx       # Navigation
│   └── ...
└── types/               # TypeScript definitions
```

## 🏃‍♂️ Getting Started

로컬 환경에서 프로젝트를 실행하려면 다음 단계를 따르세요.

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ash8382/docs-by-junhyun.git
   cd docs-by-junhyun
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 확인합니다.

## 📝 License

This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.
