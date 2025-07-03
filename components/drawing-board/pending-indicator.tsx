import React from "react";

const PendingIndicator: React.FC = () => {
  return (
    <div
      style={{
        width: "160px",
        height: "160px",
        borderStyle: "solid",
        borderWidth: "6px",
        borderColor: "transparent",
        borderRadius: "50%",
        borderTopStyle: "solid",
        borderTopWidth: "6px",
        borderTopColor: "#3498db",
        animation: "spin 1s linear infinite",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
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
