import React, { useEffect, useState } from "react";
import { RxCross1, RxCheck } from "react-icons/rx";
import classNames from "classnames";

type ContextHintProps = {
  message: string | null;
  onDismiss?: () => void;
  persistent?: boolean; // If true, will not auto-hide
};

const ContextHint: React.FC<ContextHintProps> = ({ 
  message, 
  onDismiss, 
  persistent = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (message) {
      setShouldRender(true);
      // Small delay to allow for smooth transition
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
      // Wait for transition to complete before removing from DOM
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [message]);

  const handleDismiss = () => {
    onDismiss?.();
  };

  if (!shouldRender || !message) {
    return null;
  }

  return (
    <div      className={classNames(
        "fixed bottom-4 right-4 z-50 max-w-xs transition-all duration-300 ease-in-out",
        {
          "opacity-100 translate-y-0": isVisible,
          "opacity-0 translate-y-2": !isVisible,
        }
      )}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm">
        <div className="flex items-start gap-3">
          <div className="flex-1 text-gray-700">
            {message}
          </div>
          {onDismiss && (
            <div className="flex gap-2 ml-2">
              {!persistent && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="OK"
                >
                  <RxCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Vis ikke igen"
              >
                <RxCross1 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextHint;
