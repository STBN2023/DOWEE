import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { doweeChat } from "@/api/doweeBot";
import { useAuth } from "@/context/AuthContext";
import { getDayStatus } from "@/api/dayValidation";
import { useBotSettings } from "@/context/BotSettingsContext";

/**
 * ChatLauncher — DoWee (charte couleur appliquée)
 * Palette:
 *  - Vert foncé: #214A33 (titres, accents)
 *  - Orange doux: #F2994A (actions, CTAs, robot)
 *  - Gris neutre: #BFBFBF (bordures, texte secondaire)
 *  - Blanc crème: #F7F7F7 (fonds)
 */
export default function ChatLauncher({
  onOpenChange,
  onSend,
}: {
  onOpenChange?: (open: boolean) => void;
  onSend?: (msg: string) => Promise<string> | string;
}) {
  const navigate = useNavigate();
  const { session, employee } = useAuth();
  const { settings } = useBotSettings();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Je suis DoWee. Pose une question sur l'utilisation du logiciel.",
    },
  ]);
  const [pending, setPending] = useState(false);

  // État de la relance “après-midi” / à la connexion
  const [afternoonCta, setAfternoonCta] = useState<boolean>(false);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, afternoonCta]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
  };

  function cleanAnswer(answer: string, userMsg: string): string {
    let out = answer.replace(/^\s*(tu|vous)\s+as|avez\s+dit\s*:.*$/gim, "").trim();
    const q = userMsg.trim().replace(/\s+/g, " ").toLowerCase();
    out = out
      .replace(new RegExp(`^"\\s*${escapeRegExp(q)}\\s*"`), "")
      .replace(new RegExp(`^\\s*${escapeRegExp(q)}\\s*$`, "i"), "")
      .trim();
    return out || "Je n’ai pas besoin de répéter la question. Voici la réponse :";
  }

  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async function callAssistant(withMsg: string): Promise<string> {
    const custom = onSend?.(withMsg);
    if (custom) return await custom;

    const history = [...messages, { role: "user", content: withMsg }].map((m) => ({
      role: m.role,
      content: m.content,
    })) as Array<{ role: "user" | "assistant"; content: string }>;

    try {
      const res = await doweeChat(history as any);
      return res.answer ?? "Je n’ai pas trouvé d’information pertinente.";
    } catch {
      return "Je n’ai pas la réponse pour l’instant.";
    }
  }

  async function handleSend(msg: string) {
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setPending(true);
    try {
      let reply = await callAssistant(msg);
      reply = cleanAnswer(reply, msg);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Une erreur est survenue.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  // ---------- Rappel / Vérification ----------
  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const dismissedKey = useMemo(() => `dowee.bot.afternoon.dismissed.${todayIso}`, [todayIso]);
  const loginPromptKey = useMemo(() => `dowee.bot.login.prompted.${todayIso}`, [todayIso]);

  const runAfternoonCheck = useCallback(
    async (opts?: { ignoreAfternoonFlag?: boolean; ignoreDismissed?: boolean }) => {
      if (!session || !employee) return; // attendre que le profil soit prêt
      if (!opts?.ignoreAfternoonFlag && !settings.afternoonReminderEnabled) return;
      if (!opts?.ignoreDismissed && localStorage.getItem(dismissedKey) === "1") return;

      try {
        const status = await getDayStatus(todayIso);
        if (status?.validated) return;
        setOpen(true);
        setAfternoonCta(true);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Il est l’heure de vérifier/valider votre planning du jour. Souhaitez‑vous le faire maintenant ?",
          },
        ]);
        onOpenChange?.(true);
      } catch {
        // silencieux
      }
    },
    [session, employee, settings.afternoonReminderEnabled, dismissedKey, todayIso, onOpenChange]
  );

  // Proposer à la connexion si param activé — 1 seule fois par session, en ignorant le 'Plus tard' du jour
  useEffect(() => {
    if (session && employee && settings.promptOnLoginEnabled) {
      const already = sessionStorage.getItem(loginPromptKey) === "1";
      if (!already) {
        runAfternoonCheck({ ignoreAfternoonFlag: true, ignoreDismissed: true });
        sessionStorage.setItem(loginPromptKey, "1");
      }
    }
  }, [session, employee, settings.promptOnLoginEnabled, runAfternoonCheck, loginPromptKey]);

  // Test manuel
  useEffect(() => {
    const handler = () => runAfternoonCheck({ ignoreAfternoonFlag: true });
    window.addEventListener("dowee:bot:triggerAfternoon", handler as any);
    return () => window.removeEventListener("dowee:bot:triggerAfternoon", handler as any);
  }, [runAfternoonCheck]);

  // Planification à l’heure de l’après‑midi
  const scheduleAfternoonCheck = useCallback(() => {
    if (!settings.afternoonReminderEnabled) return -1;
    const now = new Date();
    const target = new Date();
    target.setHours(settings.afternoonReminderHour, 0, 0, 0);
    const ms = target.getTime() - now.getTime();
    if (ms <= 0) return 10;
    return ms;
  }, [settings.afternoonReminderEnabled, settings.afternoonReminderHour]);

  useEffect(() => {
    const delay = scheduleAfternoonCheck();
    if (delay < 0) return; // désactivé

    const timer = setTimeout(() => {
      runAfternoonCheck();
      const poll = setInterval(() => {
        if (localStorage.getItem(dismissedKey) === "1") {
          clearInterval(poll);
          return;
        }
        runAfternoonCheck();
      }, Math.max(5, settings.afternoonReminderRepeatMinutes) * 60 * 1000);
      (window as any).__dowee_poll = poll;
    }, delay);

    return () => {
      clearTimeout(timer);
      const poll = (window as any).__dowee_poll;
      if (poll) clearInterval(poll);
    };
  }, [scheduleAfternoonCheck, runAfternoonCheck, dismissedKey, settings.afternoonReminderRepeatMinutes]);

  const onValidateToday = () => {
    setAfternoonCta(false);
    setOpen(false);
    onOpenChange?.(false);
    navigate("/today");
  };

  const onNotNow = () => {
    localStorage.setItem(dismissedKey, "1");
    setAfternoonCta(false);
    setOpen(false);
    onOpenChange?.(false);
  };

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
            className="mt-3 w=[min(92vw,380px)] h=[min(70vh,560px)] rounded-2xl bg-[#F7F7F7] shadow-2xl ring-1 ring-[#BFBFBF] overflow-hidden"
          >
            <Header onClose={toggle} />

            <div
              ref={listRef}
              className="h-[calc(100%-3.5rem-3.5rem)] overflow-y-auto p-3 bg-gradient-to-b from-[#F7F7F7] to-white space-y-3"
            >
              {messages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} />
              ))}
              {pending && <Typing />}

              {/* CTA validation */}
              {afternoonCta && (
                <div className="mt-2 rounded-xl border border-[#BFBFBF] bg-white p-3">
                  <div className="mb-2 text-sm font-medium text-[#214A33]">
                    Vérifier / valider votre planning du jour ?
                  </div>
                  <div className="text-xs text-[#214A33]/80 mb-3">
                    “Valider aujourd’hui” copie vos créneaux planifiés en heures réelles et marque la journée validée (modifiable ensuite).
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onValidateToday}
                      className="inline-flex items-center rounded-md bg-[#F2994A] px-3 py-1.5 text-sm text-white hover:bg-[#E38C3F]"
                    >
                      Valider aujourd’hui
                    </button>
                    <button
                      type="button"
                      onClick={onNotNow}
                      className="inline-flex items-center rounded-md border border-[#BFBFBF] bg-white px-3 py-1.5 text-sm text-[#214A33] hover:bg-[#F7F7F7]"
                    >
                      Plus tard
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Footer
              onSend={(text) => {
                const t = (text || "").trim();
                if (t) handleSend(t);
              }}
            />
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
      <div
        className={`${
          isUser ? "bg-[#F2994A] text-white" : "bg-white text-[#214A33]"
        } max-w-[85%] px-3 py-2 rounded-2xl shadow-sm ring-1 ring-[#BFBFBF] ${
          isUser ? "rounded-br-sm" : "rounded-bl-sm"
        }`}
      >
        {!isUser && (
          <div className="mb-1 flex items-center gap-2 text-[#6b6b6b] text-xs">
            <RobotHead className="w-4 h-4" /> DoWee
          </div>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-2 text-xs text-[#6b6b6b]">
      <RobotHead className="w-4 h-4" />
      <span>rédaction…</span>
      <motion.span
        className="inline-block w-1 h-1 rounded-full bg-[#BFBFBF]"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.span
        className="inline-block w-1 h-1 rounded-full bg-[#BFBFBF]"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1, delay: 0.2, repeat: Infinity }}
      />
      <motion.span
        className="inline-block w-1 h-1 rounded-full bg-[#BFBFBF]"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1, delay: 0.4, repeat: Infinity }}
      />
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
      <button
        type="submit"
        className="h-10 px-3 rounded-xl bg-[#F2994A] text-white hover:bg-[#E38C3F]"
      >
        Envoyer
      </button>
    </form>
  );
}

// --- Icônes et robot ---
function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M2 4.75A2.75 2.75 0 0 1 4.75 2h14.5A2.75 2.75 0 0 1 22 4.75v8.5A2.75 2.75 0 0 1 19.25 16H8l-4.5 4.5V16H4.75A2.75 2.75 0 0 1 2 13.25v-8.5Z" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
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
    <motion.svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, -4, 0, 4, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="#F2994A" />
          <stop offset="1" stopColor="#E38C3F" />
        </linearGradient>
      </defs>
      <motion.rect
        x="10"
        y="18"
        width="44"
        height="34"
        rx="10"
        fill="url(#g)"
        animate={{ y: [18, 16, 18] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="32"
        cy="10"
        r="3"
        fill="#BFBFBF"
        animate={{ cy: [10, 8, 10] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <rect x="31" y="12" width="2" height="6" rx="1" fill="#BFBFBF" />
      <rect x="16" y="24" width="32" height="16" rx="8" fill="#F7F7F7" />
      <motion.circle
        cx="26"
        cy="32"
        r="3"
        fill="#214A33"
        animate={{ r: [3, 3, 1.2, 3] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.7, 0.75, 1] }}
      />
      <motion.circle
        cx="38"
        cy="32"
        r="3"
        fill="#214A33"
        animate={{ r: [3, 3, 1.2, 3] }}
        transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.7, 0.75, 1] }}
      />
      <rect x="28" y="38" width="8" height="2" rx="1" fill="#214A33" />
    </motion.svg>
  );
}