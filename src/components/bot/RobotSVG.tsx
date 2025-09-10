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

        /* Transform origins */
        .eye, .antenna, .mouth { transform-box: fill-box; transform-origin: center; }

        @keyframes blink {
          0%, 6%, 100% { transform: scaleY(1); }
          3% { transform: scaleY(0.06); }
        }
        .eye { animation: blink 5.5s infinite; }
        .eye.eye-right { animation-delay: .15s; }

        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.8px); }
        }
        .antenna { animation: bob 2.4s ease-in-out infinite; }

        @keyframes pulse {
          0%, 100% { opacity: .75; }
          50% { opacity: 1; }
        }
        .mouth { animation: pulse 1.6s ease-in-out infinite; }

        .shadow { filter: drop-shadow(0 1px 1px rgba(0,0,0,.2)); }
      `}
      </style>

      {/* Corps très clair + liseré vert pour contraster sur le bouton vert */}
      <rect
        x="10"
        y="16"
        width="28"
        height="20"
        rx="6"
        className="shadow"
        fill="#F7F7F7"
        stroke="#214A33"
        strokeWidth="1.3"
      />

      {/* Yeux verts foncés + petit reflet blanc */}
      <circle cx="18" cy="26" r="3" className="eye eye-left" fill="#214A33" />
      <circle cx="30" cy="26" r="3" className="eye eye-right" fill="#214A33" />
      <circle cx="17.2" cy="25.2" r="0.7" fill="#F7F7F7" />
      <circle cx="29.2" cy="25.2" r="0.7" fill="#F7F7F7" />

      {/* Antenne + bras orange pour pop visuel */}
      <rect x="22" y="6" width="4" height="8" rx="2" className="antenna" fill="#F2994A" />
      <rect x="6" y="22" width="4" height="8" rx="2" fill="#F2994A" />
      <rect x="38" y="22" width="4" height="8" rx="2" fill="#F2994A" />

      {/* Bouche orange qui pulse */}
      <rect x="14" y="34" width="20" height="4" rx="2" className="mouth" fill="#F2994A" />
    </svg>
  );
};

export default RobotSVG;