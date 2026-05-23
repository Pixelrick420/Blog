/* ─── CURSOR ─────────────────────────────────────────────────────────────────── */
const cursor = document.createElement('div');
cursor.classList.add('cursor');
document.body.appendChild(cursor);

let mouseX = 0, mouseY = 0, curX = 0, curY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateCursor() {
  curX += (mouseX - curX) * 0.18;
  curY += (mouseY - curY) * 0.18;
  cursor.style.left = curX + 'px';
  cursor.style.top  = curY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Hoverable elements
document.querySelectorAll('a, button, input, textarea, .post-card').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
});

/* ─── MOBILE NAV ─────────────────────────────────────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
}

/* ─── HEADER SCROLL SHADOW ───────────────────────────────────────────────────── */
const header = document.querySelector('.site-header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const current = window.scrollY;
  if (current > 60) {
    header.style.borderBottomColor = '#2a2a2a';
  } else {
    header.style.borderBottomColor = 'var(--border)';
  }
  lastScroll = current;
}, { passive: true });

/* ─── WORD COUNT (form pages) ────────────────────────────────────────────────── */
const bodyTextarea = document.getElementById('body');
const wordCountEl  = document.getElementById('wordCount');
const readTimeEl   = document.getElementById('readTimeEst');

if (bodyTextarea && wordCountEl && readTimeEl) {
  function updateCount() {
    const text = bodyTextarea.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const mins  = Math.max(1, Math.ceil(words / 200));
    wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    readTimeEl.textContent  = `~ ${mins} min read`;
    wordCountEl.classList.toggle('active', words > 0);
    readTimeEl.classList.toggle('active', words > 0);
  }
  bodyTextarea.addEventListener('input', updateCount);
  updateCount(); // run on load for edit page
}

/* ─── DELETE MODAL ───────────────────────────────────────────────────────────── */
const deleteBtn   = document.getElementById('deleteBtn');
const deleteForm  = document.getElementById('deleteForm');
const overlay     = document.getElementById('modalOverlay');
const cancelBtn   = document.getElementById('modalCancel');
const confirmBtn  = document.getElementById('modalConfirm');

if (deleteBtn && overlay) {
  deleteBtn.addEventListener('click', () => {
    overlay.classList.add('visible');
  });

  cancelBtn.addEventListener('click', () => {
    overlay.classList.remove('visible');
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('visible');
  });

  confirmBtn.addEventListener('click', () => {
    deleteForm.submit();
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.classList.remove('visible');
  });
}

/* ─── SCROLL REVEAL ──────────────────────────────────────────────────────────── */
// Animate post cards when they scroll into view
const cards = document.querySelectorAll('.post-card');
if ('IntersectionObserver' in window && cards.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.animationPlayState = 'paused';
    io.observe(card);
  });
}

/* ─── FORM INPUT INTERACTIONS ────────────────────────────────────────────────── */
// Auto-grow textarea
document.querySelectorAll('textarea').forEach(ta => {
  ta.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.max(200, this.scrollHeight) + 'px';
  });
});

// Animate label on focus
document.querySelectorAll('.form-input, .form-textarea').forEach(input => {
  const label = input.closest('.form-group')?.querySelector('.form-label');
  if (!label) return;
  input.addEventListener('focus', () => {
    label.style.color = 'var(--red)';
  });
  input.addEventListener('blur', () => {
    label.style.color = '';
  });
});

/* ─── PAGE TRANSITION ────────────────────────────────────────────────────────── */
// Fade out before navigating away
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  // Only same-origin internal links
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
  link.addEventListener('click', function (e) {
    const target = this.getAttribute('href');
    e.preventDefault();
    document.body.style.transition = 'opacity .25s ease';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = target; }, 250);
  });
});

// Fade in on load
window.addEventListener('pageshow', () => {
  document.body.style.transition = 'opacity .35s ease';
  document.body.style.opacity = '1';
});
document.body.style.opacity = '0';
// Trigger the fade-in
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});
