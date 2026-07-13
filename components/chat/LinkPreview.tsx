"use client";

import { useEffect, useState } from "react";

interface OgPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

interface LinkPreviewProps {
  url: string;
}

// Cache en memoria por sesión de página — evita re-fetchear la misma URL
// cada vez que la lista de mensajes re-renderiza.
const previewCache = new Map<string, OgPreview | null>();

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [preview, setPreview] = useState<OgPreview | null | undefined>(
    previewCache.has(url) ? previewCache.get(url) : undefined
  );
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) return;
    let cancelled = false;
    fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : { preview: null }))
      .then(({ preview }: { preview: OgPreview | null }) => {
        previewCache.set(url, preview);
        if (!cancelled) setPreview(preview);
      })
      .catch(() => {
        previewCache.set(url, null);
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!preview) return null;

  let domain = "";
  try {
    domain = new URL(preview.url).hostname.replace(/^www\./, "");
  } catch {
    domain = preview.url;
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mb-1.5 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors max-w-xs"
    >
      {preview.image && !imgFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- imagen externa arbitraria, no optimizable por next/image
        <img
          src={preview.image}
          alt={preview.title ?? "Link preview"}
          className="w-full max-h-40 object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      )}
      <div className="px-2.5 py-2">
        {preview.title && (
          <p className="text-xs font-semibold text-navy-900 line-clamp-2">{preview.title}</p>
        )}
        {preview.description && (
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{preview.description}</p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">{preview.siteName ?? domain}</p>
      </div>
    </a>
  );
}
