"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string }; status?: string }) => void,
        params: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface SessionInfo {
  phone_number_id: string;
  waba_id: string;
}

interface Props {
  onConnected?: (account: { phone_number: string; status: string }) => void;
}

type SignupEvent = "FINISH" | "CANCEL" | "ERROR";

export default function ConnectWhatsAppButton({ onConnected }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionInfoRef = useRef<SessionInfo | null>(null);
  const lastEventRef = useRef<SignupEvent | null>(null);

  const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
  const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID;

  useEffect(() => {
    if (!APP_ID) return;
    if (window.FB) {
      setSdkReady(true);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: APP_ID,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      setSdkReady(true);
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [APP_ID]);

  // Meta sends session_info via window.postMessage during the embedded signup flow
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.origin.endsWith("facebook.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

        lastEventRef.current = data.event as SignupEvent;
        if (data.event === "FINISH") {
          sessionInfoRef.current = {
            phone_number_id: data.data.phone_number_id,
            waba_id: data.data.waba_id,
          };
        }
        // CANCEL / ERROR: el usuario cerró el popup o Meta reportó un error.
        // Lo manejamos en el callback de FB.login con feedback diferenciado.
      } catch {
        // Not JSON or irrelevant message — ignore
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleConnect = () => {
    if (!window.FB || !CONFIG_ID) {
      toast.error("WhatsApp setup is not configured yet.");
      return;
    }

    setLoading(true);
    lastEventRef.current = null;

    // FB.login NO acepta un callback async ("Expression is of type asyncfunction,
    // not function"), así que el trabajo async va en una función aparte y el callback
    // solo la dispara.
    const finishLogin = async (response: { authResponse?: { code?: string }; status?: string }) => {
      try {
        const code = response.authResponse?.code;
        const session = sessionInfoRef.current;

        // El usuario cerró el popup a mitad de camino.
        if (lastEventRef.current === "CANCEL") {
          toast.info("Conexión cancelada.");
          return;
        }

        // Meta reportó un error, o la sesión quedó incompleta.
        if (lastEventRef.current === "ERROR" || !code || !session) {
          toast.error(
            "No se pudo completar la conexión con Meta. Probá de nuevo o usá la conexión manual.",
          );
          return;
        }

        const res = await fetch("/api/whatsapp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            waba_id: session.waba_id,
            phone_number_id: session.phone_number_id,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          toast.error(
            result.error
              ? `${result.error}. Si sigue fallando, probá la conexión manual.`
              : "No se pudo conectar WhatsApp. Probá la conexión manual.",
          );
          return;
        }

        toast.success(`WhatsApp conectado: ${result.account.phone_number}`);
        onConnected?.(result.account);
      } finally {
        setLoading(false);
        sessionInfoRef.current = null;
        lastEventRef.current = null;
      }
    };

    window.FB.login(
      (response) => {
        void finishLogin(response);
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const disabled = !sdkReady || loading || !APP_ID || !CONFIG_ID;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={disabled}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#166FE0] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z" />
        </svg>
        {loading ? "Conectando..." : "Connect with Facebook"}
      </button>

      {/* Aviso de popup: FB.login abre una ventana flotante; si el navegador la
          bloquea, cae a pestaña o no abre nada. Guiamos al usuario. */}
      {loading ? (
        <p className="text-[11px] text-amber-600">
          Se abrió una ventana de Facebook. Si no la ves, permití los popups para este sitio y volvé a intentar.
        </p>
      ) : (
        <p className="text-[11px] text-slate-400">
          Se abrirá una ventana de Facebook. Si tu navegador bloquea los popups, permitilos para este sitio.
        </p>
      )}
    </div>
  );
}
