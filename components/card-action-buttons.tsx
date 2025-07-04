import classNames from "classnames";
import { RxCheck, RxCross2, RxTrash } from "react-icons/rx";

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
          <button className="cursor-pointer" onClick={onDelete} disabled={deleteDisabled}>
            <RxTrash
              className={classNames("text-xl", {
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
          <button className="cursor-pointer" onClick={onClose}>
            <RxCross2 className="text-red-600 text-xl" />
          </button>
        )}
        <button className="cursor-pointer" onClick={onSubmit} disabled={submitDisabled}>
          <RxCheck
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
