import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

// TODO: reemplazar por los datos reales antes de enviar a App Review de Meta.
const LEGAL_NAME = "3-102-943883 Sociedad de Responsabilidad Limitada";
const CONTACT_EMAIL = "naia@naiaautomate.com";
const UPDATED_EN = "June 2, 2026";
const UPDATED_ES = "2 de junio de 2026";

export const metadata: Metadata = {
  title: "Privacy Policy — TourGuide",
  description: "How TourGuide collects, uses and protects data.",
};

const H1 = "font-display text-3xl sm:text-4xl font-bold tracking-tight text-navy-900";
const H2 = "font-display text-xl font-bold text-navy-900 mt-10 mb-3";
const P = "text-sm sm:text-base text-slate-600 leading-relaxed mb-3";
const UL = "list-disc pl-5 space-y-1.5 text-sm sm:text-base text-slate-600 mb-3";
const A = "text-blue-600 hover:text-blue-700 underline underline-offset-2";

export default async function PrivacyPage() {
  const locale = await getLocale();
  const isEs = locale === "es";

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <article className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        {isEs ? <PrivacyEs /> : <PrivacyEn />}
      </article>
      <Footer />
    </main>
  );
}

function PrivacyEn() {
  return (
    <>
      <h1 className={H1}>Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {UPDATED_EN}</p>

      <p className={`${P} mt-6`}>
        {LEGAL_NAME} (&ldquo;TourGuide&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a
        multi-tenant platform that lets tourism agencies operate WhatsApp bots, manage conversations
        and measure results. This policy explains what data we collect, how we use it, and the rights
        you have. It applies to our website, dashboard and APIs.
      </p>

      <h2 className={H2}>1. Who is responsible</h2>
      <p className={P}>
        For account and billing data, {LEGAL_NAME} is the data controller. For end-customer
        conversations that flow through an agency&rsquo;s WhatsApp number, the agency is the
        controller and TourGuide acts as a processor on its behalf.
      </p>

      <h2 className={H2}>2. Data we collect</h2>
      <ul className={UL}>
        <li><strong>Account data:</strong> name, email, organization, role.</li>
        <li><strong>Business content:</strong> tours, prices, FAQs and bot configuration you provide
          or import (from your website or price lists).</li>
        <li><strong>WhatsApp data:</strong> when you connect a WhatsApp Business number, we process
          messages, phone numbers, WhatsApp profile names and message metadata of the people who
          contact that number, in order to deliver the conversation and bot features.</li>
        <li><strong>Usage data:</strong> logs, device/browser information and metrics needed to run
          and secure the service.</li>
        <li><strong>Billing data:</strong> subscription status (payment details are handled by our
          payment processor).</li>
      </ul>

      <h2 className={H2}>3. How we use data</h2>
      <ul className={UL}>
        <li>To provide the bot, live chat, dashboard and metrics.</li>
        <li>To send and receive WhatsApp messages through the Meta WhatsApp Cloud API.</li>
        <li>To generate your bot&rsquo;s knowledge from the content you import.</li>
        <li>To secure, maintain, debug and improve the service.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2 className={H2}>4. Service providers</h2>
      <p className={P}>We share data only with providers that help us run the service:</p>
      <ul className={UL}>
        <li><strong>Meta Platforms</strong> — WhatsApp Business / Cloud API messaging.</li>
        <li><strong>Supabase</strong> — database, authentication and storage.</li>
        <li><strong>OpenAI</strong> — extracting tours/FAQs from the content you import.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
        <li><strong>Stripe</strong> — subscription billing.</li>
      </ul>
      <p className={P}>We do not sell your personal data.</p>

      <h2 className={H2}>5. Data retention</h2>
      <p className={P}>
        We keep data while your account is active and as needed to provide the service. When you or
        your agency delete content, or close the account, we delete or anonymize the associated data
        within a reasonable period, unless we must retain it to meet legal obligations.
      </p>

      <h2 className={H2}>6. Your rights & data deletion</h2>
      <p className={P}>
        You can access, correct or delete your data. To request deletion of your data, follow the
        instructions on our{" "}
        <a className={A} href="/data-deletion">Data Deletion</a> page, or contact us at{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 className={H2}>7. Security</h2>
      <p className={P}>
        We apply technical and organizational measures (encrypted transport, row-level access
        controls and least-privilege credentials) to protect your data. No method of transmission or
        storage is 100% secure.
      </p>

      <h2 className={H2}>8. Changes</h2>
      <p className={P}>
        We may update this policy. We will post the new version here and update the date above.
      </p>

      <h2 className={H2}>9. Contact</h2>
      <p className={P}>
        Questions about this policy:{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}

function PrivacyEs() {
  return (
    <>
      <h1 className={H1}>Política de privacidad</h1>
      <p className="mt-2 text-sm text-slate-400">Última actualización: {UPDATED_ES}</p>

      <p className={`${P} mt-6`}>
        {LEGAL_NAME} (&ldquo;TourGuide&rdquo;, &ldquo;nosotros&rdquo;) ofrece una plataforma
        multiempresa que permite a agencias de turismo operar bots de WhatsApp, gestionar
        conversaciones y medir resultados. Esta política explica qué datos recopilamos, cómo los
        usamos y qué derechos tenés. Aplica a nuestro sitio web, panel y APIs.
      </p>

      <h2 className={H2}>1. Quién es responsable</h2>
      <p className={P}>
        Para los datos de cuenta y facturación, {LEGAL_NAME} es el responsable del tratamiento. Para
        las conversaciones de clientes finales que pasan por el número de WhatsApp de una agencia, la
        agencia es la responsable y TourGuide actúa como encargado del tratamiento en su nombre.
      </p>

      <h2 className={H2}>2. Datos que recopilamos</h2>
      <ul className={UL}>
        <li><strong>Datos de cuenta:</strong> nombre, email, organización, rol.</li>
        <li><strong>Contenido del negocio:</strong> tours, precios, FAQs y configuración del bot que
          cargás o importás (desde tu sitio web o tarifarios).</li>
        <li><strong>Datos de WhatsApp:</strong> cuando conectás un número de WhatsApp Business,
          procesamos los mensajes, números de teléfono, nombres de perfil de WhatsApp y metadatos de
          los mensajes de las personas que escriben a ese número, para poder brindar la conversación
          y las funciones del bot.</li>
        <li><strong>Datos de uso:</strong> registros, información del dispositivo/navegador y métricas
          necesarias para operar y proteger el servicio.</li>
        <li><strong>Datos de facturación:</strong> estado de la suscripción (los datos de pago los
          maneja nuestro procesador de pagos).</li>
      </ul>

      <h2 className={H2}>3. Cómo usamos los datos</h2>
      <ul className={UL}>
        <li>Para brindar el bot, el chat en vivo, el panel y las métricas.</li>
        <li>Para enviar y recibir mensajes de WhatsApp mediante la API de WhatsApp Cloud de Meta.</li>
        <li>Para generar el conocimiento de tu bot a partir del contenido que importás.</li>
        <li>Para asegurar, mantener, depurar y mejorar el servicio.</li>
        <li>Para cumplir obligaciones legales.</li>
      </ul>

      <h2 className={H2}>4. Proveedores de servicio</h2>
      <p className={P}>Compartimos datos solo con proveedores que nos ayudan a operar el servicio:</p>
      <ul className={UL}>
        <li><strong>Meta Platforms</strong> — mensajería de WhatsApp Business / Cloud API.</li>
        <li><strong>Supabase</strong> — base de datos, autenticación y almacenamiento.</li>
        <li><strong>OpenAI</strong> — extracción de tours/FAQs del contenido que importás.</li>
        <li><strong>Vercel</strong> — hosting de la aplicación.</li>
        <li><strong>Stripe</strong> — facturación de suscripciones.</li>
      </ul>
      <p className={P}>No vendemos tus datos personales.</p>

      <h2 className={H2}>5. Conservación de datos</h2>
      <p className={P}>
        Conservamos los datos mientras tu cuenta esté activa y lo necesario para brindar el servicio.
        Cuando vos o tu agencia eliminan contenido, o cierran la cuenta, eliminamos o anonimizamos los
        datos asociados en un plazo razonable, salvo que debamos conservarlos por obligaciones legales.
      </p>

      <h2 className={H2}>6. Tus derechos y eliminación de datos</h2>
      <p className={P}>
        Podés acceder, corregir o eliminar tus datos. Para solicitar la eliminación, seguí las
        instrucciones de nuestra página de{" "}
        <a className={A} href="/data-deletion">Eliminación de datos</a>, o escribinos a{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 className={H2}>7. Seguridad</h2>
      <p className={P}>
        Aplicamos medidas técnicas y organizativas (transporte cifrado, control de acceso a nivel de
        fila y credenciales de mínimo privilegio) para proteger tus datos. Ningún método de
        transmisión o almacenamiento es 100% seguro.
      </p>

      <h2 className={H2}>8. Cambios</h2>
      <p className={P}>
        Podemos actualizar esta política. Publicaremos la nueva versión acá y actualizaremos la fecha
        de arriba.
      </p>

      <h2 className={H2}>9. Contacto</h2>
      <p className={P}>
        Consultas sobre esta política:{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
