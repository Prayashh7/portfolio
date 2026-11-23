import { useEffect, useRef } from "react";

/*
  Pointer position as -1…1 on both axes, written to a ref rather than to state:
  the 3D scene reads it every frame and React never needs to re-render for it.

  `target` is where the pointer is. Whoever reads this eases `current` toward it,
  so the response has weight instead of snapping.
*/
export function usePointer(enabled = true) {
  const pointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    if (!enabled) return undefined;

    const onMove = (event) => {
      pointer.current.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };

    /* Pointer gone: drift back to centre rather than holding the last position. */
    const recentre = () => {
      pointer.current.targetX = 0;
      pointer.current.targetY = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", recentre);
    window.addEventListener("blur", recentre);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", recentre);
      window.removeEventListener("blur", recentre);
    };
  }, [enabled]);

  return pointer;
}
