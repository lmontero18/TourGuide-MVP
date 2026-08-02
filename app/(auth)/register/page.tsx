import { redirect } from "next/navigation";

// Beta cerrada: el alta la hacemos nosotros invitando desde Supabase
// (Authentication -> Users -> Invite). El invitado recibe el mail, confirma y
// cae en /onboarding sin org, donde crea su agencia.
//
// Esta pagina ya no tiene formulario. Pero el gate REAL no es este redirect:
// es "Allow new users to sign up" desactivado en el proyecto de Supabase. Sin
// eso, POST /auth/v1/signup con la anon key sigue creando usuarios aunque la UI
// no exista — un gate de UI no es un gate. Esto solo evita que alguien aterrice
// en un formulario muerto desde un link viejo.
export default function RegisterPage() {
  redirect("/login");
}
