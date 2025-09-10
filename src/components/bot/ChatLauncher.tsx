import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ChatLauncher — DoWee (charte couleur appliquée)
 * Palette:
 *  - Vert foncé: #214A33 (titres, accents)
 *  - Orange doux: #F2994A (actions, CTAs, robot)
 *  - Gris neutre: #BFBFBF (bordures, texte secondaire)
 *  - Blanc crème: #F7F7F7 (fonds)
 */
export default function ChatLauncher({ onOpenChange, onSend }: { onOpenChange?: (open: boolean) => void; onSend?: (msg: string) => Promise<string> | string; }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Je suis DoWee. Pose une question sur l'utilisation du logiciel." },
  ]);
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };

  async function handleSend(msg: string) {
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setPending(true);
    try {
      const reply = await (onSend?.(msg) ?? defaultEcho(msg));
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur: impossible d'obtenir une réponse" }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-[64px] right-4 z-[1000] select-none">
      <div className="flex items-end gap-3">
        {/* Bouton robot animé */}
        <motion.button
          type="button"
          aria-label="Assistant DoWee"
          onClick={toggle}
          className="relative grid place-items-center w-14 h-14 rounded-2xl bg-[#F7F7F7] shadow-lg ring-1 ring-[#BFBFBF] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]"
          animate={{ y: [0, -4, 0], rotate: [0, -3, 0, 3, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <AnimatedRobot className="w-9 h-9" />
          {/* voyant actif en vert foncé */}
          <span className="absolute -top-1 -right-1 inline-block w-3 h-3 rounded-full bg-[#214A33] shadow-[0_0_0_2px_#F7F7F7]" />
        </motion.button>

        {/* Bulle d'ouverture */}
        <motion.button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="chat-panel"
          className="grid place-items-center w-12 h-12 rounded-full bg-[#F2994A] text-white shadow-lg hover:bg-[#E38C3F] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#214A33]"
          whileTap={{ scale: 0.95 }}
        >
          <ChatIcon className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Panneau de chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="chat-panel"
            role="dialog"
            aria-label="Chat DoWee"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18 }}
            className="mt-3 w=[min(92vw,380px)] h-[min(70vh,560px)] rounded-2xl bg-[#F7F7F7] shadow-2xl ring-1 ring-[#BFBFBF] overflow-hidden"
          >
            <Header onClose={toggle} />
            <div ref={listRef} className="h-[calc(100%-3.5rem-3.5rem)] overflow-y-auto p-3 bg-gradient-to-b from-[#F7F7F7] to-white space-y-3">
              {messages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} />
              ))}
              {pending && <Typing />}
            </div>
            <Footer onSend={(msg) => { handleSend(msg); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Message({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`${isUser ? "bg-[#F2994A] text-white" : "bg-white text-[#214A33]"} max-w-[85%] px-3 py-2 rounded-2xl shadow-sm ring-1 ring-[#BFBFBF] ${isUser ? "rounded-br-sm" : "rounded-bl-sm"}`}>
        {!isUser && (
          <div className="mb-1 flex items-center gap-2 text-[#6b6b6b] text-xs">
            <RobotHead className="w-4 h-4" /> DoWee
          </div>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-2 text-xs text-[#6b6b6b]">
      <RobotHead className="w-4 h-4" />
      <span>rédaction…</span>
      <motion.span className="inline-block w-1 h-1 rounded-full bg-[#BFBFBF]" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity }} />
      <motion.span className="inline-block w-1 h-1 rounded-full bg-[#BFBFBF]" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, delay: 0.2, repeat: Infinity }} />
      <motion.span className="inline-block w-1 h-1 rounded-full bg-[#BFBFBF]" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, delay: 0.4, repeat: Infinity }} />
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-[#BFBFBF] bg-[#F7F7F7]/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <RobotHead className="w-6 h-6" />
        <div className="font-semibold text-[#214A33]">DoWee</div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="p-1 rounded-md hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]"
      >
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

function Footer({ onSend }: { onSend: (msg: string) => void }) {
  return (
    <form
      className="h-14 px-2 py-2 border-t border-[#BFBFBF] bg-[#F7F7F7]/80 backdrop-blur flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget as HTMLFormElement);
        const msg = (fd.get("msg") as string)?.trim();
        if (msg) onSend(msg);
        (e.currentTarget as HTMLFormElement).reset();
      }}
    >
      <input
        name="msg"
        placeholder="Pose ta question…"
        className="flex-1 h-10 rounded-xl border border-[#BFBFBF] px-3 outline-none focus:ring-2 focus:ring-[#214A33] bg-white"
        autoComplete="off"
      />
      <button type="submit" className="h-10 px-3 rounded-xl bg-[#F2994A] text-white hover:bg-[#E38C3F]">
        Envoyer
      </button>
    </form>
  );
}

// --- Icônes et robot ---
function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2 4.75A2.75 2.75 0 0 1 4.75 2h14.5A2.75 2.75 0 0 1 22 4.75v8.5A2.75 2.75 0 0 1 19.25 16H8l-4.5 4.5V16H4.75A2.75 2.75 0 0 1 2 13.25v-8.5Z"/>
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}

function RobotHead({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="#F2994A" />
          <stop offset="1" stopColor="#E38C3F" />
        </linearGradient>
      </defs>
      <rect x="10" y="18" width="44" height="34" rx="10" fill="url(#g)" />
      <rect x="16" y="24" width="32" height="16" rx="8" fill="#F7F7F7" />
      <circle cx="26" cy="32" r="3" fill="#214A33" />
      <circle cx="38" cy="32" r="3" fill="#214A33" />
      <rect x="28" y="38" width="8" height="2" rx="1" fill="#214A33" />
    </svg>
  );
}

function AnimatedRobot({ className = "" }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 64 64" className={className} aria-hidden initial={{ rotate: 0 }} animate={{ rotate: [0, -4, 0, 4, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="#F2994A" />
          <stop offset="1" stopColor="#E38C3F" />
        </linearGradient>
      </defs>
      {/* Corps */}
      <motion.rect x="10" y="18" width="44" height="34" rx="10" fill="url(#g)" animate={{ y: [18, 16, 18] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />
      {/* Antenne */}
      <motion.circle cx="32" cy="10" r="3" fill="#BFBFBF" animate={{ cy: [10, 8, 10] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
      <rect x="31" y="12" width="2" height="6" rx="1" fill="#BFBFBF" />
      {/* Visage */}
      <rect x="16" y="24" width="32" height="16" rx="8" fill="#F7F7F7" />
      <motion.circle cx="26" cy="32" r="3" fill="#214A33" animate={{ r: [3, 3, 1.2, 3] }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.7, 0.75, 1] }} />
      <motion.circle cx="38" cy="32" r="3" fill="#214A33" animate={{ r: [3, 3, 1.2, 3] }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.7, 0.75, 1] }} />
      <rect x="28" y="38" width="8" height="2" rx="1" fill="#214A33" />
    </motion.svg>
  );
}

// Fallback simple si aucune API n'est branchée
function defaultEcho(q: string) {
  return new Promise<string>((r) => setTimeout(() => r(`Tu as dit: "${q}"\n(Branche onSend pour appeler ton API RAG)`), 500));
}