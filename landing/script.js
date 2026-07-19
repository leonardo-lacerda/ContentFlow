/* ============================================================
   ContentFlow — Landing interactions (elevated + motion)
   Dependency-free.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Ano no footer ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Nav shadow ---------- */
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
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* ---------- Section "is-in" hooks (cal / channels) ---------- */
  function observeIn(selector, className) {
    var el = document.querySelector(selector);
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add(className || 'is-in');
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add(className || 'is-in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
  }
  observeIn('.cal', 'is-in');
  observeIn('.channels-full__box', 'is-in');
  observeIn('.studio', 'is-in');

  /* ---------- Contadores ---------- */
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
      var t = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      var value = target * eased;
      var display = target % 1 === 0 ? Math.round(value) : value.toFixed(0);
      el.textContent = display + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      cio.observe(el);
    });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll('.faq__item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      faqItems.forEach(function (other) {
        if (other !== item) other.removeAttribute('open');
      });
    });
  });

  /* ---------- Canais (render + stagger delay) ---------- */
  document.querySelectorAll('.channel-list[data-channels]').forEach(function (root) {
    var raw = root.getAttribute('data-channels') || '';
    var idx = 0;
    raw.split(',').forEach(function (name) {
      name = name.trim();
      if (!name) return;
      var el = document.createElement('span');
      el.className = 'channel';
      el.style.animationDelay = Math.min(idx, 18) * 35 + 'ms';
      el.innerHTML = '<i></i>' + name;
      root.appendChild(el);
      idx += 1;
    });
  });

  /* ---------- Calendário mock ---------- */
  var calGrid = document.getElementById('calGrid');
  if (calGrid) {
    var posts = {
      3: 'ig',
      5: 'li',
      8: 'dr',
      11: 'ig',
      14: 'li',
      17: 'ig',
      20: 'li',
      22: 'dr',
      25: 'ig',
      28: 'li',
    };
    var days = 31;
    var i;
    for (i = 1; i <= days; i++) {
      var cell = document.createElement('div');
      cell.className = 'cal__cell';
      cell.textContent = String(i);
      if (posts[i]) {
        cell.classList.add('has-post', 'is-' + posts[i]);
        cell.style.animationDelay = (i % 7) * 40 + 'ms';
      }
      calGrid.appendChild(cell);
    }
  }

  /* ---------- Hero carousel thumbs ---------- */
  var thumbs = Array.prototype.slice.call(
    document.querySelectorAll('#heroThumbs .piece--thumb')
  );
  var heroTitle = document.getElementById('heroTitle');
  var heroMain = document.getElementById('heroMain');
  var titles = thumbs.map(function (t) {
    var s = t.querySelector('span');
    return s ? s.textContent : '';
  });
  var variants = ['piece--cream', 'piece--ink', 'piece--sand', 'piece--white'];
  var current = 0;
  var timer = null;

  var goTo = function (index) {
    if (!thumbs.length || !heroTitle || !heroMain) return;
    current = index;
    heroMain.classList.add('is-swapping');
    window.setTimeout(
      function () {
        heroTitle.textContent = titles[current];
        variants.forEach(function (v) {
          heroMain.classList.remove(v);
        });
        heroMain.classList.add(variants[current % variants.length]);
        heroMain.classList.remove('is-swapping');
      },
      reduceMotion ? 0 : 280
    );
    thumbs.forEach(function (t, i) {
      t.classList.toggle('is-active', i === current);
    });
  };

  var advance = function () {
    goTo((current + 1) % thumbs.length);
  };
  var startTimer = function () {
    stopTimer();
    if (reduceMotion || !thumbs.length) return;
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

  var showcase = document.getElementById('showcase');
  if (showcase) {
    showcase.addEventListener('mouseenter', stopTimer);
    showcase.addEventListener('mouseleave', startTimer);
  }
  startTimer();

  /* ---------- Hero stepper auto progress (subtle) ---------- */
  var stepper = document.getElementById('heroStepper');
  if (stepper && !reduceMotion) {
    var stepItems = Array.prototype.slice.call(
      stepper.querySelectorAll('.stepper__item')
    );
    var stepIdx = 1;
    window.setInterval(function () {
      stepIdx = (stepIdx + 1) % stepItems.length;
      stepItems.forEach(function (el, i) {
        el.classList.remove('is-active', 'is-done');
        if (i < stepIdx) el.classList.add('is-done');
        if (i === stepIdx) el.classList.add('is-active');
      });
    }, 4200);
  }

  /* ---------- URL bar demo (hero + CTA) ---------- */
  function initialsFromHost(host) {
    var clean = host.replace(/^www\./, '').split('.')[0] || 'SB';
    var parts = clean.split(/[-_]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  function prettyName(host) {
    var clean = host.replace(/^www\./, '').split('.')[0] || 'sua marca';
    return clean
      .split(/[-_]/)
      .filter(Boolean)
      .map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  }

  function runUrlDemo(form, input) {
    var raw = (input.value || '').trim();
    if (!raw) {
      input.focus();
      return;
    }
    var host = raw
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();

    form.classList.add('is-loading');
    form.classList.remove('is-done');

    var btn = form.querySelector('button[type="submit"]');
    var original = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Extraindo…';

    var dna = document.querySelector('.dna');
    var dnaName = document.getElementById('dnaName');
    var dnaLogo = document.getElementById('dnaLogo');
    var dnaMeta = document.getElementById('dnaMeta');

    if (dna) dna.classList.add('is-extracting');

    window.setTimeout(
      function () {
        var name = prettyName(host);
        var logo = initialsFromHost(host);
        if (dnaName) dnaName.textContent = name || 'Studio Bloom';
        if (dnaLogo) {
          dnaLogo.textContent = logo || 'SB';
          dnaLogo.classList.remove('is-pop');
          // reflow to restart animation
          void dnaLogo.offsetWidth;
          dnaLogo.classList.add('is-pop');
        }
        if (dnaMeta) dnaMeta.textContent = 'DNA extraído · snapshot v1';

        if (stepper) {
          var items = stepper.querySelectorAll('.stepper__item');
          items.forEach(function (el, idx) {
            el.classList.remove('is-active', 'is-done');
            if (idx <= 1) el.classList.add('is-done');
            if (idx === 2) el.classList.add('is-active');
          });
        }

        form.classList.remove('is-loading');
        form.classList.add('is-done');
        if (btn) btn.textContent = 'DNA pronto ✓';
        if (dna) dna.classList.remove('is-extracting');

        var panel = document.getElementById('heroPanel');
        if (panel) {
          panel.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'nearest',
          });
        }

        window.setTimeout(function () {
          if (btn) btn.textContent = original || 'Extrair DNA';
          form.classList.remove('is-done');
        }, 2200);
      },
      reduceMotion ? 200 : 1100
    );
  }

  function bindUrlForm(formId, inputId) {
    var form = document.getElementById(formId);
    var input = document.getElementById(inputId);
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      runUrlDemo(form, input);
    });
  }

  bindUrlForm('urlBar', 'brandUrl');
  bindUrlForm('ctaBar', 'ctaUrl');

  /* ---------- Content ideas deck (auto + buttons) ---------- */
  var ideas = [
    {
      tag: 'Pilar · Educação',
      title: '3 sinais de que sua marca está invisível no feed',
      desc: 'Ângulo de lista + prova social. Ideal para carrossel de 6 slides.',
    },
    {
      tag: 'Pilar · Bastidores',
      title: 'Como montamos o calendário da semana em 20 minutos',
      desc: 'Processo + checklist. Bom para LinkedIn e carrossel misto.',
    },
    {
      tag: 'Pilar · Oferta',
      title: 'O que muda quando o DNA da marca entra no fluxo',
      desc: 'Antes/depois com CTA claro. Funciona em post único e Stories.',
    },
    {
      tag: 'Pilar · Prova',
      title: '5 métricas que realmente importam no carrossel',
      desc: 'Dados + recomendação. Fecha com CTA de salvar o post.',
    },
  ];

  var ideaIdx = 0;
  var ideaCard = document.getElementById('ideaCard');
  var ideaTag = document.getElementById('ideaTag');
  var ideaTitle = document.getElementById('ideaTitle');
  var ideaDesc = document.getElementById('ideaDesc');
  var ideaBusy = false;
  var ideaTimer = null;

  function fillIdea(i) {
    var item = ideas[i % ideas.length];
    if (ideaTag) ideaTag.textContent = item.tag;
    if (ideaTitle) ideaTitle.textContent = item.title;
    if (ideaDesc) ideaDesc.textContent = item.desc;
  }

  function flipIdea(direction) {
    if (!ideaCard || ideaBusy) return;
    ideaBusy = true;
    var outClass = direction === 'yes' ? 'is-out-right' : 'is-out-left';
    ideaCard.classList.remove('is-enter', 'is-out-left', 'is-out-right');
    void ideaCard.offsetWidth;
    ideaCard.classList.add(outClass);

    window.setTimeout(
      function () {
        ideaIdx = (ideaIdx + 1) % ideas.length;
        fillIdea(ideaIdx);
        ideaCard.classList.remove(outClass);
        ideaCard.classList.add('is-enter');
        ideaBusy = false;
      },
      reduceMotion ? 0 : 320
    );
  }

  document.querySelectorAll('.swipe__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      flipIdea(btn.classList.contains('swipe__btn--yes') ? 'yes' : 'no');
      restartIdeaTimer();
    });
  });

  function restartIdeaTimer() {
    if (ideaTimer) window.clearInterval(ideaTimer);
    if (reduceMotion || !ideaCard) return;
    ideaTimer = window.setInterval(function () {
      flipIdea('yes');
    }, 4800);
  }

  var ideaSwipe = document.getElementById('ideaSwipe');
  if (ideaSwipe) {
    ideaSwipe.addEventListener('mouseenter', function () {
      if (ideaTimer) window.clearInterval(ideaTimer);
    });
    ideaSwipe.addEventListener('mouseleave', restartIdeaTimer);
  }
  restartIdeaTimer();

  /* ---------- Agent typing loop ---------- */
  var typing = document.querySelector('.agent__msg--typing');
  var botMsg = document.querySelector('.agent__msg--bot');
  if (typing && botMsg && !reduceMotion) {
    var showTyping = function () {
      typing.classList.add('is-on');
      if (botMsg) botMsg.style.opacity = '0.35';
      window.setTimeout(function () {
        typing.classList.remove('is-on');
        if (botMsg) {
          botMsg.style.transition = 'opacity .35s ease';
          botMsg.style.opacity = '1';
        }
      }, 1400);
    };
    // first pulse when agent block enters view
    if ('IntersectionObserver' in window) {
      var aio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              showTyping();
              window.setInterval(showTyping, 7000);
              aio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      aio.observe(typing.parentElement || typing);
    }
  }

  /* ---------- Soft parallax on hero floaties ---------- */
  if (!reduceMotion) {
    var floaties = document.querySelectorAll('.floaty');
    var heroVisual = document.querySelector('.hero__visual');
    if (heroVisual && floaties.length) {
      heroVisual.addEventListener('mousemove', function (e) {
        var rect = heroVisual.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        floaties.forEach(function (el, i) {
          var depth = (i + 1) * 6;
          el.style.translate = x * depth + 'px ' + y * depth + 'px';
        });
      });
      heroVisual.addEventListener('mouseleave', function () {
        floaties.forEach(function (el) {
          el.style.translate = '0px 0px';
        });
      });
    }
  }
})();
