import React from "react";

const PendingIndicator: React.FC = () => {
  return (
    <div
      style={{
        width: "120px",
        height: "120px",
        borderStyle: "solid",
        borderWidth: "5px",
        borderColor: "transparent",
        borderRadius: "50%",
        borderTopStyle: "solid",
        borderTopWidth: "5px",
        borderTopColor: "steelblue",
        animation: "spin 1s linear infinite",
      }}
    >
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PendingIndicator;
