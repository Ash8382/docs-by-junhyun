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
      slug: "hello-world",
      title: "첫 번째 글",
      description: "블로그를 시작하며 남기는 첫 번째 글입니다.",
      date: "2025년 11월 24일",
      image: "https://images.unsplash.com/photo-1499750310159-5b5f38e31638?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    },
    {
      slug: "building-this-blog",
      title: "Next.js로 블로그 만들기",
      description: "Next.js, Tailwind CSS, Vercel을 사용하여 이 블로그를 만든 과정을 공유합니다.",
      date: "2025년 11월 23일",
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    },
    {
      slug: "future-plans",
      title: "앞으로의 계획",
      description: "이 블로그와 저의 커리어에 대한 앞으로의 계획을 정리해봅니다.",
      date: "2025년 11월 20일",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
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
