import { AuthProvider } from "@/components/providers/AuthProvider";

// AuthProvider por route group (no en el layout raiz): el login es una server
// action con redirect del lado del cliente, y un provider raiz no se
// re-montaria — no se enteraria de la sesion nueva hasta recargar.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
