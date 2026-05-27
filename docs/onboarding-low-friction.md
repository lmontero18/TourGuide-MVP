# Onboarding de baja fricción — TourGuide

> **Foco:** reducir la fricción del onboarding (carga de tours/FAQs) sin perder personalización, pensado para nuestro ICP.
> **Decisiones tomadas:** importar desde **web + PDF/tarifario** · precios y detalles en **formato libre** (no encasillar al operador).

---

## 0. Resumen

El onboarding pide al operador **crear desde cero** —tipear tour por tour, FAQ por FAQ— algo que **ya tiene** en su web y su tarifario. Esa es la fricción al 1000% que sentimos: le pedimos rehacer a mano un trabajo que ya hizo.

**El cambio de mentalidad:** de *"llená este formulario"* → a *"mostranos lo que ya usás, nosotros lo armamos, vos solo revisás"*.

**La solución en una línea: Importar → Revisar → Aprender.**

1. **Importar** la info desde la web y el tarifario del operador.
2. **Revisar** tarjetas ya pre-llenadas y editables — revisar *es* la personalización, y cuesta 10x menos que crear.
3. **Aprender** de las conversaciones reales: el bot detecta lo que no sabe y el operador lo completa una sola vez.

---

## 1. El ICP y dónde se concentra la fricción

**Quién es:** operador turístico en LATAM (Perú, México, Colombia…), no técnico, ocupado, vive en el celular. Ya responde las mismas preguntas 100 veces al día por WhatsApp. Tiene una web (aunque sea básica) y/o un **tarifario en PDF o foto**. Su oferta es compleja: day tours, paquetes multi-día, transfers, **precio local vs. extranjero**, descuentos de niños/grupos, variantes privado/compartido.

**Su recorrido:**

```
Registro → Onboarding → Conectar WhatsApp → EN VIVO → Monitorea/Toma control → Métricas
                ▲
          FRICCIÓN #1
        (cargar todo a mano)
```

La **Fricción #1** es la que más cansa y la que más gente hace abandonar el setup. Es el foco de este documento.

---

## 2. Por qué cansa tanto hoy

### 2.1 Le pedimos crear lo que ya existe
El paso "Tours y FAQs" arranca con tarjetas vacías y obliga a tipear nombre, precio, descripción, pregunta y respuesta — por cada ítem. Para un operador con 15 tours y 3 paquetes son decenas de campos a mano, desde una pantalla en blanco. Abrumador.

### 2.2 El formulario aplana su realidad
El tour tiene un solo campo de "precio". Pero su precio real es **"S/.180 locales · $320 extranjeros · niños -50% · privado +$80"**. Con un solo campo, el operador o pone un número incompleto (y el bot responde mal) o amontona todo en la descripción. Le pedimos que distorsione su negocio para que entre en nuestra caja.

### 2.3 Pantalla en blanco = parálisis
Empezar desde cero es la peor experiencia de onboarding posible. El operador no sabe cuánto detalle poner, se cansa a la mitad, y deja el bot a medio configurar (o no lo termina).

---

## 3. La solución — Importar → Revisar → Aprender

### 3.1 Importar (no tipear)

El paso de Tours se convierte en **"¿De dónde sacamos la info de tu agencia?"** — el operador elige una o varias:

| Fuente | Qué hace el operador | Prioridad |
|---|---|---|
| 🌐 **Tu sitio web** | Pega la URL de su web — nosotros la leemos y sacamos tours, precios y FAQs | **P0** |
| 📄 **Tu tarifario (PDF o foto)** | Sube el archivo que ya usa — leemos los precios local/extranjero tal como están | **P0** |
| ✍️ Empezar de cero | El formulario manual, como **último recurso** (no como opción por defecto) | P2 |

> Instagram/Facebook y el catálogo de WhatsApp quedan para más adelante. Arrancamos con **web + tarifario**, que es lo que el ICP realmente tiene a mano.

### 3.2 Revisar (acá ocurre la personalización)

Después de importar, el operador ve algo así:

```
✅ Encontramos 8 tours, 3 paquetes y 12 preguntas frecuentes.
   Revisá y corregí lo que haga falta.

┌─ Machu Picchu Full Day ────────────── [day-tour] ─┐
│ S/.180 locales · $320 extranjeros · niños -50%    │
│ Incluye: transporte, guía bilingüe, almuerzo      │
│ ⚠️ No encontramos los horarios de salida          │
└──────────────────────────────────[ editar ][ ✕ ]─┘
```

- Tarjetas **ya pre-llenadas y editables**.
- **Banderas ⚠️** que marcan lo que falta o quedó dudoso (un precio no detectado, etc.). Le dicen al operador exactamente a qué prestarle atención, en vez de hacerle revisar todo.
- Acciones simples: editar, borrar, juntar duplicados.

> La clave: el operador pasa de **autor** (pantalla en blanco, agotador) a **editor** (revisar y corregir, liviano). Mantiene el control y la personalización con una fracción del esfuerzo.

### 3.3 Precios y detalles en formato libre

En vez de un campo "precio" rígido, cada tour tiene un espacio de **información libre** donde cabe la realidad del operador tal cual:

```
"S/.180 locales · $320 extranjeros · niños -50%
 incluye transporte, guía y almuerzo · privado +$80"
```

El bot entiende e interpreta eso para responder cualquier combinación que pregunte el cliente ("¿cuánto para 2 adultos locales?") sin obligar al operador a llenar 5 campos por tour. **Menos fricción y más fidelidad** a su negocio real. La categoría (day tour, paquete, transfer…) se detecta sola; el operador solo confirma.

### 3.4 Aprender (personalización continua, sin formulario gigante)

No hace falta cargar TODO el día 1 — solo lo mínimo para arrancar. Después el bot se afina solo con el uso real:

```
Un cliente pregunta algo que el bot no sabe responder bien
        │
        ▼
El bot avisa y registra el "hueco"
        │
        ▼
El dashboard le muestra al operador:
"Un cliente preguntó: ¿hacen descuento para grupos de 10+?"
        [ Responder y guardar ]
        │
        ▼
El bot lo aprende para siempre
```

Esto reencuadra el onboarding: **arrancás rápido y el bot se va personalizando con la realidad de tus clientes**, en vez de exigir perfección al inicio.

---

## 4. El onboarding rediseñado — flujo completo

```
1. Agencia        Nombre, país, idioma
2. WhatsApp       Conectar el número (ver §5 sobre el "plan B")
3. Conocimiento   ◀── EL REDISEÑO
   ├─ "¿De dónde sacamos tu info?"  → web / tarifario / desde cero
   ├─ [importando]  espera honesta: "Leyendo tu sitio… encontrando tus tours…"
   └─ Revisión: tarjetas pre-llenadas + banderas ⚠️ → aprobar
4. Personalidad   Tono + saludo
5. Preview + salir en vivo
```

> **Copy honesto durante la espera:** *"Esto tarda unos segundos — estamos leyendo tu sitio para no hacerte escribir todo a mano."* Convierte la espera en valor percibido.

---

## 5. Otros puntos de UX que frenan al ICP

Más allá del onboarding, esto es lo que confunde o frena a un operador no técnico.

### 🔴 Alta prioridad
- **Después no puede editar lo que cargó.** El onboarding promete *"puedes editar tus tours y FAQs cuando quieras desde tu dashboard"*, pero esa pantalla no existe. Si sube un precio o agrega un tour, no tiene dónde hacerlo. Es el caso de uso #1 recurrente y hoy no está. **El editor de tours/FAQs es tan importante como el onboarding mismo.**
- **El "plan B" para conectar WhatsApp es un muro.** Si la conexión con un clic falla, el operador cae a una pantalla que le pide códigos y términos técnicos que un no-técnico no entiende → abandona la activación. Necesita un camino guiado (paso a paso con imágenes, o un "¿problemas? te ayudamos" que lo conecte con soporte) en vez de un formulario crudo.

### 🟡 Media prioridad
- **La personalidad del bot pide un "prompt" sin guía.** Le mostramos una caja de texto vacía pidiendo que describa cómo debe comportarse el bot. El operador no sabe qué escribir. Mejor: elegir tono + campos guiados (o una plantilla ya pre-rellenada que pueda ajustar). *El rediseño de §3 ya empuja en esta dirección.*
- **El operador ve secciones que no le sirven.** Un agente (no admin) ve Métricas y Configuración aunque no debería usarlas. La navegación debería mostrar solo lo que cada rol necesita — menos ruido, menos confusión.
- **La zona horaria está en formato técnico.** Aparece como `America/Lima (UTC-5)`. El operador piensa "Lima" o "GMT-5", no nombres de base de datos. Usar etiquetas amigables: *"Lima (Perú) · GMT-5"*.
- **En el chat no se ve cuándo el bot está por responder.** El agente no sabe si esperar al bot o entrar él mismo. Un indicador de "el bot está escribiendo…" elimina esa duda.

### 🟢 Detalles
- **Consistencia de marca en el copy.** Los nombres de planes quedan en inglés ("Do It Yourself", etc.) y chocan con el "Hecho en LATAM, para LATAM". Vale revisar que toda la voz sea coherente y cercana.

### ✅ Lo que ya funciona (no tocar)
- Onboarding pasos 1-4: guiado, con previews y ejemplos de tono.
- **Tomar control / Devolver al bot:** clarísimo, con banners verde/ámbar que dejan obvio quién está manejando la conversación.
- Copy en español: cálido, natural, alineado al valor ("ningún lead perdido a las 2 AM").

---

## 6. Plan priorizado (por impacto en la experiencia)

| # | Mejora | Resuelve | Impacto |
|---|--------|----------|---------|
| 1 | **Importar desde web + tarifario** (reemplaza la carga manual). | Fricción #1 | 🔥 Alto |
| 2 | **Pantalla de revisión** (tarjetas pre-llenadas + banderas ⚠️). | Fricción #1 + personalización | 🔥 Alto |
| 3 | **Editor de tours/FAQs en el dashboard.** | "no puede editar después" | 🔥 Alto |
| 4 | **Precios/detalles en formato libre.** | El formulario aplana su realidad | Alto |
| 5 | **Camino guiado para conectar WhatsApp** cuando falla el clic. | El muro técnico | Alto |
| 6 | **Loop de aprendizaje** (huecos → "responder y guardar"). | Personalización continua | Medio |
| 7 | **Personalidad guiada** en vez de caja de texto vacía. | "prompt sin guía" | Medio |
| 8 | Navegación por rol · zona horaria amigable · indicador de "bot escribiendo". | Ruido y confusión | Bajo-Medio |

---

## 7. Cómo validar (no asumir)

Antes de construir todo, algo barato y rápido:
- **Test de los 5 minutos:** sentá a 3-5 operadores reales frente al onboarding actual y observá dónde se cansan o abandonan. Hipótesis a confirmar: *"la carga manual de tours es el punto de mayor fricción"*.
- **Auditoría de fuentes:** pedile a 5 operadores su web y su tarifario. Mirá qué % tiene web utilizable y en qué formato está el tarifario (PDF nativo vs. foto). Eso calibra cuánto invertir en cada forma de importar.
- **Métrica norte del onboarding:** % que completa hasta "salir en vivo" **con al menos 3 tours cargados**. Es la señal de que de verdad arrancaron con un bot útil.
