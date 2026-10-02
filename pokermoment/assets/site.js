/* That Moment landing: hero demo.
   Plays the four steps once, then rests on the last one. The visitor can pause, jump to a step or replay.
   Without JS the first frame stays visible and nothing breaks. */
(function () {
  'use strict';
  var stage = document.querySelector('[data-stage]');
  if (!stage) return;

  var buttons = Array.prototype.slice.call(stage.querySelectorAll('[data-go]'));
  var cap = stage.querySelector('[data-cap]');
  var frames = [stage.querySelector('.f0'), stage.querySelector('.f1'), stage.querySelector('.f23')];
  var pp = stage.querySelector('[data-pp]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DUR = [3400, 3200, 3600, 5200];
  var idx = 0, playing = false, ended = false, timer = 0, started = false;

  buttons.forEach(function (b, n) { b.style.setProperty('--dur', DUR[n] + 'ms'); });

  function label() {
    if (!pp) return;
    var key = playing ? 'pause' : (ended ? 'replay' : 'play');
    pp.textContent = pp.getAttribute('data-l-' + key);
    pp.setAttribute('aria-label', pp.getAttribute('data-a-' + key) || pp.textContent);
  }

  function show(i, announce) {
    idx = i;
    stage.setAttribute('data-step', String(i));
    buttons.forEach(function (b, n) {
      b.setAttribute('aria-current', n === i ? 'step' : 'false');
      b.classList.toggle('done', n < i);
    });
    // only the frame that is on screen stays in the accessibility tree
    frames[0].setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
    frames[1].setAttribute('aria-hidden', i === 1 ? 'false' : 'true');
    frames[2].setAttribute('aria-hidden', i >= 2 ? 'false' : 'true');
    if (cap) {
      cap.setAttribute('aria-live', announce ? 'polite' : 'off');
      cap.textContent = buttons[i].getAttribute('data-text');
    }
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!playing) return;
    timer = window.setTimeout(function () {
      if (idx < buttons.length - 1) {
        show(idx + 1, false);
        schedule();
      } else {
        playing = false;
        ended = true;
        stage.setAttribute('data-playing', 'false');
        label();
      }
    }, DUR[idx]);
  }

  function play(from) {
    window.clearTimeout(timer);
    started = true;
    if (typeof from === 'number') show(from, false);
    ended = false;
    playing = true;
    stage.setAttribute('data-playing', 'false');
    // let the bar animation restart from zero
    void stage.offsetWidth;
    stage.setAttribute('data-playing', 'true');
    label();
    schedule();
  }

  function pause() {
    playing = false;
    window.clearTimeout(timer);
    stage.setAttribute('data-playing', 'false');
    label();
  }

  buttons.forEach(function (b, n) {
    b.addEventListener('click', function () {
      started = true;
      ended = n === buttons.length - 1 ? ended : false;
      pause();
      show(n, true);
    });
  });

  if (pp) {
    pp.addEventListener('click', function () {
      if (playing) { pause(); return; }
      play(ended || idx === buttons.length - 1 ? 0 : idx);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cta]'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      stage.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'center' });
      play(0);
    });
  });

  show(0, false);
  label();

  if (!reduce.matches && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !started) { io.disconnect(); play(0); }
      });
    }, { threshold: 0.3 });
    io.observe(stage);
  }
}());
