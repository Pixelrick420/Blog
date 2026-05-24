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

/* ─── QUILL EDITOR (form pages) ──────────────────────────────────────────────── */
const editorEl = document.getElementById('editor-container');
let quill = null;

if (editorEl) {
  quill = new Quill('#editor-container', {
    modules: {
      toolbar: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote', 'link'],
        ['clean']
      ]
    },
    theme: 'snow',
    placeholder: 'Write with conviction…'
  });

  const form = document.querySelector('.post-form');
  if (form) {
    form.addEventListener('submit', function () {
      document.getElementById('body').value = quill.root.innerHTML;
    });
  }
}

/* ─── WORD COUNT (form pages) ────────────────────────────────────────────────── */
const bodyTextarea = document.getElementById('body');
const wordCountEl  = document.getElementById('wordCount');
const readTimeEl   = document.getElementById('readTimeEst');

if (wordCountEl && readTimeEl) {
  function updateCount() {
    let text;
    if (quill) {
      text = quill.getText().trim();
    } else if (bodyTextarea) {
      text = bodyTextarea.value.trim();
    } else {
      return;
    }
    const words = text ? text.split(/\s+/).length : 0;
    const mins  = Math.max(1, Math.ceil(words / 200));
    wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    readTimeEl.textContent  = `~ ${mins} min read`;
    wordCountEl.classList.toggle('active', words > 0);
    readTimeEl.classList.toggle('active', words > 0);
  }
  if (quill) {
    quill.on('text-change', updateCount);
  } else if (bodyTextarea) {
    bodyTextarea.addEventListener('input', updateCount);
  }
  updateCount();
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

/* ─── LIKE / SHARE ───────────────────────────────────────────────────────────── */
const PIXEL_HEART = [0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,0,0,1,0,0];

function setPixelHeart(container, liked) {
  const pixels = container.querySelectorAll('.pixel');
  pixels.forEach((p, i) => p.classList.toggle('on', liked && PIXEL_HEART[i]));
}

const likeBtn = document.querySelector('.like-btn');
if (likeBtn) {
  likeBtn.addEventListener('click', async function () {
    const postId = this.dataset.postId;
    try {
      const res = await fetch(`/posts/${postId}/like`, { method: 'POST' });
      const data = await res.json();
      this.querySelector('.like-count').textContent = data.count;
      setPixelHeart(this.querySelector('.pixel-heart'), data.liked);
      this.classList.toggle('liked', data.liked);
    } catch (_) {}
  });
}



const shareBtn = document.querySelector('.share-btn');
if (shareBtn) {
  shareBtn.addEventListener('click', function () {
    const url = window.location.origin + '/posts/' + this.dataset.id;
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        const orig = this.textContent;
        this.textContent = 'Copied!';
        setTimeout(() => { this.textContent = orig; }, 2000);
      }).catch(() => {});
    }
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
// Auto-grow textarea (skip hidden body when Quill is present)
document.querySelectorAll('textarea').forEach(ta => {
  if (ta.style.display === 'none') return;
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
