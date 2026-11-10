/**
 * Leafly - Shared Utilities
 * Lightweight math, timing, formatting, and helper methods.
 */

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatTemperature(celsius, unit = 'C') {
  if (typeof celsius !== 'number') return '--';
  if (unit === 'F') {
    const f = Math.round((celsius * 9) / 5 + 32);
    return `${f}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function isSystemReducedMotion() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

