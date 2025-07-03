import React, { ReactNode, useState } from "react";
import Dialog from "./dialog";
import { Button } from "./ui/button";

type ConfirmationDialogProps = {
  onConfirm?: () => void;
  trigger: ReactNode;
};

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  onConfirm,
  trigger,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      setOpen={setOpen}
      title="Are you sure?"
      trigger={trigger}
    >
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setOpen(false);
            onConfirm?.();
          }}
        >
          Confirm
        </Button>
      </div>
    </Dialog>
  );
};

type WithConfirmationProps = {
  children: ReactNode;
  onConfirm?: () => void;
};

const WithConfirmation: React.FC<WithConfirmationProps> = ({
  children,
  onConfirm,
}) => {
  return <ConfirmationDialog trigger={children} onConfirm={onConfirm} />;
};

export default WithConfirmation;
