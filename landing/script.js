/* ============================================================
   ContentFlow — Landing interactions
   Dependency-free. Sutil e profissional.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Ano no footer ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------- Sombra/borda da nav ao rolar ---------- */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menu mobile ---------- */
  var toggle = document.getElementById('navToggle');
  var mobile = document.getElementById('navMobile');
  if (toggle && mobile && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      mobile.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    };
    toggle.addEventListener('click', function () {
      setOpen(mobile.hidden);
    });
    mobile.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
  }

  /* ---------- Reveal on scroll (IntersectionObserver) ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- FAQ: fecha os outros ao abrir um (accordion) ---------- */
  var faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.removeAttribute('open');
        });
      }
    });
  });

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Contadores animados das métricas ---------- */
  var counters = document.querySelectorAll('[data-count]');
  var runCounter = function (el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    var duration = 1200;
    var start = performance.now();
    var tick = function (now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var cObs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              runCounter(entry.target);
              cObs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach(function (el) { cObs.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- Carrossel do hero (auto-rotação) ---------- */
  var heroMain = document.getElementById('heroMain');
  var heroTitle = document.getElementById('heroTitle');
  var heroThumbs = document.getElementById('heroThumbs');

  if (heroMain && heroTitle && heroThumbs && !reduceMotion) {
    var thumbs = Array.prototype.slice.call(
      heroThumbs.querySelectorAll('.piece--thumb')
    );
    var titles = thumbs.map(function (t) {
      var s = t.querySelector('span');
      return s ? s.textContent : '';
    });
    var current = 0;
    var timer = null;

    var goTo = function (index) {
      if (index === current) return;
      current = index;
      heroMain.classList.add('is-swapping');
      window.setTimeout(function () {
        heroTitle.textContent = titles[current];
        heroMain.classList.remove('is-swapping');
      }, 300);
      thumbs.forEach(function (t, i) {
        t.classList.toggle('is-active', i === current);
      });
    };

    var advance = function () {
      goTo((current + 1) % thumbs.length);
    };

    var startTimer = function () {
      stopTimer();
      timer = window.setInterval(advance, 3600);
    };
    var stopTimer = function () {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    thumbs.forEach(function (thumb, index) {
      thumb.addEventListener('click', function () {
        goTo(index);
        startTimer();
      });
    });

    // Pausa quando o ponteiro está sobre o showcase
    var showcase = document.getElementById('showcase');
    if (showcase) {
      showcase.addEventListener('mouseenter', stopTimer);
      showcase.addEventListener('mouseleave', startTimer);
    }

    startTimer();
  }
})();
