/* 공부 노트 — 작은 보조 스크립트. 꺼져 있어도 글은 다 읽혀요. */
(function () {
  var bar = document.querySelector('.progress i');
  var art = document.querySelector('.prose');
  if (bar && art) {
    var tick = false;
    var upd = function () {
      var r = art.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      tick = false;
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }
  var links = document.querySelectorAll('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var heads = Array.prototype.slice.call(document.querySelectorAll('.prose h2[id]'));
    var setOn = function (id) {
      links.forEach(function (a) { a.classList.remove('on'); a.removeAttribute('aria-current'); });
      if (map[id]) { map[id].classList.add('on'); map[id].setAttribute('aria-current', 'true'); }
    };
    var io = new IntersectionObserver(function () {
      var cur = null;
      heads.forEach(function (h) { if (h.getBoundingClientRect().top <= window.innerHeight * 0.3) cur = h; });
      setOn(cur ? cur.id : heads[0].id);
    }, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    heads.forEach(function (h) { io.observe(h); });
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setOn(heads[heads.length - 1].id);
    }, { passive: true });
    setOn(heads[0].id);
  }
  // 분류 필터: JS 가 있을 때만 탭이 보이고, 없으면 모든 글이 그대로 보여요.
  var bar = document.querySelector('.cats');
  if (bar) {
    var btns = Array.prototype.slice.call(bar.querySelectorAll('button'));
    var items = Array.prototype.slice.call(document.querySelectorAll('.rows li[data-cat]'));
    var note = document.querySelector('.idx .vh');
    var apply = function (cat) {
      var shown = [];
      items.forEach(function (li) {
        var off = cat !== 'all' && li.getAttribute('data-cat') !== cat;
        li.hidden = off; li.classList.remove('first', 'last');
        if (!off) shown.push(li);
      });
      if (shown.length) { shown[0].classList.add('first'); shown[shown.length - 1].classList.add('last'); }
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cat') === cat ? 'true' : 'false'); });
      if (note) note.textContent = (cat === 'all' ? '전체' : cat) + ' 글 ' + shown.length + '편';
    };
    btns.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-cat')); }); });
    bar.hidden = false;
  }
  document.querySelectorAll('.code').forEach(function (box) {
    var head = box.querySelector('.code-head'), pre = box.querySelector('pre');
    if (!head || !pre || !navigator.clipboard) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'copy'; b.textContent = '복사';
    b.addEventListener('click', function () {
      navigator.clipboard.writeText(pre.innerText).then(function () {
        b.textContent = '복사했어요'; setTimeout(function () { b.textContent = '복사'; }, 1600);
      });
    });
    head.appendChild(b);
  });
  // 3D: data-3d 가 있는 페이지에서만, 화면에 가까워질 때 3d/*.js 를 불러와요. 실패하면 정적 대체가 남아요.
  var mounts = document.querySelectorAll('[data-3d]');
  if (mounts.length) {
    var me = document.currentScript || document.querySelector('script[src$="assets/notes.js"]');
    var base = me && me.src ? new URL('3d/', me.src) : null;
    mounts.forEach(function (el) {
      var fail = function () { el.classList.add('is-fallback'); };
      if (!base || !('IntersectionObserver' in window)) return fail();
      var io = new IntersectionObserver(function (es) {
        if (!es.some(function (e) { return e.isIntersecting; })) return;
        io.disconnect();
        import(new URL(el.getAttribute('data-3d') + '.js', base).href)
          .then(function (m) { return m.default(el); })
          .then(function (ok) { if (!ok) fail(); })
          .catch(fail);
      }, { rootMargin: '600px' });
      io.observe(el);
    });
  }
})();
