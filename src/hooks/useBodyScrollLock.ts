import { useEffect } from "react";

/**
 * Hook to lock/unlock body scroll when a modal or overlay is open
 * @param isLocked - Whether the body scroll should be locked
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Store the original overflow value
    const originalOverflow = document.body.style.overflow;

    // Lock the scroll
    document.body.style.overflow = "hidden";

    // Cleanup function to restore scroll when component unmounts or isLocked changes
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
}
