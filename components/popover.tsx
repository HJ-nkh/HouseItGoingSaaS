import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

type PopoverProps = {
  children: React.ReactNode;
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
  contentClassName?: string;
};

const PopoverComponent: React.FC<PopoverProps> = ({
  children,
  trigger,
  align,
  contentClassName,
}) => {
  return (
    <Popover>
      <PopoverTrigger>{trigger}</PopoverTrigger>
      <PopoverContent className={contentClassName} align={align}>
        {children}
      </PopoverContent>
    </Popover>
  );
};

export default PopoverComponent;