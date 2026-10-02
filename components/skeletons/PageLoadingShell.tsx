import TopBar from "@/components/layout/TopBar";

interface PageLoadingShellProps {
  title: string;
  /** Placeholders de las acciones que la pagina real pone en el TopBar. */
  actions?: React.ReactNode;
  /** Clases del area con scroll; deben coincidir con las de la pagina real. */
  bodyClassName?: string;
  children: React.ReactNode;
}

// Estructura comun de las paginas del dashboard (TopBar + area con scroll) para
// los loading.tsx: el skeleton queda exactamente donde va el contenido real.
export default function PageLoadingShell({
  title,
  actions,
  bodyClassName = "flex-1 overflow-y-auto p-5",
  children,
}: PageLoadingShellProps) {
  return (
    <div className="flex h-full flex-col">
      <TopBar title={title}>{actions}</TopBar>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
