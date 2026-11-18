import { Navbar } from "../(marketing)/components/Navbar";
import { Footer } from "../(marketing)/components/Footer";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PUBLIC_DEFAULT_LOCALE } from "@/i18n/routing";

export default async function BlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Por ahora los posts existen solo en español: /en/blog no existe (404)
  // hasta que haya posts en ingles. Ver BLOG_LOCALES en lib/seo.ts.
  const { locale } = await params;
  if (locale !== PUBLIC_DEFAULT_LOCALE) notFound();

  // El blog no esta en el route group (marketing): sin este AuthProvider el
  // Navbar (UserMenu usa useAuth) tiraba y /blog respondia 500.
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
