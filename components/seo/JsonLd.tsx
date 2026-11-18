import { serializeJsonLd } from "@/lib/seo";

interface JsonLdProps {
  data: Record<string, unknown>;
}

// Datos estructurados (schema.org) en el HTML inicial, renderizados en el
// servidor. Va en el page.tsx, no en el <head>: Google los lee igual.
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
