import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, AlertTriangle, Lightbulb } from "lucide-react";
import { doweeChat, submitFeedback } from "@/api/doweeBot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/utils/toast";

type Msg = { role: "user" | "assistant"; content: string };

const bubbleClasses = {
  user: "ml-auto bg-[#214A33] text-white",
  assistant: "mr-auto bg-white text-[#214A33] border border-[#BFBFBF]",
};

const ChatPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [messages, setMessages] = React.useState<Msg[]>([
    { role: "assistant", content: "Bonjour, je suis Dowee Bot. Posez votre question sur l’app, le planning, les dashboards… Je m’appuie sur le guide utilisateur." },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [citations, setCitations] = React.useState<Array<{ section: string | null; snippet: string }>>([]);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, citations, open]);

  const ask = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await doweeChat([
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: q },
      ] as any);
      const a = String(res.answer ?? "");
      setMessages((m) => [...m, { role: "assistant", content: a }]);
      setCitations(res.citations || []);
    } catch (e: any) {
      showError(e?.message || "Impossible d’obtenir une réponse.");
    } finally {
      setLoading(false);
    }
  };

  const quickBug = async () => {
    try {
      const page = window.location.href;
      await submitFeedback({
        type: "bug",
        title: "Bug signalé via Dowee Bot",
        description: messages.slice(-1)[0]?.content || "Détaillez le problème rencontré.",
        severity: "mineur",
        page_url: page,
        meta: { source: "dowee-bot" },
      });
      showSuccess("Bug transmis. Merci !");
    } catch (e: any) {
      showError(e?.message || "Envoi impossible.");
    }
  };

  const quickReco = async () => {
    try {
      const page = window.location.href;
      await submitFeedback({
        type: "suggestion",
        title: "Amélioration proposée via Dowee Bot",
        description: "Suggestion: " + (messages.slice(-1)[0]?.content || ""),
        impact: "moyen",
        page_url: page,
        meta: { source: "dowee-bot" },
      });
      showSuccess("Recommandation transmise. Merci !");
    } catch (e: any) {
      showError(e?.message || "Envoi impossible.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[94vw] overflow-hidden rounded-lg border border-[#BFBFBF] bg-[#F7F7F7] shadow-lg"
          role="dialog"
          aria-modal="true"
          aria-label="Chat Dowee Bot"
        >
          <div className="flex items-center justify-between border-b border-[#BFBFBF] bg-white px-3 py-2">
            <div className="text-sm font-semibold text-[#214A33]">Dowee Bot</div>
            <Button variant="outline" size="icon" className="h-7 w-7 border-[#BFBFBF] text-[#214A33]" onClick={onClose} aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="max-h-[50vh] overflow-auto px-3 py-2">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`mb-2 max-w-[85%] rounded-lg px-3 py-2 text-sm ${bubbleClasses[m.role]}`}
              >
                {m.content}
              </motion.div>
            ))}

            {loading && (
              <div className="mr-auto mb-2 inline-flex max-w-[85%] items-center gap-2 rounded-lg border border-[#BFBFBF] bg-white px-3 py-2 text-sm text-[#214A33]">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#214A33]" />
                <span>Dowee Bot réfléchit…</span>
              </div>
            )}

            {citations.length > 0 && (
              <div className="mt-2 rounded-md border border-[#BFBFBF] bg-white p-2">
                <div className="mb-1 text-[11px] font-medium text-[#214A33]">Extraits du guide</div>
                <ul className="space-y-1">
                  {citations.map((c, idx) => (
                    <li key={idx} className="text-[11px] text-[#214A33]/80">
                      <span className="font-medium">{c.section ?? "Section"}: </span>
                      <span>{c.snippet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="border-t border-[#BFBFBF] bg-white p-2">
            <div className="mb-2 flex gap-2">
              <Button variant="outline" className="h-8 border-[#BFBFBF] text-[#214A33]" onClick={quickBug}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Signaler un bug
              </Button>
              <Button variant="outline" className="h-8 border-[#BFBFBF] text-[#214A33]" onClick={quickReco}>
                <Lightbulb className="mr-2 h-4 w-4" /> Suggérer une amélioration
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez une question…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                  }
                }}
              />
              <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={ask} disabled={loading}>
                <Send className="mr-2 h-4 w-4" /> Envoyer
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;