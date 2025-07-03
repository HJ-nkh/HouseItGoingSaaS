import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";

type DialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
};

const DialogComponent: React.FC<DialogProps> = ({
  open,
  setOpen,
  trigger,
  title,
  children,
}) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default DialogComponent;
