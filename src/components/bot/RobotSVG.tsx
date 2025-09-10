import React from "react";

const RobotSVG: React.FC<{ size?: number }> = ({ size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="robot"
    >
      <style>
        {`
        .robot { transition: transform .25s ease; }
        .robot:hover { transform: translateY(-1px); }

        /* Make transforms relative to shape bounds */
        .eye { transform-box: fill-box; transform-origin: center; }
        .antenna { transform-box: fill-box; transform-origin: center; }
        .mouth { transform-box: fill-box; transform-origin: center; }

        @keyframes blink {
          0%, 6%, 100% { transform: scaleY(1); }
          3% { transform: scaleY(0.05); }
        }
        .eye { animation: blink 5.5s infinite; }
        .eye.eye-right { animation-delay: .15s; }

        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.8px); }
        }
        .antenna { animation: bob 2.4s ease-in-out infinite; }

        @keyframes pulse {
          0%, 100% { opacity: .7; }
          50% { opacity: 1; }
        }
        .mouth { animation: pulse 1.6s ease-in-out infinite; }

        /* Subtle shadow for depth */
        .shadow { filter: drop-shadow(0 1px 1px rgba(0,0,0,.12)); }
      `}
      </style>

      {/* Corps */}
      <rect x="10" y="16" width="28" height="20" rx="6" className="shadow" fill="#214A33" />

      {/* Yeux (anim blink) */}
      <circle cx="18" cy="26" r="3" className="eye eye-left" fill="#F7F7F7" />
      <circle cx="30" cy="26" r="3" className="eye eye-right" fill="#F7F7F7" />

      {/* Antenne (anim bob) */}
      <rect x="22" y="6" width="4" height="8" rx="2" className="antenna" fill="#214A33" />

      {/* Bras */}
      <rect x="6" y="22" width="4" height="8" rx="2" fill="#BFBFBF" />
      <rect x="38" y="22" width="4" height="8" rx="2" fill="#BFBFBF" />

      {/* Barre "bouche" (anim pulse) */}
      <rect x="14" y="34" width="20" height="4" rx="2" className="mouth" fill="#F2994A" />
    </svg>
  );
};

export default RobotSVG;