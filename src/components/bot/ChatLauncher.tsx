import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import RobotSVG from "./RobotSVG";
import ChatPanel from "./ChatPanel";

const ChatLauncher: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ChatPanel open={open} onClose={() => setOpen(false)} />
      <motion.div
        className="fixed right-4 bottom-20 z-[70]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setOpen((v) => !v)}
          className="h-12 w-12 rounded-full bg-[#214A33] text-white shadow-lg hover:bg-[#214A33]/90"
          aria-label={open ? "Fermer Dowee Bot" : "Ouvrir Dowee Bot"}
          title="Dowee Bot"
        >
          <RobotSVG size={24} />
        </Button>
      </motion.div>
    </>
  );
};

export default ChatLauncher;