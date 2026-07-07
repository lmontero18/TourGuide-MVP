import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Posts del blog: archivos .mdx versionados en el repo (app/blog/posts/).
// Sin CMS ni tabla — cada post entra por PR como cualquier cambio de codigo.

const POSTS_DIR = path.join(process.cwd(), "app", "blog", "posts");

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO yyyy-mm-dd
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
      const { data } = matter(raw);
      return {
        slug: data.slug ?? file.replace(/\.mdx$/, ""),
        title: data.title ?? "",
        description: data.description ?? "",
        date: data.date ?? "",
      } satisfies PostMeta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): PostMeta | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}
