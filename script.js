/* ============================================================
   Medista — Interactive landing
   Vanilla JS, no dependencies. Easy to extend.
   ============================================================ */

(() => {
  'use strict';

  /* ------------------------------------------------------------
   * Footer year
   * ---------------------------------------------------------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------
   * Nav: scrolled state + mobile toggle
   * ---------------------------------------------------------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ------------------------------------------------------------
   * Reveal on scroll (fast — triggers as soon as element peeks in)
   * ---------------------------------------------------------- */
  const revealTargets = document.querySelectorAll(
    '.feature-card, .collab-card, .how-steps li, .stat,  .report-card'
  );
  revealTargets.forEach((el) => el.classList.add('reveal'));

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -8% 0px' }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('in'));
  }

  /* ------------------------------------------------------------
   * Interactive demo chat
   *
   * Pure mock — no backend. Define answers as a dictionary so
   * we can swap to a real LLM call later without touching markup.
   * Add a new question by appending to ANSWERS and adding a
   * <button class="suggest" data-q="key"> in HTML.
   * ---------------------------------------------------------- */
  const ANSWERS = {
    hba1c: {
      label: "Has my father's HbA1c been improving?",
      reply: `Yes — across <strong>4 reports</strong> from Jan 2023 to Oct 2024, his HbA1c dropped from <strong>8.2%</strong> to <strong>6.9%</strong>. That's now within the healthy target range.`,
      extra: () =>
        bars(
          [
            { label: "Jan '23", val: '8.2%', h: 78 },
            { label: "Jul '23", val: '7.8%', h: 68 },
            { label: "Apr '24", val: '7.3%', h: 54 },
            { label: "Oct '24", val: '6.9%', h: 42, good: true },
          ],
          'HbA1c · 2023 — 2024'
        ),
    },
    overdue: {
      label: "What's overdue for my mother?",
      reply: `Based on her last visits, <strong>3 things</strong> are coming due:`,
      extra: () =>
        list([
          ['Thyroid panel (TSH/T4)', 'Last: 14 months ago'],
          ['Annual eye exam', 'Last: 18 months ago'],
          ['Vitamin D recheck', 'Last: 11 months ago'],
        ]),
    },
    allergy: {
      label: 'Any allergies in the family?',
      reply: `Two recorded across the family:`,
      extra: () =>
        list([
          ['Daughter', 'Peanuts — diagnosed Mar 2023'],
          ['Father', 'Penicillin — flagged Oct 2021'],
        ]),
    },
    ldl: {
      label: 'Compare LDL across the family',
      reply: `Latest LDL readings (mg/dL) — your father's is trending down, yours edged up since last year.`,
      extra: () =>
        bars(
          [
            { label: 'Father', val: '132', h: 60 },
            { label: 'Mother', val: '108', h: 48 },
            { label: 'Self', val: '142', h: 66 },
            { label: 'Daughter', val: '88', h: 36, good: true },
          ],
          'LDL — Most recent'
        ),
    },
  };

  const thread = document.getElementById('demoThread');
  const input = document.getElementById('demoInput');
  const send = document.getElementById('demoSend');
  const suggestionsWrap = document.getElementById('demoSuggestions');

  function bars(items, title) {
    return `
      <div class="chart-card">
        <div class="chart-title">${title}</div>
        <div class="chart-bars">
          ${items
            .map(
              (i) => `
            <div class="cb">
              <div class="cb-fill ${i.good ? 'cb-good' : ''}" style="--h:${i.h}%">
                <span>${i.val}</span>
              </div>
              <span class="cb-date">${i.label}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function list(items) {
    return `
      <div class="records" style="margin-top:12px">
        ${items
          .map(
            ([a, b]) => `
          <div class="rec-row">
            <span class="rec-dot"></span> ${a}
            <i>${b}</i>
          </div>`
          )
          .join('')}
      </div>`;
  }

  function appendUser(text) {
    const el = document.createElement('div');
    el.className = 'msg msg-user';
    el.textContent = text;
    thread.appendChild(el);
    scrollThread();
  }

  function appendTyping() {
    const el = document.createElement('div');
    el.className = 'msg msg-ai';
    el.dataset.typing = 'true';
    el.innerHTML = `
      <div class="msg-ai-label"><span>+</span> MEDISTA</div>
      <div class="typing"><span></span><span></span><span></span></div>`;
    thread.appendChild(el);
    scrollThread();
    return el;
  }

  function appendAI(html, extraHtml = '') {
    const el = document.createElement('div');
    el.className = 'msg msg-ai';
    el.innerHTML = `
      <div class="msg-ai-label"><span>+</span> MEDISTA</div>
      <p>${html}</p>
      ${extraHtml}`;
    thread.appendChild(el);
    scrollThread();
  }

  function scrollThread() {
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }

  function answer(key) {
    const a = ANSWERS[key];
    if (!a) {
      respondFallback(key);
      return;
    }
    appendUser(a.label);
    const typing = appendTyping();
    setTimeout(() => {
      typing.remove();
      appendAI(a.reply, a.extra ? a.extra() : '');
    }, 600);
  }

  function respondFallback(text) {
    appendUser(text);
    const typing = appendTyping();
    setTimeout(() => {
      typing.remove();
      appendAI(
        `I'd answer that the same way once your family's reports are uploaded — grounded in <strong>their actual data</strong>, with sources. Try one of the suggested questions to see a live example.`
      );
    }, 600);
  }

  if (suggestionsWrap) {
    suggestionsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.suggest');
      if (!btn) return;
      suggestionsWrap.querySelectorAll('.suggest').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      answer(btn.dataset.q);
    });
  }

  function handleSend() {
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    const lower = val.toLowerCase();
    const match = Object.keys(ANSWERS).find((k) => lower.includes(k));
    if (match) answer(match);
    else respondFallback(val);
    input.value = '';
  }
  if (send) send.addEventListener('click', handleSend);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
  }

  /* ------------------------------------------------------------
   * Smooth-scroll offset for sticky nav (anchor clicks)
   * ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navH = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navH - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
