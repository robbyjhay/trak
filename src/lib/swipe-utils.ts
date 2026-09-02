/**
 * Pure swipe helpers for WhatsApp-style swipe-to-reply.
 * Extracted for testability.
 */

export const SWIPE_THRESHOLD = 55;
export const SWIPE_MAX_TRANSLATE = 72;

export function isHorizontalSwipe(dx: number, dy: number): boolean {
  return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
}

export function isVerticalScroll(dx: number, dy: number): boolean {
  return Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10;
}

export function computeOffset(dx: number): number {
  if (dx < 0) return 0;
  return Math.min(dx * 0.55, SWIPE_MAX_TRANSLATE);
}

export function shouldTriggerReply(offsetX: number, threshold: number = SWIPE_THRESHOLD): boolean {
  return offsetX >= threshold;
}

export function dragProgress(offsetX: number, threshold: number = SWIPE_THRESHOLD): number {
  return Math.min(offsetX / threshold, 1);
}
