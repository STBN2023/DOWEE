import React from "react";

const RobotSVG: React.FC<{ size?: number }> = ({ size = 28 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="16" width="28" height="20" rx="6" fill="#214A33" />
      <circle cx="18" cy="26" r="3" fill="#F7F7F7" />
      <circle cx="30" cy="26" r="3" fill="#F7F7F7" />
      <rect x="22" y="6" width="4" height="8" rx="2" fill="#214A33" />
      <rect x="6" y="22" width="4" height="8" rx="2" fill="#BFBFBF" />
      <rect x="38" y="22" width="4" height="8" rx="2" fill="#BFBFBF" />
      <rect x="14" y="34" width="20" height="4" rx="2" fill="#F2994A" />
    </svg>
  );
};

export default RobotSVG;