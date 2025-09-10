import React from "react";
import { motion, useReducedMotion } from "framer-motion";

type Props = {
  size?: number;
  className?: string;
  title?: string;
  decorative?: boolean;
};

const AnimatedRobot: React.FC<Props> = ({ size = 28, className, title = "DoWee Bot", decorative = true }) => {
  const prefersReducedMotion = useReducedMotion();
  const gid = React.useId(); // unique gradient id

  const animate = prefersReducedMotion
    ? undefined
    : { rotate: [0, -5, 5, 0], y: [0, -3, 0] };

  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      animate={animate}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      style={{ originX: 0.5, originY: 0.6 }}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      {!decorative && <title>{title}</title>}
      <defs>
        {/* Dégradé Orange DoWee (léger fondu) */}
        <linearGradient id={`grad-${gid}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#F2994A" />
          <stop offset="1" stopColor="#E08A3F" />
        </linearGradient>
      </defs>

      {/* Corps principal (arrondi) */}
      <rect x="10" y="18" width="44" height="34" rx="10" fill={`url(#grad-${gid})`} />

      {/* Fenêtre/visière blanche pour contraste */}
      <rect x="16" y="24" width="32" height="16" rx="8" fill="#FFFFFF" />

      {/* Yeux (vert foncé de la charte pour cohérence) */}
      <circle cx="26" cy="32" r="3" fill="#214A33" />
      <circle cx="38" cy="32" r="3" fill="#214A33" />

      {/* Bouche (petit trait vert foncé) */}
      <rect x="28" y="38" width="8" height="2" rx="1" fill="#214A33" />

      {/* Antenne orange plus claire */}
      <rect x="30" y="10" width="4" height="8" rx="2" fill="#F2994A" />
      <circle cx="32" cy="9" r="2" fill="#F2994A" />
    </motion.svg>
  );
};

export default AnimatedRobot;