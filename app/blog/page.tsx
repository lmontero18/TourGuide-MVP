import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getAllPosts } from "@/lib/blog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "https://www.tourfy.app/blog" },
  };
}

export default async function BlogPage() {
  const t = await getTranslations("blog");
  const locale = await getLocale();
  const posts = getAllPosts();

  return (
    <section className="pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-500">
          {t("label")}
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-950">
          {t("title")}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-500 leading-relaxed">
          {t("sub")}
        </p>

        <div className="mt-10 space-y-5">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-slate-200/80 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5"
            >
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
              {/* Los posts estan escritos en español — lang explicito para
                  semantica/SEO cuando la UI esta en otro idioma */}
              <h2
                lang="es"
                className="mt-2 font-display text-xl font-bold text-navy-950 tracking-tight"
              >
                {post.title}
              </h2>
              <p lang="es" className="mt-2 text-sm text-slate-500 leading-relaxed">
                {post.description}
              </p>
              <span className="mt-4 inline-flex items-center text-sm font-semibold text-navy-900">
                {t("readMore")}
                <svg
                  className="ml-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
