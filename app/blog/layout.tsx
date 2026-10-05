import { Navbar } from "../(marketing)/components/Navbar";
import { Footer } from "../(marketing)/components/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
