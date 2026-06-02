import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

// TODO: reemplazar por los datos reales antes de enviar a App Review de Meta.
const CONTACT_EMAIL = "naia@naiaautomate.com";
const UPDATED_EN = "June 2, 2026";
const UPDATED_ES = "2 de junio de 2026";

export const metadata: Metadata = {
  title: "Data Deletion — TourGuide",
  description: "How to request deletion of your data from TourGuide.",
};

const H1 = "font-display text-3xl sm:text-4xl font-bold tracking-tight text-navy-900";
const H2 = "font-display text-xl font-bold text-navy-900 mt-10 mb-3";
const P = "text-sm sm:text-base text-slate-600 leading-relaxed mb-3";
const OL = "list-decimal pl-5 space-y-1.5 text-sm sm:text-base text-slate-600 mb-3";
const UL = "list-disc pl-5 space-y-1.5 text-sm sm:text-base text-slate-600 mb-3";
const A = "text-blue-600 hover:text-blue-700 underline underline-offset-2";

export default async function DataDeletionPage() {
  const locale = await getLocale();
  const isEs = locale === "es";

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <article className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        {isEs ? <DeletionEs /> : <DeletionEn />}
      </article>
      <Footer />
    </main>
  );
}

function DeletionEn() {
  return (
    <>
      <h1 className={H1}>Data Deletion</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {UPDATED_EN}</p>

      <p className={`${P} mt-6`}>
        This page explains how to delete the data TourGuide holds about you or your organization,
        including data processed through the WhatsApp Business / Cloud API.
      </p>

      <h2 className={H2}>Disconnect your WhatsApp number</h2>
      <p className={P}>
        To stop processing WhatsApp data immediately, an admin can disconnect the number from{" "}
        <strong>Settings → WhatsApp → Disconnect</strong>. This unsubscribes our app from your
        WhatsApp Business Account so we stop receiving messages.
      </p>

      <h2 className={H2}>Request full deletion</h2>
      <p className={P}>To request deletion of your account and associated data:</p>
      <ol className={OL}>
        <li>
          Email us at{" "}
          <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email
          address associated with your account.
        </li>
        <li>Use the subject line <strong>&ldquo;Data deletion request&rdquo;</strong>.</li>
        <li>Tell us your organization name (and phone number if it relates to WhatsApp data).</li>
      </ol>

      <h2 className={H2}>What we delete</h2>
      <ul className={UL}>
        <li>Your account profile and organization settings.</li>
        <li>Tours, prices, FAQs and bot configuration.</li>
        <li>Contacts, conversations and messages, including WhatsApp data.</li>
        <li>The WhatsApp connection record for your organization.</li>
      </ul>

      <h2 className={H2}>Timeframe</h2>
      <p className={P}>
        We confirm and complete deletion requests within <strong>30 days</strong>. Some records may
        be retained longer only where required to meet legal or accounting obligations, after which
        they are deleted or anonymized.
      </p>

      <h2 className={H2}>Contact</h2>
      <p className={P}>
        Questions:{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{" "}
        <a className={A} href="/privacy">Privacy Policy</a>.
      </p>
    </>
  );
}

function DeletionEs() {
  return (
    <>
      <h1 className={H1}>Eliminación de datos</h1>
      <p className="mt-2 text-sm text-slate-400">Última actualización: {UPDATED_ES}</p>

      <p className={`${P} mt-6`}>
        Esta página explica cómo eliminar los datos que TourGuide tiene sobre vos o tu organización,
        incluidos los datos procesados a través de la API de WhatsApp Business / Cloud.
      </p>

      <h2 className={H2}>Desconectar tu número de WhatsApp</h2>
      <p className={P}>
        Para dejar de procesar datos de WhatsApp de inmediato, un administrador puede desconectar el
        número desde <strong>Configuración → WhatsApp → Desconectar</strong>. Esto cancela la
        suscripción de nuestra app a tu cuenta de WhatsApp Business y dejamos de recibir mensajes.
      </p>

      <h2 className={H2}>Solicitar la eliminación completa</h2>
      <p className={P}>Para solicitar la eliminación de tu cuenta y los datos asociados:</p>
      <ol className={OL}>
        <li>
          Escribinos a{" "}
          <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> desde el email
          asociado a tu cuenta.
        </li>
        <li>Usá el asunto <strong>&ldquo;Solicitud de eliminación de datos&rdquo;</strong>.</li>
        <li>Indicanos el nombre de tu organización (y el número si se relaciona con datos de WhatsApp).</li>
      </ol>

      <h2 className={H2}>Qué eliminamos</h2>
      <ul className={UL}>
        <li>Tu perfil de cuenta y la configuración de la organización.</li>
        <li>Tours, precios, FAQs y configuración del bot.</li>
        <li>Contactos, conversaciones y mensajes, incluidos los datos de WhatsApp.</li>
        <li>El registro de conexión de WhatsApp de tu organización.</li>
      </ul>

      <h2 className={H2}>Plazos</h2>
      <p className={P}>
        Confirmamos y completamos las solicitudes de eliminación en un plazo de <strong>30 días</strong>.
        Algunos registros pueden conservarse más tiempo solo cuando sea necesario para cumplir
        obligaciones legales o contables, tras lo cual se eliminan o anonimizan.
      </p>

      <h2 className={H2}>Contacto</h2>
      <p className={P}>
        Consultas:{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Mirá también nuestra{" "}
        <a className={A} href="/privacy">Política de privacidad</a>.
      </p>
    </>
  );
}
