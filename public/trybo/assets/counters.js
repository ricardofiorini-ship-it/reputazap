(() => {
  const section = document.querySelector('.stats-section');
  if (!section) return;
  const counters = [...section.querySelectorAll('[data-count]')];
  const format = new Intl.NumberFormat('pt-BR');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finish = () => counters.forEach(el => { el.textContent = format.format(Number(el.dataset.count)); });
  if (motion.matches || !('IntersectionObserver' in window)) { finish(); return; }
  let started = false;
  const observer = new IntersectionObserver(entries => {
    if (started || !entries.some(entry => entry.isIntersecting)) return;
    started = true;
    observer.disconnect();
    const start = performance.now();
    const duration = 1500;
    function frame(now) {
      if (motion.matches) { finish(); return; }
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      counters.forEach(el => {
        el.textContent = format.format(Math.round(Number(el.dataset.count) * eased));
      });
      if (progress < 1) requestAnimationFrame(frame); else finish();
    }
    counters.forEach(el => { el.textContent = '0'; });
    requestAnimationFrame(frame);
  }, { threshold: 0.15 });
  observer.observe(section);
})();
