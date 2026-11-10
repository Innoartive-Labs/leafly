/**
 * Leafly - Theme System Coordinator
 * Single unified warm botanical theme (#E8DCC4, #4E5C4B, #C57B57, #A8BFA1).
 */

export function applyTheme() {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', 'botanical');
}

export async function initTheme() {
  applyTheme();
}
