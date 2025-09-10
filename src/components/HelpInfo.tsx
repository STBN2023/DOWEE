import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type HelpInfoProps = {
  title: string;
  children: React.ReactNode;
  botHint?: string;
};

const HelpInfo: React.FC<HelpInfoProps> = ({ title, children, botHint }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Aide: ${title}`}
          title={`Aide: ${title}`}
          className="ml-1 inline-flex h-5 w-5 cursor-pointer select-none items-center justify-center rounded-full bg-[#F2994A] text-[11px] font-bold text-white ring-1 ring-[#BFBFBF] hover:bg-[#E38C3F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]"
        >
          i
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {botHint && <DialogDescription>{botHint}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2 text-sm text-[#214A33]">
          {children}
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            className="border-[#BFBFBF] text-[#214A33]"
            onClick={() => window.dispatchEvent(new Event("dowee:bot:open"))}
          >
            Poser une question au bot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpInfo;