import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import {
  BLOG_AUTHOR,
  BLOG_LOCALES,
  LOGO_URL,
  ORGANIZATION_ID,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  pageMetadata,
} from "@/lib/seo";

// Solo los slugs pre-renderizados existen; cualquier otro da 404.
export const dynamicParams = false;

// Posts solo en español: /en/blog/<slug> no se genera y da 404
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ locale: "es", slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  // Los posts estan escritos en español, sin importar el idioma de la UI
  return pageMetadata({
    title: `${post.title} · Tourfy`,
    description: post.description,
    path: `/blog/${post.slug}`,
    lang: "es",
    locales: BLOG_LOCALES,
    type: "article",
    publishedTime: post.date,
    modifiedTime: post.updated,
  });
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

  // El nombre del archivo es el slug — convencion de content/blog/
  const { default: Content } = await import(`@/content/blog/${slug}.mdx`);

  const url = absoluteUrl(`/blog/${post.slug}`);
  const related = getAllPosts().filter((p) => p.slug !== post.slug);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: "es",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: LOGO_URL,
    author: BLOG_AUTHOR,
    publisher: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
  };

  return (
    <article className="pt-28 pb-16 sm:pt-32 sm:pb-24">
      <JsonLd data={articleJsonLd} />
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

        {related.length > 0 && (
          <nav aria-labelledby="related-heading" className="mt-16 border-t border-slate-200 pt-10">
            <h2
              id="related-heading"
              className="font-display text-xl font-bold tracking-tight text-navy-950"
            >
              {t("related")}
            </h2>
            <ul className="mt-5 space-y-4">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="block rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
                  >
                    <span lang="es" className="font-display text-base font-bold text-navy-950">
                      {p.title}
                    </span>
                    <span lang="es" className="mt-1 block text-sm text-slate-500 leading-relaxed">
                      {p.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <aside className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-center">
          <p className="font-display text-xl font-bold tracking-tight text-navy-950">
            {t("ctaTitle")}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-500 leading-relaxed">
            {t("ctaSub")}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-navy-900 px-6 text-sm font-bold text-white transition-colors hover:bg-navy-800"
          >
            {t("ctaButton")}
          </Link>
        </aside>
      </div>
    </article>
  );
}
