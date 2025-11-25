import Link from "next/link";
import { notFound } from "next/navigation";

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}


function getPost(slug: string) {
  const posts: Record<string, { title: string; content: string; date: string }> = {
    "hello-world": {
      title: "Hello World",
      date: "November 24, 2025",
      content: `
        <p>Welcome to my new blog! This is the start of something new.</p>
        <p>I'm using Next.js 15 and Tailwind CSS to build this.</p>
      `,
    },
    "building-this-blog": {
      title: "Building this blog with Next.js",
      date: "November 23, 2025",
      content: `
        <p>This blog is built with the latest web technologies.</p>
        <ul>
          <li>Next.js App Router</li>
          <li>Tailwind CSS v4</li>
          <li>Vercel Deployment</li>
        </ul>
      `,
    },
  };

  return posts[slug];
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {

    return (
      <article className="container py-6 lg:py-10">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Post Not Found (Demo)</h1>
          <p>You requested: {slug}</p>
          <p>This is a placeholder because the real content isn't connected yet.</p>
          <Link href="/blog">← Back to Blog</Link>
        </div>
      </article>
    );
  }

  return (
    <article className="container py-6 lg:py-10">
      <div>
        <time className="block text-sm text-muted-foreground">{post.date}</time>
        <h1 className="mt-2 inline-block font-bold text-4xl leading-tight lg:text-5xl">
          {post.title}
        </h1>
      </div>
      <hr className="my-8 border-border" />
      <div 
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <hr className="my-8 border-border" />
      <div className="flex justify-center py-6 lg:py-10">
        <Link href="/blog" className="flex items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground h-9">
          See all posts
        </Link>
      </div>
    </article>
  );
}
