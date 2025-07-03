import classNames from "classnames";
import { Check, Cross, Trash } from "lucide-react";

type CardActionButtonsProps = {
  onSubmit: () => void | undefined;
  onClose?: () => void | undefined;
  onDelete?: () => void | undefined;
  submitDisabled?: boolean;
  deleteDisabled?: boolean;
};

const CardActionButtons: React.FC<CardActionButtonsProps> = ({
  onSubmit,
  onClose,
  onDelete,
  submitDisabled = false,
  deleteDisabled = false,
}) => {
  return (
    <div className="mt-2 flex justify-between items-center w-full">
      {onDelete ? (
        <div>
          <button onClick={onDelete} disabled={deleteDisabled}>
            <Trash
              className={classNames({
                "text-red-600": !deleteDisabled,
                "text-gray-400": deleteDisabled,
              })}
            />
          </button>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-4">
        {onClose && (
          <button onClick={onClose}>
            <Cross className="text-red-600 text-lg" />
          </button>
        )}
        <button onClick={onSubmit} disabled={submitDisabled}>
          <Check
            className={classNames("text-2xl", {
              "text-green-600": !submitDisabled,
              "text-gray-400": submitDisabled,
            })}
          />
        </button>
      </div>
    </div>
  );
};

export default CardActionButtons;
