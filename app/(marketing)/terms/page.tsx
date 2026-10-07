import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

// Entidad que factura (Stripe) y con la que contrata la agencia.
const LEGAL_NAME = "NOMADAI LLC";
const LEGAL_ADDRESS = "30 North Gould Street, Ste N, Sheridan, Wyoming 82801, USA";
const CONTACT_EMAIL = "naia@naiaautomate.com";
const UPDATED_EN = "October 7, 2026";
const UPDATED_ES = "7 de octubre de 2026";

export async function generateMetadata(): Promise<Metadata> {
  const isEs = (await getLocale()) === "es";
  return isEs
    ? {
        title: "Términos y condiciones · Tourfy",
        description: "Condiciones de uso y de la suscripción a Tourfy.",
      }
    : {
        title: "Terms of Service · Tourfy",
        description: "Terms of use and subscription terms for Tourfy.",
      };
}

const H1 = "font-display text-3xl sm:text-4xl font-bold tracking-tight text-navy-900";
const H2 = "font-display text-xl font-bold text-navy-900 mt-10 mb-3";
const P = "text-sm sm:text-base text-slate-600 leading-relaxed mb-3";
const UL = "list-disc pl-5 space-y-1.5 text-sm sm:text-base text-slate-600 mb-3";
const A = "text-blue-600 hover:text-blue-700 underline underline-offset-2";

export default async function TermsPage() {
  const locale = await getLocale();
  const isEs = locale === "es";

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <article className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
        {isEs ? <TermsEs /> : <TermsEn />}
      </article>
      <Footer />
    </main>
  );
}

function TermsEs() {
  return (
    <>
      <h1 className={H1}>Términos y condiciones</h1>
      <p className="mt-2 text-sm text-slate-400">Última actualización: {UPDATED_ES}</p>

      <p className={`${P} mt-6`}>
        Estos términos regulan el uso de Tourfy, un servicio de {LEGAL_NAME} ({LEGAL_ADDRESS})
        (&ldquo;Tourfy&rdquo;, &ldquo;nosotros&rdquo;). Al crear una cuenta, usar el servicio o
        pagar la suscripción, la agencia o empresa que contrata (&ldquo;el cliente&rdquo;, &ldquo;tú&rdquo;)
        acepta estos términos. Si los aceptas en nombre de una empresa, declaras que tienes
        autoridad para hacerlo.
      </p>

      <h2 className={H2}>1. El servicio</h2>
      <p className={P}>
        Tourfy permite a agencias de turismo conectar su número de WhatsApp Business a un asistente
        con inteligencia artificial que responde consultas de sus clientes, registra leads y permite
        que el equipo de la agencia tome el control de las conversaciones desde un panel web. Las
        funciones disponibles pueden cambiar con el tiempo; cuando quitemos algo importante, te
        avisaremos con anticipación razonable.
      </p>

      <h2 className={H2}>2. Cuenta y usuarios</h2>
      <ul className={UL}>
        <li>Eres responsable de la información de tu cuenta y de lo que hagan los usuarios que
          invites a tu organización.</li>
        <li>Mantén tus credenciales seguras y avísanos si sospechas un acceso no autorizado.</li>
        <li>Debes tener al menos 18 años y usar el servicio con fines comerciales.</li>
      </ul>

      <h2 className={H2}>3. Precio y facturación</h2>
      <ul className={UL}>
        <li>La suscripción cuesta <strong>US$500 por mes</strong>, salvo que acordemos otro precio
          por escrito. Se cobra por adelantado al inicio de cada período mensual.</li>
        <li>Los pagos se procesan con Stripe. La suscripción se <strong>renueva automáticamente</strong> cada
          mes hasta que la canceles.</li>
        <li>Los precios no incluyen impuestos de tu país. Si alguna ley local te obliga a pagar,
          retener o autoliquidar impuestos sobre servicios del exterior, eso corre por tu cuenta.</li>
        <li>Podemos cambiar el precio con al menos <strong>30 días</strong> de aviso por email. El
          nuevo precio aplica desde el siguiente período de facturación.</li>
      </ul>

      <h2 className={H2}>4. Cancelación y reembolsos</h2>
      <ul className={UL}>
        <li>Puedes cancelar en cualquier momento escribiéndonos o desde el portal de facturación. La
          cancelación aplica al final del período ya pagado y el servicio sigue activo hasta esa
          fecha.</li>
        <li>No hacemos reembolsos por períodos parciales ni por meses no usados, salvo que la ley
          aplicable lo exija o que lo acordemos por escrito.</li>
        <li>Si un pago falla, Stripe lo reintentará y te avisaremos. Si la deuda sigue sin pagarse
          <strong> 15 días</strong> después del vencimiento, podemos suspender el servicio hasta que
          se regularice.</li>
      </ul>

      <h2 className={H2}>5. WhatsApp y costos de Meta</h2>
      <ul className={UL}>
        <li>Tu número de WhatsApp Business y tu cuenta de WhatsApp Business (WABA) son tuyos.
          Tourfy se conecta a ellos mediante la API oficial de Meta.</li>
        <li>Meta cobra directamente a tu método de pago los mensajes que correspondan según sus
          tarifas (por ejemplo, plantillas o mensajes fuera de la ventana gratuita). Esos cargos
          <strong> no están incluidos</strong> en la suscripción de Tourfy.</li>
        <li>Debes cumplir las políticas de WhatsApp Business y de comercio de Meta. Si Meta limita,
          suspende o bloquea tu número o tu cuenta, no seremos responsables, aunque te ayudaremos en
          lo que esté a nuestro alcance.</li>
      </ul>

      <h2 className={H2}>6. Uso aceptable</h2>
      <p className={P}>No puedes usar Tourfy para:</p>
      <ul className={UL}>
        <li>Enviar spam o mensajes a personas que no dieron su consentimiento.</li>
        <li>Ofrecer productos o servicios ilegales, engañosos o prohibidos por las políticas de Meta.</li>
        <li>Intentar acceder a datos de otras agencias, vulnerar la seguridad o sobrecargar el
          servicio.</li>
        <li>Revender el servicio sin nuestro permiso por escrito.</li>
      </ul>
      <p className={P}>
        Aplicamos límites automáticos contra abuso. Podemos suspender una cuenta que incumpla esta
        sección, avisándote cuando sea posible.
      </p>

      <h2 className={H2}>7. Inteligencia artificial</h2>
      <ul className={UL}>
        <li>El asistente genera respuestas automáticas a partir de la información que cargas (tours,
          precios, políticas, preguntas frecuentes). Puede equivocarse u omitir información.</li>
        <li>Eres responsable de mantener esa información actualizada y de revisar las conversaciones
          importantes. Las respuestas del asistente no son ofertas vinculantes: las reservas, precios
          y condiciones finales los confirma tu agencia.</li>
        <li>Puedes tomar el control de cualquier conversación desde el panel en cualquier momento.</li>
      </ul>

      <h2 className={H2}>8. Tu contenido y tus datos</h2>
      <ul className={UL}>
        <li>El contenido que cargas y las conversaciones con tus clientes son tuyos. Nos das permiso
          para usarlos solo para operar, mantener y mejorar el servicio para ti.</li>
        <li>Respecto de los datos de tus clientes finales, tú eres el responsable del tratamiento y
          Tourfy actúa como encargado en tu nombre. Debes contar con una base legal para tratar esos
          datos y cumplir las leyes de protección de datos que te apliquen.</li>
        <li>El tratamiento de datos se describe en nuestra{" "}
          <a className={A} href="/privacy">Política de privacidad</a>.</li>
      </ul>

      <h2 className={H2}>9. Disponibilidad</h2>
      <p className={P}>
        Trabajamos para que Tourfy esté disponible de forma continua, pero no garantizamos un
        servicio ininterrumpido ni libre de errores. El servicio depende de terceros como Meta,
        OpenAI, Supabase y Vercel, cuyas fallas pueden afectarlo. El servicio se ofrece &ldquo;tal
        cual&rdquo;, en la medida que lo permita la ley.
      </p>

      <h2 className={H2}>10. Limitación de responsabilidad</h2>
      <p className={P}>
        En la máxima medida permitida por la ley, Tourfy no será responsable por daños indirectos,
        lucro cesante, pérdida de ventas o reservas, ni pérdida de datos derivados del uso del
        servicio. Nuestra responsabilidad total por cualquier reclamo se limita al monto que nos
        hayas pagado en los <strong>3 meses</strong> anteriores al hecho que lo origina.
      </p>

      <h2 className={H2}>11. Terminación</h2>
      <p className={P}>
        Cualquiera de las partes puede terminar la relación cancelando la suscripción. Al terminar,
        dejarás de tener acceso al panel. Puedes pedirnos la exportación de tus leads antes de
        cancelar y la eliminación de tus datos según nuestra página de{" "}
        <a className={A} href="/data-deletion">Eliminación de datos</a>.
      </p>

      <h2 className={H2}>12. Cambios a estos términos</h2>
      <p className={P}>
        Podemos actualizar estos términos. Si el cambio es importante, te avisaremos por email con al
        menos 15 días de anticipación. Seguir usando el servicio después de esa fecha implica que
        aceptas la nueva versión.
      </p>

      <h2 className={H2}>13. Ley aplicable</h2>
      <p className={P}>
        Estos términos se rigen por las leyes del Estado de Wyoming, Estados Unidos. Antes de
        cualquier reclamo formal, las partes intentarán resolver la diferencia de buena fe por email
        durante al menos 30 días.
      </p>

      <h2 className={H2}>14. Contacto</h2>
      <p className={P}>
        {LEGAL_NAME} · {LEGAL_ADDRESS} ·{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}

function TermsEn() {
  return (
    <>
      <h1 className={H1}>Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {UPDATED_EN}</p>

      <p className={`${P} mt-6`}>
        These terms govern the use of Tourfy, a service of {LEGAL_NAME} ({LEGAL_ADDRESS})
        (&ldquo;Tourfy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account, using
        the service or paying for a subscription, the agency or company that signs up (&ldquo;the
        customer&rdquo;, &ldquo;you&rdquo;) agrees to these terms. If you accept them on behalf of a
        company, you confirm you have authority to do so.
      </p>

      <h2 className={H2}>1. The service</h2>
      <p className={P}>
        Tourfy lets tourism agencies connect their WhatsApp Business number to an AI assistant that
        answers customer inquiries, records leads and lets the agency&rsquo;s team take over
        conversations from a web dashboard. Features may change over time; if we remove something
        significant, we will give you reasonable advance notice.
      </p>

      <h2 className={H2}>2. Account and users</h2>
      <ul className={UL}>
        <li>You are responsible for your account information and for the actions of the users you
          invite to your organization.</li>
        <li>Keep your credentials secure and tell us if you suspect unauthorized access.</li>
        <li>You must be at least 18 and use the service for business purposes.</li>
      </ul>

      <h2 className={H2}>3. Pricing and billing</h2>
      <ul className={UL}>
        <li>The subscription costs <strong>US$500 per month</strong>, unless we agree on a different
          price in writing. It is charged in advance at the start of each monthly period.</li>
        <li>Payments are processed by Stripe. The subscription <strong>renews automatically</strong> every
          month until you cancel.</li>
        <li>Prices exclude taxes in your country. If local law requires you to pay, withhold or
          self-assess taxes on foreign services, that is your responsibility.</li>
        <li>We may change the price with at least <strong>30 days</strong> notice by email. The new
          price applies from the next billing period.</li>
      </ul>

      <h2 className={H2}>4. Cancellation and refunds</h2>
      <ul className={UL}>
        <li>You can cancel at any time by contacting us or from the billing portal. Cancellation
          takes effect at the end of the period already paid, and the service stays active until
          then.</li>
        <li>We do not refund partial periods or unused months, unless applicable law requires it or
          we agree otherwise in writing.</li>
        <li>If a payment fails, Stripe will retry it and we will notify you. If the balance remains
          unpaid <strong>15 days</strong> after the due date, we may suspend the service until it is
          settled.</li>
      </ul>

      <h2 className={H2}>5. WhatsApp and Meta fees</h2>
      <ul className={UL}>
        <li>Your WhatsApp Business number and WhatsApp Business Account (WABA) belong to you. Tourfy
          connects to them through Meta&rsquo;s official API.</li>
        <li>Meta charges your payment method directly for messages billable under its rates (for
          example, templates or messages outside the free window). Those charges are <strong>not
          included</strong> in the Tourfy subscription.</li>
        <li>You must comply with Meta&rsquo;s WhatsApp Business and Commerce policies. If Meta
          limits, suspends or blocks your number or account, we are not liable, although we will
          help where we can.</li>
      </ul>

      <h2 className={H2}>6. Acceptable use</h2>
      <p className={P}>You may not use Tourfy to:</p>
      <ul className={UL}>
        <li>Send spam or message people who have not given consent.</li>
        <li>Offer illegal, misleading or Meta-prohibited products or services.</li>
        <li>Attempt to access other agencies&rsquo; data, breach security or overload the
          service.</li>
        <li>Resell the service without our written permission.</li>
      </ul>
      <p className={P}>
        We apply automatic abuse limits. We may suspend an account that breaches this section,
        notifying you when possible.
      </p>

      <h2 className={H2}>7. Artificial intelligence</h2>
      <ul className={UL}>
        <li>The assistant generates automatic replies from the information you provide (tours,
          prices, policies, FAQs). It can make mistakes or omit information.</li>
        <li>You are responsible for keeping that information up to date and reviewing important
          conversations. The assistant&rsquo;s replies are not binding offers: final bookings,
          prices and conditions are confirmed by your agency.</li>
        <li>You can take over any conversation from the dashboard at any time.</li>
      </ul>

      <h2 className={H2}>8. Your content and data</h2>
      <ul className={UL}>
        <li>The content you upload and the conversations with your customers are yours. You grant us
          permission to use them only to operate, maintain and improve the service for you.</li>
        <li>For your end customers&rsquo; data, you are the controller and Tourfy acts as a processor
          on your behalf. You must have a legal basis to process that data and comply with the data
          protection laws that apply to you.</li>
        <li>Data processing is described in our{" "}
          <a className={A} href="/privacy">Privacy Policy</a>.</li>
      </ul>

      <h2 className={H2}>9. Availability</h2>
      <p className={P}>
        We work to keep Tourfy continuously available, but we do not guarantee uninterrupted or
        error-free service. The service depends on third parties such as Meta, OpenAI, Supabase and
        Vercel, whose outages can affect it. The service is provided &ldquo;as is&rdquo; to the
        extent permitted by law.
      </p>

      <h2 className={H2}>10. Limitation of liability</h2>
      <p className={P}>
        To the maximum extent permitted by law, Tourfy is not liable for indirect damages, lost
        profits, lost sales or bookings, or data loss arising from use of the service. Our total
        liability for any claim is limited to the amount you paid us in the <strong>3 months</strong> before
        the event giving rise to it.
      </p>

      <h2 className={H2}>11. Termination</h2>
      <p className={P}>
        Either party may end the relationship by cancelling the subscription. On termination you
        lose access to the dashboard. You can ask us to export your leads before cancelling and to
        delete your data as described on our{" "}
        <a className={A} href="/data-deletion">Data Deletion</a> page.
      </p>

      <h2 className={H2}>12. Changes to these terms</h2>
      <p className={P}>
        We may update these terms. For significant changes we will notify you by email at least 15
        days in advance. Continuing to use the service after that date means you accept the new
        version.
      </p>

      <h2 className={H2}>13. Governing law</h2>
      <p className={P}>
        These terms are governed by the laws of the State of Wyoming, United States. Before any
        formal claim, the parties will try to resolve the dispute in good faith by email for at
        least 30 days.
      </p>

      <h2 className={H2}>14. Contact</h2>
      <p className={P}>
        {LEGAL_NAME} · {LEGAL_ADDRESS} ·{" "}
        <a className={A} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  );
}
