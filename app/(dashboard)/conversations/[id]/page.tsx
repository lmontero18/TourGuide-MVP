"use client";

import { useParams } from "next/navigation";
import ConversationList from "@/components/conversations/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";
import TopBar from "@/components/layout/TopBar";
import type { MessageRole } from "@/types";

/* ─── Mock messages per conversation ─── */
const MOCK_MESSAGES: Record<string, { contactName: string; contactPhone: string; botActive: boolean; messages: { id: string; role: MessageRole; content: string; createdAt: string }[] }> = {
  "conv-1": {
    contactName: "Maria Garcia",
    contactPhone: "+52 55 8374 1234",
    botActive: false,
    messages: [
      { id: "m1", role: "user", content: "Hola! Me interesa el tour a Chichen Itza para el viernes", createdAt: "10:23 AM" },
      { id: "m2", role: "assistant", content: "Hola Maria! 😊 El tour a Chichen Itza sale cada viernes a las 7:00 AM. Incluye transporte, guia bilingue, entrada al sitio y buffet. El precio es $85 USD por persona. Cuantas personas serian?", createdAt: "10:23 AM" },
      { id: "m3", role: "user", content: "Somos 6 personas, 4 adultos y 2 ninos de 8 y 12 anos", createdAt: "10:25 AM" },
      { id: "m4", role: "assistant", content: "Perfecto! Ninos de 5 a 12 anos pagan $55 USD. Entonces seria:\n\n• 4 adultos x $85 = $340 USD\n• 2 ninos x $55 = $110 USD\n• Total: $450 USD\n\nQuieren que reserve los 6 lugares para este viernes?", createdAt: "10:25 AM" },
      { id: "m5", role: "user", content: "Perfecto, somos 6 personas para el tour del viernes", createdAt: "10:28 AM" },
      { id: "m6", role: "agent", content: "Hola Maria! Soy Luis del equipo. Te confirmo los 6 lugares para el viernes. Te mando los detalles por aqui en un momento.", createdAt: "10:30 AM" },
    ],
  },
  "conv-2": {
    contactName: "James Wilson",
    contactPhone: "+1 415 982 3344",
    botActive: true,
    messages: [
      { id: "m1", role: "user", content: "Hi! Do you have availability for Machu Picchu next week?", createdAt: "10:15 AM" },
      { id: "m2", role: "assistant", content: "Hello James! 👋 We have our Sacred Valley & Machu Picchu 2-day tour available next week on Tuesday and Thursday departures.\n\nThe tour includes:\n• Transport from Cusco\n• Professional bilingual guide\n• Entrance tickets\n• 1 night hotel in Aguas Calientes\n• Breakfast and lunch both days\n\nPrice: $320 USD per person. Would you like more details?", createdAt: "10:15 AM" },
      { id: "m3", role: "user", content: "Do you have availability for Machu Picchu next week?", createdAt: "10:20 AM" },
    ],
  },
  "conv-5": {
    contactName: "Carlos Mendez",
    contactPhone: "+52 33 1987 4321",
    botActive: false,
    messages: [
      { id: "m1", role: "user", content: "Hola, tengo un problema con mi reserva del tour de manana", createdAt: "8:30 AM" },
      { id: "m2", role: "assistant", content: "Hola Carlos! Lamento escuchar eso. Puedo ayudarte con informacion general, pero para cambios en reservas te voy a conectar con uno de nuestros agentes que podra asistirte directamente. Un momento por favor.", createdAt: "8:30 AM" },
      { id: "m3", role: "user", content: "Necesito hablar con alguien sobre un problema con la reserva", createdAt: "8:35 AM" },
    ],
  },
};

const DEFAULT_CONV = {
  contactName: "Contact",
  contactPhone: "+00 000 000 0000",
  botActive: true,
  messages: [],
};

export default function ConversationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const conv = MOCK_MESSAGES[id] || DEFAULT_CONV;

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Conversations" />
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className="hidden lg:block w-full max-w-md border-r border-slate-200 bg-white overflow-hidden">
          <ConversationList activeId={id} />
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            conversationId={id}
            contactName={conv.contactName}
            contactPhone={conv.contactPhone}
            initialBotActive={conv.botActive}
            initialMessages={conv.messages}
          />
        </div>
      </div>
    </div>
  );
}
