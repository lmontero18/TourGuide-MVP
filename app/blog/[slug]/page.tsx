import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

// Solo los slugs pre-renderizados existen; cualquier otro da 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Tourfy`,
    description: post.description,
    alternates: { canonical: `https://www.tourfy.app/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      url: `https://www.tourfy.app/blog/${post.slug}`,
      // El contenido de los posts esta en español
      locale: "es_LA",
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const t = await getTranslations("blog");
  const locale = await getLocale();

  // El nombre del archivo es el slug — convencion de app/blog/posts/
  const { default: Content } = await import(`@/app/blog/posts/${slug}.mdx`);

  return (
    <article className="pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-2xl px-5 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="text-sm font-semibold text-slate-500 hover:text-navy-900 transition-colors"
        >
          ← {t("back")}
        </Link>

        {/* Contenido en español — lang explicito para semantica/SEO
            independiente del locale de la UI */}
        <div lang="es">
          <header className="mt-6">
            <time
              dateTime={post.date}
              className="text-xs font-semibold text-slate-500"
            >
              {new Date(`${post.date}T00:00:00`).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-950 leading-tight">
              {post.title}
            </h1>
            <p className="mt-3 text-lg text-slate-500 leading-relaxed">
              {post.description}
            </p>
          </header>

          <div className="prose prose-slate mt-10 max-w-none prose-headings:font-display prose-headings:tracking-tight prose-headings:text-navy-950 prose-a:text-blue-600 prose-strong:text-navy-950">
            <Content />
          </div>
        </div>
      </div>
    </article>
  );
}
