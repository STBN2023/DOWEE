import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dateLabel: string;
  canSuggestCopy: boolean;
  onConfirm: () => Promise<void>;
  onEdit: () => void;
};

const ValidationDialog: React.FC<Props> = ({ open, onOpenChange, dateLabel, canSuggestCopy, onConfirm, onEdit }) => {
  const [saving, setSaving] = React.useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider la journée</DialogTitle>
          <DialogDescription>
            Validation des heures réelles pour le {dateLabel}. {canSuggestCopy ? "Vous pouvez confirmer que votre journée est conforme au planning." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-[#214A33]/80">
          - “Confirmer” enregistre vos heures réelles à partir des créneaux planifiés (modifiable ultérieurement).<br />
          - “Modifier” ouvre l’édition Journée pour ajuster avant validation.
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={onEdit}>
            Modifier
          </Button>
          <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={handleConfirm} disabled={saving}>
            {saving ? "Validation…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationDialog;