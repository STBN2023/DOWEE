import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AnimatedRobot from "./AnimatedRobot";
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
          className="h-12 w-12 rounded-full bg-white text-[#214A33] shadow-lg hover:bg-[#F7F7F7] border border-[#BFBFBF]"
          aria-label={open ? "Fermer Dowee Bot" : "Ouvrir Dowee Bot"}
          title="Dowee Bot"
        >
          <AnimatedRobot size={32} decorative />
        </Button>
      </motion.div>
    </>
  );
};

export default ChatLauncher;