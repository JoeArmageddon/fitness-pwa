/* ── Scroll animations ──────────────────────────────── */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.fade-up, .fade-left, .fade-right').forEach(el => {
  observer.observe(el);
});

/* ── Nav scroll state ───────────────────────────────── */
const nav = document.getElementById('nav');
let lastY = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > 60) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
  lastY = y;
}, { passive: true });

/* ── Phone parallax / tilt on mouse ────────────────── */
const heroDevice = document.getElementById('heroDevice');
if (heroDevice) {
  document.addEventListener('mousemove', (e) => {
    const rect = heroDevice.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (e.clientX - centerX) / window.innerWidth;
    const dy = (e.clientY - centerY) / window.innerHeight;
    const tiltX = dy * -10;
    const tiltY = dx * 12;
    heroDevice.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });

  document.addEventListener('mouseleave', () => {
    heroDevice.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    heroDevice.style.transition = 'transform 0.5s ease';
  });
}

/* ── Smooth scroll helper ───────────────────────────── */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Waitlist form ──────────────────────────────────── */
const form = document.getElementById('waitlistForm');
const successEl = document.getElementById('waitlistSuccess');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    const action = form.action;

    // If Formspree not yet configured, just show success (dev mode)
    if (action.includes('YOUR_FORM_ID')) {
      setTimeout(() => {
        form.style.display = 'none';
        successEl.classList.remove('hidden');
      }, 600);
      return;
    }

    try {
      const data = new FormData(form);
      const res = await fetch(action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        form.style.display = 'none';
        successEl.classList.remove('hidden');
      } else {
        btn.textContent = 'Try again';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = 'Try again';
      btn.disabled = false;
    }
  });
}

/* ── Stagger bento cards ────────────────────────────── */
document.querySelectorAll('.bento-grid .bento-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 80}ms`;
});

/* ── Animate bars when phone scrolls into view ──────── */
const barObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.mock-bar-fill, .mock-rank-fill').forEach(bar => {
          const w = bar.style.width;
          bar.style.width = '0%';
          requestAnimationFrame(() => {
            setTimeout(() => { bar.style.width = w; }, 80);
          });
        });
        barObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.3 }
);

document.querySelectorAll('.phone-wrap').forEach(el => barObserver.observe(el));

/* ── Typewriter effect on AI input ─────────────────── */
const typewriterEl = document.querySelector('.typewriter');
if (typewriterEl) {
  const text = typewriterEl.textContent;
  typewriterEl.textContent = '';
  let i = 0;

  const typeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const interval = setInterval(() => {
            typewriterEl.textContent = text.slice(0, ++i);
            if (i >= text.length) clearInterval(interval);
          }, 40);
          typeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  typeObserver.observe(typewriterEl);
}
