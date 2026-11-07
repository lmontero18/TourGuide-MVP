// Destino del CTA "Agenda una demo" de la landing. Con NEXT_PUBLIC_DEMO_WHATSAPP
// (solo digitos, con codigo de pais) abre un chat de WhatsApp con mensaje
// prellenado; sin la variable cae al correo de contacto. Tambien lo usa el
// boton "Pasar a Pro" del candado (CODE-202).
import { CONTACT_EMAIL } from "@/lib/legal";

export function demoLink(message: string, subject = "Demo Tourfy"): { href: string; external: boolean } {
  const phone = process.env.NEXT_PUBLIC_DEMO_WHATSAPP?.replace(/\D/g, "");
  if (phone) {
    return { href: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`, external: true };
  }
  return {
    href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
    external: false,
  };
}
