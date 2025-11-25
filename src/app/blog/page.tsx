import { PostCard } from "@/components/PostCard";

export const metadata = {
  title: "블로그 - 이준현",
  description: "소프트웨어 개발, 디자인, 그리고 다양한 생각들을 공유합니다.",
};

export default function BlogPage() {
  const posts = [
    {
      slug: "pfplay",
      title: "PFPlay",
      description: "PFP NFT와 디제잉을 결합한 Web3 소셜 플랫폼",
      date: "2024.08 ~ 2025.02",
      image: "/pfplay-thumb.png",
    },
    {
      slug: "tix2u",
      title: "Tix2U",
      description: "전시, 공연 등 다양한 문화생활 티켓 구매 서비스",
      date: "2023.11 ~ 2023.12",
      image: "/tix2u-thumb.png",
    },
    {
      slug: "stock2u",
      title: "Stock2U",
      description: "위치 기반 재고 공유 서비스",
      date: "2023.09 ~ 2023.11",
      image: "/stock2u-thumb.png",
    },
    {
      slug: "eutcha",
      title: "EUTCHA",
      description: "리액트와 협업에 익숙해지기 위한 프론트엔드 비기너 프로젝트",
      date: "2023.09 ~ 2023.10",
      image: "/eutcha-thumb.png",
    },
  ];

  return (
    <main className="container py-6 lg:py-10">
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8">
        <div className="flex-1 space-y-4">
          <h1 className="inline-block font-bold text-4xl tracking-tight lg:text-5xl">
            블로그
          </h1>
          <p className="text-xl text-muted-foreground">
            생각, 튜토리얼, 그리고 메모들을 모아둔 공간입니다.
          </p>
        </div>
      </div>
      <hr className="my-8 border-border" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} {...post} />
        ))}
      </div>
    </main>
  );
}
