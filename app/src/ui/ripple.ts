/** Ripple de Android para cualquier elemento con la clase .rp */
export function installRipple() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const host = (e.target as Element | null)?.closest<HTMLElement>('.rp');
      if (!host || (host as HTMLButtonElement).disabled) return;
      const r = host.getBoundingClientRect();
      const size = Math.hypot(r.width, r.height) * 2;
      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - r.left - size / 2}px`;
      dot.style.top = `${e.clientY - r.top - size / 2}px`;
      host.append(dot);
      const end = () => {
        dot.classList.add('is-out');
        setTimeout(() => dot.remove(), 400);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
      };
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
    { passive: true },
  );
}
