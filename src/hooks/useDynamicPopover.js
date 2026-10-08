import { useState, useLayoutEffect } from 'react';

export function useDynamicPopover(ref, isOpen, popoverWidth = 300) {
  const [positionClass, setPositionClass] = useState("left-0");

  useLayoutEffect(() => {
    if (!isOpen || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.left;
    const spaceLeft = rect.right;

    // If there isn't enough space on the right, but there is on the left, align right.
    if (spaceRight < popoverWidth && spaceLeft >= popoverWidth) {
      setPositionClass("right-0");
    } else {
      setPositionClass("left-0");
    }
  }, [isOpen, ref, popoverWidth]);

  return positionClass;
}
