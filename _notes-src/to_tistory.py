"""공부 노트 글을 티스토리 편집기(HTML 모드)에 붙여넣을 수 있는 HTML 로 바꾼다.

티스토리는 외부 CSS·JS 를 못 쓰므로 스타일을 태그마다 직접 넣는다. 표준 라이브러리만 쓴다.

  python3 _notes-src/to_tistory.py            # tistory/out/<slug>.html, <slug>.meta.json, preview/<slug>.html
  python3 _notes-src/to_tistory.py --links tistory/links.json
      links.json = {"slug": "https://블로그.tistory.com/숫자", ...}  글 사이 링크를 티스토리 주소로 바꾼다
  python3 _notes-src/to_tistory.py --imgs tistory/imgs.json
      imgs.json  = {"info-gates": "https://t1.daumcdn.net/...", ...}  티스토리에 올린 이미지 주소로 바꾼다

이미지 주소를 안 주면 GitHub Pages 에 올라간 주소를 그대로 쓴다(미리보기·임시용).
"""
import json, os, re, sys, html

B = os.path.dirname(os.path.abspath(__file__))
T = os.path.join(B, 'tistory')
SITE = 'https://heysep.github.io/notes/'
ACCENT = '#C6F432'     # 포인트 색. 봇치 팔레트로 바꿀 때는 이 한 줄만 고친다
INK = '#111111'
SOFT = '#e3e3e3'
META = '#505050'


def arg(name):
    if name in sys.argv:
        i = sys.argv.index(name)
        return json.load(open(sys.argv[i + 1], encoding='utf-8'))
    return {}


LINKS = arg('--links')
IMGS = arg('--imgs')
posts = json.load(open(os.path.join(T, 'posts.json'), encoding='utf-8'))


def img_url(name):
    return IMGS.get(name) or SITE + 'assets/img/' + name


def link_url(slug):
    return LINKS.get(slug) or SITE + slug + '/'


def convert(body, post):
    s = body
    # 첫 문단(lead)은 따로 처리
    m = re.match(r'\s*<p class="lead">(.*?)</p>\s*', s, re.S)
    lead = m.group(1)
    s = s[m.end():]
    # 장식용 속성 제거
    s = re.sub(r' (loading|decoding)="[^"]*"', '', s)
    # 이미지: ../assets/img/X.ext → 주소 치환 + 스타일
    def img(mm):
        attrs = mm.group(0)
        src = re.search(r'src="\.\./assets/img/([^"]+)"', attrs)
        alt = re.search(r'alt="([^"]*)"', attrs)
        name = src.group(1)
        return ('<img src="%s" alt="%s" style="display:block;width:100%%;height:auto;'
                'border:1px solid %s;border-radius:10px;background:#fff">' % (img_url(name), alt.group(1) if alt else '', SOFT))
    s = re.sub(r'<img [^>]*src="\.\./assets/img/[^"]+"[^>]*>', img, s)
    s = re.sub(r'<figure class="hero-fig">', '<figure style="margin:1.6em 0">', s)
    s = re.sub(r'<figcaption>', '<figcaption style="margin-top:6px;font-size:.85em;color:%s">' % META, s)
    s = s.replace('<div class="rank-figs">', '<div style="margin:1.6em 0">')
    s = s.replace('<p class="fig-note">', '<p style="font-size:.85em;color:%s">' % META)
    # 글 사이 링크
    s = re.sub(r'href="\.\./([a-z0-9-]+)/"', lambda mm: 'href="%s"' % link_url(mm.group(1)), s)
    # 제목
    s = re.sub(r'<h2>(.*?)</h2>',
               lambda mm: '<h2 style="margin:2.4em 0 .8em;padding-left:12px;border-left:6px solid %s;font-size:1.45em;line-height:1.4">%s</h2>' % (ACCENT, mm.group(1)), s)
    # 문단·목록
    s = s.replace('<p>', '<p style="margin:0 0 1.1em;line-height:1.9">')
    s = s.replace('<ul>', '<ul style="margin:0 0 1.2em;padding-left:1.3em;line-height:1.9">')
    s = s.replace('<li>', '<li style="margin:.3em 0">')
    # 표
    s = s.replace('<div class="table-wrap">', '<div style="margin:1.6em 0;overflow-x:auto">')
    s = s.replace('<table>', '<table style="width:100%;border-collapse:collapse;font-size:.95em">')
    s = s.replace('<th>', '<th style="background:%s;color:#fff;text-align:left;padding:10px 12px">' % INK)
    s = s.replace('<td>', '<td style="padding:10px 12px;border-bottom:1px solid %s;vertical-align:top">' % SOFT)
    # 코드
    s = s.replace('<pre><code>', '<pre style="margin:1.4em 0;padding:16px;background:#f1f1f1;border-radius:8px;overflow-x:auto;line-height:1.65;font-size:.9em"><code>')
    s = re.sub(r'<code>(?!</)', '<code style="background:#f1f1f1;padding:1px 5px;border-radius:4px">', s)
    s = s.replace('<code style="background:#f1f1f1;padding:1px 5px;border-radius:4px">', '<code>', 0)
    # pre 안쪽 code 는 배경을 다시 입히지 않도록 되돌린다
    s = re.sub(r'(<pre[^>]*>)<code style="[^"]*">', r'\1<code>', s)
    # 강조(mark)
    s = s.replace('<mark>', '<mark style="background:%s;color:%s;padding:0 .15em">' % (ACCENT, INK))
    # 핵심 요약 박스
    tl = post.get('tldr') or []
    box = ''
    if tl:
        box = ('<div style="margin:0 0 2em;padding:18px 22px;border:2px solid %s;border-radius:12px;box-shadow:6px 6px 0 %s">'
               '<strong style="display:block;margin-bottom:8px;font-size:.85em;letter-spacing:.08em">핵심 요약</strong>'
               '<ul style="margin:0;padding-left:1.2em;line-height:1.8">%s</ul></div>\n') % (
                   INK, ACCENT, ''.join('<li style="margin:.3em 0">%s</li>' % t for t in tl))
    lead_html = '<p style="margin:0 0 1.6em;font-size:1.08em;line-height:1.9;color:#222">%s</p>\n' % lead
    return lead_html + box + s


def main():
    os.makedirs(os.path.join(T, 'out'), exist_ok=True)
    os.makedirs(os.path.join(T, 'preview'), exist_ok=True)
    done = []
    for p in posts:
        src = os.path.join(B, p['src'])
        raw = open(src, encoding='utf-8').read()
        if p['slug'] == 'chunking-by-format':
            continue  # 청킹 글은 본문에 JS 도식이 섞여 있어 따로 다룬다
        out = convert(raw, p)
        open(os.path.join(T, 'out', p['slug'] + '.html'), 'w', encoding='utf-8').write(out)
        meta = {'slug': p['slug'], 'title': p['title'], 'description': p['desc'],
                'tags': p['tags'] + [p['cat']], 'category': p['category'], 'date': p['date']}
        json.dump(meta, open(os.path.join(T, 'out', p['slug'] + '.meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        page = ('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                '<title>%s</title><body style="max-width:720px;margin:32px auto;padding:0 16px;font-family:Pretendard,system-ui,sans-serif;color:#1a1a1a">'
                '<h1 style="line-height:1.35">%s</h1>%s</body></html>') % (html.escape(p['title']), html.escape(p['title']), out)
        open(os.path.join(T, 'preview', p['slug'] + '.html'), 'w', encoding='utf-8').write(page)
        done.append(p['slug'])
    print('converted:', ', '.join(done))


if __name__ == '__main__':
    main()
