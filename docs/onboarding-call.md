# Llamada de onboarding — checklist

Los primeros ~20 clientes se activan a mano en una llamada (30–45 min) en vez de
con un onboarding automático. Esta lista es para que cualquiera del equipo lo haga
igual cada vez. Compartir pantalla con la agencia durante toda la llamada.

---

## Antes de la llamada (pedírselo a la agencia por correo/WhatsApp)

- [ ] **Facebook personal** de quien administra el negocio (tiene que poder entrar a
      business.facebook.com como admin del portafolio comercial, o crearlo en la llamada).
- [ ] **Número de WhatsApp** que va a usar el bot:
  - Si hoy lo usan en la **app WhatsApp Business** (v2.24.17+): se conecta con
    **coexistencia** (CODE-190) y siguen usándolo en el celular. Lo que respondan desde
    ahí aparece en Tourfy y pausa el bot en esa conversación. Avisarles: se apagan
    difusiones, mensajes temporales y editar/borrar; hay que abrir la app al menos cada
    14 días; para desconectar, desde la app (Ajustes → Cuenta → Plataforma de negocios).
  - Si lo usan en **WhatsApp normal** (no Business): pasarlo primero a la app Business,
    o borrarlo de la app y conectarlo solo a la API.
  - Tiene que poder recibir un SMS o una llamada para el código de verificación.
- [ ] **Tarjeta** Visa, Mastercard o Amex habilitada para compras internacionales
      (Meta le cobra directo a la agencia; Tourfy nunca la ve).
- [ ] **Tours y precios**: URL del sitio web y/o tarifario en PDF o foto.
- [ ] **Correos de los agentes** que van a atender conversaciones.

## 1. Crear la cuenta (nosotros, antes o al inicio de la llamada)

El registro público está cerrado (ver `app/(auth)/login/actions.ts`).

- [ ] Supabase **prod** → Authentication → Users → **Invite user** con el correo del admin de la agencia.
- [ ] La agencia abre el correo → define su contraseña en `/set-password` → entra al onboarding.

## 2. Onboarding en Tourfy (la agencia, con nosotros guiando)

- [ ] **Tu agencia**: nombre, país, **zona horaria correcta** (ej. Nicaragua, no Lima)
      e idioma por defecto.
- [ ] **Conectar WhatsApp** (Embedded Signup):
  - Login con Facebook → elegir/crear portafolio → elegir/crear WABA → número → código SMS.
  - **En la última pantalla de Meta, tocar "Añadir método de pago"**, no "Finalizar".
    Si ya le dieron a Finalizar, se agrega en el paso 3.
  - Si sale "número ya conectado a otra cuenta": está en otra org de Tourfy, hay que
    desconectarlo allá primero.
- [ ] **Tours y preguntas frecuentes**: importar desde la web o subir el tarifario,
      revisar lo marcado como "Revisar" y corregir precios.

## 3. Método de pago en Meta

- [ ] Tourfy → Configuración → WhatsApp → **Facturación de WhatsApp** → "Métodos de pago en Meta".
- [ ] Agregar la tarjeta a nivel del negocio y después **asignarla a la cuenta de
      WhatsApp** ("Abrir WhatsApp Manager" → configuración de pago).
- [ ] Explicar costos: primeros 1.000 mensajes de servicio al mes gratis por número;
      las plantillas (mensajes fuera de las 24h) siempre se cobran.
- [ ] No podemos verificar la tarjeta desde Tourfy. Si Meta rechaza un envío por
      falta de pago (error 131042), aparece en rojo en esa misma sección y nos llega
      un aviso en Sentry.

## 4. Ajustes y equipo

- [ ] **Lo que sabe tu bot**: completar "Tu agencia" (formas de pago, políticas de
      cancelación, punto de encuentro, horarios).
- [ ] **Configuración**: tono del bot, saludo, horario de atención.
- [ ] **Agentes**: invitar a cada agente por correo (rol agente o admin).
- [ ] **Notificaciones**: que cada agente active sonido y notificaciones del navegador.

## 5. Prueba en vivo (no saltarse)

- [ ] Desde un celular que no sea el del negocio, escribirle al número: preguntar por
      un tour y su precio. El bot debe responder con los datos correctos.
- [ ] Pedir hablar con una persona → la conversación queda "Esperando agente" y suena
      la notificación → un agente toma el control y responde desde el panel.
- [ ] Devolver la conversación al bot y resolverla.
- [ ] (Opcional) Crear una plantilla en **Plantillas** para retomar clientes; Meta la
      revisa en hasta 24h.

## 6. Después de la llamada

- [ ] Revisar en el panel que lleguen conversaciones reales durante las primeras 24–48h.
- [ ] Mirar Sentry por errores con el `org_id` de la agencia.
- [ ] Seguimiento a los 3 días: ¿el bot está respondiendo bien? ¿falta algún tour o
      pregunta frecuente?
- [ ] Anotar dónde se trabó la agencia: es la base para automatizar el onboarding después.
