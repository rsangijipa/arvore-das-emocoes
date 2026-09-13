export const TAP_SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };
export const TAP_BUTTON = { whileTap: { scale: 0.94 }, transition: TAP_SPRING };

export const TAP_CHIP = { whileTap: { scale: 0.95 }, transition: TAP_SPRING };

export const TAP_LIST_ITEM = { whileTap: { scale: 0.98 }, transition: TAP_SPRING };

export const SPRING_FAST = { type: "spring" as const, stiffness: 400, damping: 30 };
export const SPRING_SLOW = { type: "spring" as const, stiffness: 250, damping: 25 };

export function springPresence(damping = 26) {
  return {
    initial: { opacity: 0, y: 12, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 8, scale: 0.94 },
    transition: { type: "spring" as const, stiffness: 350, damping },
  };
}