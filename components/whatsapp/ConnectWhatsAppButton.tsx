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

export default function ConnectWhatsAppButton({ onConnected }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionInfoRef = useRef<SessionInfo | null>(null);

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
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          sessionInfoRef.current = {
            phone_number_id: data.data.phone_number_id,
            waba_id: data.data.waba_id,
          };
        }
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

    window.FB.login(
      async (response) => {
        try {
          const code = response.authResponse?.code;
          const session = sessionInfoRef.current;

          if (!code || !session) {
            toast.error("Signup was cancelled or incomplete.");
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
            toast.error(result.error ?? "Failed to connect WhatsApp");
            return;
          }

          toast.success(`WhatsApp connected: ${result.account.phone_number}`);
          onConnected?.(result.account);
        } finally {
          setLoading(false);
          sessionInfoRef.current = null;
        }
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
    <button
      type="button"
      onClick={handleConnect}
      disabled={disabled}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#166FE0] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12z" />
      </svg>
      {loading ? "Connecting..." : "Connect with Facebook"}
    </button>
  );
}
