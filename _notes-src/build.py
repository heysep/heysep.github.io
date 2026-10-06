import os, html, re
B=os.path.dirname(os.path.abspath(__file__))
OUT=os.environ.get('NOTES_OUT') or os.path.join(B,'..','notes')  # NOTES_OUT: 다른 곳에 임시로 빌드해 볼 때만 지정
SITE='https://heysep.github.io/notes/'
NAME='공부 노트'
# 분류(category). 새 분류는 여기에 한 줄 추가. 글이 하나도 없는 분류는 필터 탭에 나타나지 않아요.
CATS=['RAG','1인 앱 개발']
SCOPE='RAG와 1인 앱 개발을 공부하고 만들면서 배운 것을 기록해요.'
posts=[
 dict(slug='chunking-by-format',src='a.html',date='2026-10-06',mins=6,
  title='청킹을 공부하며 알게 된 것: 형식마다 다르게 잘라야 해요',
  desc='표 · JSON · CSV 를 같은 글자 수로 자르면 뜻이 같이 잘려요. 반례 파일을 만들어 눈으로 확인한 기록이에요.'),
 dict(slug='can-i-trust-this-answer',src='b.html',date='2026-10-06',mins=6,
  title='이 답을 믿어도 될까: 근거가 없으면 없다고 말하게 하기',
  desc='근거 없으면 없다고 말하기, 인용을 서버가 검증하기, 거절 판정을 따로 두기. 무엇이 도움이 됐고 무엇은 못 가렸는지 적어요.'),
 dict(slug='why-i-skipped-rls',src='c.html',date='2026-10-06',mins=7,
  title='행 수준 보안(RLS)을 일부러 안 쓰기로 한 이야기',
  desc='여러 고객의 데이터를 한 DB 에 두면서 RLS 를 실험하고, 조용히 틀리는 곳을 발견해 접은 과정이에요.'),
 dict(slug='trust-the-record-not-the-report',src='d.html',date='2026-10-06',mins=6,category='1인 앱 개발',
  title='「다 됐어요」를 믿지 않으려고 훅을 만들었어요',
  desc='문서에 적은 규칙은 안 지켜져서, 세션 기록으로 판정할 수 있는 규칙만 훅으로 옮겼어요. 무엇을 덮고 무엇을 일부러 안 덮는지 적어요.'),
 dict(slug='when-skills-overlap',src='e.html',date='2026-10-06',mins=7,category='1인 앱 개발',
  title='스킬이 겹치면 매번 다른 게 걸려서 서열을 정했어요',
  desc='「다 됐어요」 순간에 스킬 세 개가 동시에 걸렸어요. 역할을 갈라 순서를 정하고, 검수 스킬이 오탐과 못 본 것을 다루는 방식을 적어요.'),
 dict(slug='two-apps-in-toss-ranking',src='f.html',date='2026-10-06',mins=8,category='1인 앱 개발',
  title='앱인토스 순위에 든 두 앱, 커밋을 거꾸로 읽어 봤어요',
  desc='청년미래적금과 적금 메이트의 커밋 이력을 다시 읽고, 무엇이 중요했는지 정리해요. 순위는 시점이 붙은 스냅샷이라는 점부터 적어요.'),
 dict(slug='parallel-agents-with-orca',src='g.html',date='2026-10-07',mins=7,category='1인 앱 개발',
  title='에이전트 하나로는 안 돌아가서 워크트리로 갈랐어요',
  desc='여러 일을 한 세션에서 시키니 맥락이 섞였어요. ORCA로 워크트리를 나누고 다른 모델에게 검증을 맡긴 과정과, 확인 못 한 것을 적어요.'),
]

import shutil
for p in posts: p.setdefault('category','RAG')  # 글 데이터에 category 가 없으면 RAG
posts[0].update(cat='검색 품질',tags=['청킹','RAG'])
posts[1].update(cat='답의 신뢰',tags=['근거','인용'])
posts[2].update(cat='설계 결정',tags=['데이터 격리','PostgreSQL'])
posts[3].update(cat='AI 작업 환경',tags=['훅','검증'])
posts[4].update(cat='스킬 설계',tags=['스킬','검수'])
posts[5].update(cat='앱 성과',tags=['앱인토스','광고'])
posts[6].update(cat='병렬 에이전트',tags=['ORCA','워크트리'])
CODE_LABELS={('a.html',0):'CSV',('a.html',1):'JSON',('b.html',0):'화면 예시'}
def dk(d):
    y,m,dd=d.split('-'); return f'{y}.{int(m):02d}.{int(dd):02d}'
for n,p in enumerate(posts,1): p['no']=f'{n:02d}'
for p in posts: assert p['category'] in CATS,p['category']
CNT={c:sum(1 for p in posts if p['category']==c) for c in CATS}
HAVE=[c for c in CATS if CNT[c]]
def have_note():
    # 아직 글이 없는 분류가 있으면 사실대로 알려요. 글이 생기면 이 문장은 저절로 사라져요.
    return '' if len(HAVE)==len(CATS) else f' 지금은 {" · ".join(HAVE)} 글이 있어요.'
posts[0]['hl']='형식마다 다르게'; posts[1]['hl']='근거가 없으면 없다고'; posts[2]['hl']='일부러 안 쓰기로'; posts[3]['hl']='훅을 만들었어요'; posts[4]['hl']='서열을 정했어요'; posts[5]['hl']='커밋을 거꾸로'; posts[6]['hl']='워크트리로 갈랐어요'
def title_html(p):
    t=html.escape(p['title']); h=html.escape(p['hl']); assert h in t
    return t.replace(h,'<mark>'+h+'</mark>',1)
def head(title,desc,prefix,extra='',threed=False,section=''):
    return f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta property="og:type" content="{'article' if extra=='article' else 'website'}">
<meta property="og:site_name" content="{NAME}">
<meta property="og:locale" content="ko_KR">{(chr(10)+'<meta property="article:section" content="'+html.escape(section)+'">') if section else ''}
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#FFFFFF">
<link rel="alternate" type="application/atom+xml" title="{NAME}" href="{prefix}feed.xml">
<!-- 파비콘 자리: 아직 없어요. 만들면 <link rel="icon" href="{prefix}assets/favicon.svg"> 를 여기에 -->
<link rel="stylesheet" href="{prefix}assets/fonts/fonts.css">
<link rel="stylesheet" href="{prefix}assets/notes.css">
{('<link rel="stylesheet" href="'+prefix+'assets/3d/3d.css">'+chr(10)+'<noscript><style>.hero-3d-fb{display:block}</style></noscript>'+chr(10)) if threed else ''}<script src="{prefix}assets/notes.js" defer></script>
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
'''
def top(prefix,cur):
    c=lambda k:' aria-current="page"' if k==cur else ''
    return f'''<header class="site-head"><div class="in">
<a class="brand" href="{prefix}">{NAME}</a>
<nav class="site-nav" aria-label="사이트"><a href="{prefix}"{c('list')}>글 목록</a><a href="{prefix}about/"{c('about')}>소개</a><a href="{prefix}feed.xml">RSS</a></nav>
</div></header>
'''
def foot(prefix):
    return f'''<footer class="site-foot blk"><div class="foot-row">
<p>RAG와 1인 앱 개발을 공부하며 적는 개인 기록이에요. 틀린 내용이 있을 수 있어요. 글꼴은 Pretendard · Inter Tight · JetBrains Mono(SIL OFL 1.1)예요.</p>
<nav aria-label="푸터"><a href="{prefix}">글 목록</a><a href="{prefix}about/">소개</a><a href="{prefix}feed.xml">RSS</a></nav>
</div></footer>
</body>
</html>
'''
def w(rel,s):
    p=os.path.join(OUT,rel); os.makedirs(os.path.dirname(p),exist_ok=True); open(p,'w').write(s)
def labels(p):
    return ' '.join(f'<span class="lb">{html.escape(t)}</span>' for t in p['tags'])
def row(p,prefix):
    return f'''<li data-cat="{html.escape(p['category'])}"><a class="row" href="{prefix}{p['slug']}/"><span class="n"><span class="lb">No.</span><b>{p['no']}</b></span><span class="t">{html.escape(p['title'])}<span class="d">{html.escape(p['desc'])}</span></span><span class="g lb"><b>{html.escape(p['category'])}</b><span><time datetime="{p['date']}">{dk(p['date'])}</time> / {p['mins']} MIN</span></span></a></li>
'''

import math, random
def hero_svg():
    # JS·WebGL 이 안 될 때의 정적 대체. 점 구름 하나(선·파동 없음).
    r=random.Random(20261006)
    centers=[(-1.55,.5,.3),(.05,1.4,-.8),(1.6,.45,.55),(.5,-1.25,.9),(-.9,-1.15,-.9)]
    colk=[0,1,0,2,1]; yaw=.6
    def proj(x,y,z):
        X=x*math.cos(yaw)+z*math.sin(yaw); Z=-x*math.sin(yaw)+z*math.cos(yaw)
        f=9.0/(9.0-Z*0.6); return 400+X*f*95, 320-y*f*95, f
    out=[]
    for k,c in enumerate(centers):
        for i in range(34):
            x,y,z=c[0]+r.gauss(0,.34),c[1]+r.gauss(0,.3),c[2]+r.gauss(0,.34)
            X,Y,f=proj(x,y,z)
            out.append(f'<circle class="k{colk[k]}" cx="{X:.0f}" cy="{Y:.0f}" r="{2+1.6*f*r.random():.1f}"/>')
    return '<svg class="hero-3d-fb" viewBox="0 0 800 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">'+''.join(out)+'</svg>'

STAGE={
 'rows':[['이름','분류','메모'],['라온','공지','첫째 줄|둘째 줄은 이어진 글'],['미르','행사','간단 메모'],['새봄','안내','접수 마감']],
 'a':[{'lines':['이름,분류,메모','라온,공지,'],'tag':'행이 중간에서 끊겨요'},
      {'lines':['"첫째 줄','둘째 줄은 이어진'],'tag':'열 이름 없음 · 셀이 갈라져요'},
      {'lines':['글"','미르,행사,간단 메모'],'tag':'열 이름 없음'},
      {'lines':['새봄,안내,접수 마감'],'tag':'열 이름 없음'}],
 'b':[{'cells':[['이름','라온'],['분류','공지'],['메모','첫째 줄 둘째 줄은 이어진 글']]},
      {'cells':[['이름','미르'],['분류','행사'],['메모','간단 메모']]},
      {'cells':[['이름','새봄'],['분류','안내'],['메모','접수 마감']]}],
}
def stage_html():
    e=html.escape
    src=''.join('<tr>'+''.join((f'<th scope="col">{e(v)}</th>' if k==0 else f'<td>{e(v.replace("|"," "))}</td>') for v in row)+'</tr>' for k,row in enumerate(STAGE['rows']))
    src=src.replace('<tr><th','<thead><tr><th',1).replace('</th></tr>','</th></tr></thead><tbody>',1)+'</tbody>'
    acards=''.join('<li>'+''.join(f'<span class="ln">{e(l)}</span>' for l in c['lines'])+f'<span class="tg">{e(c["tag"])}</span></li>' for c in STAGE['a'])
    bcards=''.join('<li>'+''.join(f'<span class="cell"><b>{e(n)}</b>{e(v)}</span>' for n,v in c['cells'])+'</li>' for c in STAGE['b'])
    return f"""<figure class="cut-fig" id="chunk-fig" aria-labelledby="chunk-fig-cap">
<div class="cut-src"><p class="cut-h">원본 표 (지어낸 값)</p><table>{src}</table></div>
<div class="cut-cols">
<section class="cut-col cut-a" aria-label="글자 수로 자르면"><p class="cut-h">① 글자 수로 자르면</p><p class="cut-s">길이만 보고 일정하게 잘라요. 셀 한가운데서 끊기고, 조각 대부분에 열 이름이 없어요.</p><ol>{acards}</ol></section>
<section class="cut-col cut-b" aria-label="구조 보고 자르면"><p class="cut-h">② 구조 보고 자르면</p><p class="cut-s">행을 가운데서 자르지 않고, 조각마다 열 이름을 같이 둬요.</p><ol>{bcards}</ol></section>
</div>
<figcaption id="chunk-fig-cap">그림: 같은 장난감 표를 글자 수로 자를 때(점선 칸이 조각 하나)와 구조를 보고 자를 때예요. 값은 모두 지어낸 것이에요.</figcaption>
</figure>
"""
# assets
for f in ('notes.css','notes.js'): shutil.copy(os.path.join(B,f),os.path.join(OUT,'assets',f))
# list
TOPIC={'병렬 에이전트':'에이전트 여러 개를 동시에 돌리면서 작업공간을 나누고 서로를 검증하게 한 방법이에요. 못 재 본 것도 같이 적어요.','앱 성과':'만든 앱이 어떤 성과를 냈는지, 커밋을 거꾸로 읽으면서 무엇이 중요했는지 정리해요. 숫자는 시점과 범위를 붙여서 적어요.','스킬 설계':'AI 에게 주는 규칙 문서(스킬)가 겹치고 어긋날 때 어떻게 정리했는지, 직접 쓰고 고친 기록이에요.','AI 작업 환경':'AI 에게 일을 시킬 때 규칙이 실제로 지켜지는지 기록으로 확인하는 방법이에요. 만들어 보고 한계까지 적어요.','검색 품질':'자료를 어떻게 자르고 색인하느냐에 따라 같은 질문의 답이 달라져요. 잘못 잘린 자리를 눈으로 찾아본 기록이에요.',
 '답의 신뢰':'근거가 없을 때 없다고 말하게 하고, 인용이 진짜인지 서버가 확인하게 하는 방법을 적어요.',
 '설계 결정':'선택지를 놓고 실험하고, 무엇을 고르고 무엇을 버렸는지 이유와 함께 남겨요.'}
topics=''.join(f'''<li><h3>{html.escape(p['cat'])}</h3><p>{TOPIC[p['cat']]}</p><a href="{p['slug']}/" aria-label="{html.escape(p['title'])} 읽기">이 주제의 글 읽기</a></li>
''' for p in posts)
def cats_html():
    # 분류가 2개 이상일 때만 만들어요(1개면 고를 것이 없어요). 처음엔 hidden — JS 가 켜져야 보여요.
    if len(HAVE)<2: return ''
    b=lambda c,label,n,on='false':f'<button type="button" data-cat="{html.escape(c)}" aria-pressed="{on}"><span class="lb">{html.escape(label)}</span><span class="ct lb">{n:02d}</span></button>'
    return '<div class="cats" role="group" aria-label="분류로 거르기" hidden>'+b('all','All',len(posts),'true')+''.join(b(c,c,CNT[c]) for c in HAVE)+'</div>\n<p class="vh" role="status" aria-live="polite"></p>\n'
w('index.html',head(NAME+' — RAG와 1인 앱 개발 공부 기록',SCOPE.replace('기록해요.','기록하는 개인 블로그예요.'),'',threed=True)
 + top('./','list') + f'''<main id="main">
<div class="blk hero-stage">
<div class="blk-top"><span class="lb">Notes</span><span class="lb">2026 / {len(posts):02d} entries</span></div>
<section class="hero">
<h1>만들면서 배운 것을, 나중에 <mark>다시 읽으려고</mark> 적어요</h1>
<p>{SCOPE}{have_note()}</p>
</section>
<ul class="blk-foot" style="list-style:none;margin:0;padding:0" aria-label="다루는 주제"><li class="lb">RAG</li><li class="lb">청킹</li><li class="lb">근거와 인용</li><li class="lb">데이터 격리</li><li class="lb">PostgreSQL</li></ul>
<div class="hero-3d" data-3d="hero" aria-hidden="true">{hero_svg()}</div>
</div>
<section class="idx" aria-label="글 목록">
<div class="idx-h lb"><span>Index</span><span>No.01 – No.{len(posts):02d}</span></div>
{cats_html()}<ul class="rows">
{''.join(row(p,'./') for p in posts)}</ul>
</section>
<section class="split"><h2><span class="lb">Topics</span>이런 걸 기록해요</h2>
<ul class="topics-l">
{topics}</ul></section>
<section class="split flip"><h2><span class="lb">Rules</span>글을 쓰는 규칙</h2>
<ul class="rules-l">
<li><strong>확인한 것만 써요</strong>시도하고 확인한 것만 적고, 못 한 건 「확인 못 했어요」라고 적어요.</li>
<li><strong>예시는 지어낸 것이에요</strong>실제 고객이나 대화 데이터는 쓰지 않아요.</li>
<li><strong>출처를 달아요</strong>다른 도구의 동작은 공식 문서를 확인하고 링크를 달아요.</li>
</ul></section>
</main>
'''+foot('./'))
# about
w('about/index.html',head('소개 — '+NAME,'RAG와 1인 앱 개발을 공부하고 만들면서 배운 것을 기록하는 블로그예요. 무엇을 다루고 글을 어떻게 쓰는지 짧게 적어요.','../')
 + top('../','about') + f'''<main id="main">
<div class="blk page-head"><div class="blk-top"><span class="lb">About</span><span class="lb">2026</span></div><h1>소개</h1></div>
<div class="page"><aside class="lb">heysep</aside><div class="page-body">
<p>공부하고 만들면서 배운 것을, 나중에 내가 다시 읽을 수 있게 적어 둬요.</p>
<h2>다루는 분류</h2>
<ul>
<li><strong>RAG</strong> — 검색 증강 생성을 직접 만들면서 부딪힌 문제와 선택을 적어요.{' 글은 '+str(CNT['RAG'])+'편이에요.' if CNT['RAG'] else ' 아직 올라온 글이 없어요.'}</li>
<li><strong>1인 앱 개발</strong> — 혼자 앱을 만들고 내놓는 과정에서 배운 것을 적어요.{' 글은 '+str(CNT['1인 앱 개발'])+'편이에요.' if CNT['1인 앱 개발'] else ' 아직 올라온 글이 없어요.'}</li>
</ul>
<h2>글을 쓰는 규칙</h2>
<ul>
<li>시도하고 확인한 것만 써요. 확인하지 못한 건 「확인 못 했어요」라고 적어요.</li>
<li>예시와 실험 데이터는 전부 지어낸 것이에요. 실제 고객이나 대화 데이터는 쓰지 않아요.</li>
<li>정확한 수치와 설정값은 일부러 적지 않고, 무엇을 왜 했는지와 방향만 적어요.</li>
<li>다른 도구의 동작을 말할 때는 공식 문서를 확인하고 링크를 달아요.</li>
</ul>
<p>RSS 로 구독할 수 있어요. <a href="../feed.xml">feed.xml</a></p>
</div></div>
</main>
'''+foot('../'))
# posts
def prep(src,body):
    m=re.match(r'\s*<p class="lead">(.*?)</p>\s*',body,re.S)
    lead=m.group(1); body=body[m.end():]
    ids=[]
    def h2(mm):
        i=len(ids)+1; ids.append((f's{i}',mm.group(1)))
        return f'<h2 id="s{i}">{mm.group(1)}<a class="anchor" href="#s{i}" aria-label="이 절의 링크">#</a></h2>'
    body=re.sub(r'<h2>(.*?)</h2>',h2,body)
    n=[0]
    def pre(mm):
        lab=CODE_LABELS.get((src,n[0]),'코드'); n[0]+=1
        return f'<div class="code"><div class="code-head"><span>{lab}</span></div>{mm.group(0)}</div>'
    body=re.sub(r'<pre>.*?</pre>',pre,body,flags=re.S)
    body=body.replace('<div class="table-wrap">','<div class="table-wrap" role="region" aria-label="표(가로로 스크롤할 수 있어요)" tabindex="0">')
    return lead,body,ids
for i,p in enumerate(posts):
    raw=open(os.path.join(B,p['src'])).read()
    if p['slug']=='chunking-by-format':
        assert raw.count('<h2>작은 예시로 보면</h2>')==1
        raw=raw.replace('<h2>작은 예시로 보면</h2>',stage_html()+'\n<h2>작은 예시로 보면</h2>')
    lead,body,ids=prep(p['src'],raw)
    rel=f"{p['slug']}/"
    tocl=''.join(f'<li><a href="#{k}">{t}</a></li>' for k,t in ids)
    same=[q for q in posts if q['category']==p['category']]; k=same.index(p)   # 이전·다음은 같은 분류 안에서
    prv=same[k-1] if k>0 else None; nxt=same[k+1] if k<len(same)-1 else None
    pn=''.join(f'<a class="{c}" href="../{q["slug"]}/"><span class="dir">{d} / No.{q["no"]}</span><span class="tt">{html.escape(q["title"])}</span></a>' for c,d,q in (('prev','이전 글',prv),('next','다음 글',nxt)) if q)
    rest=[q for q in same if q is not p and q is not prv and q is not nxt]+[q for q in posts if q['category']!=p['category']]  # 같은 분류 먼저
    more=''
    if rest:
        more='<div class="sec-h"><h2>다른 글</h2></div><ul class="rows">'+''.join(row(q,'../') for q in rest)+'</ul>'
    w(rel+'index.html',head(p['title']+' — '+NAME,p['desc'],'../','article',section=p['category'])
      + top('../','') + f'''<div class="progress" aria-hidden="true"><i></i></div>
<main id="main">
<article>
<header class="blk post-head">
<span class="big-no" aria-hidden="true">{p['no']}</span>
<div class="blk-top"><span class="lb">No.{p['no']} / {html.escape(p['category'])} / {html.escape(p['cat'])}</span><span class="lb"><time datetime="{p['date']}">{dk(p['date'])}</time></span></div>
<div><h1>{title_html(p)}</h1>
<p class="lead">{lead}</p></div>
<p class="blk-foot" style="margin:0"><span class="lb">By heysep</span><span class="lb">{p['mins']} min read</span>{labels(p)}</p>
</header>
<div class="post-grid">
<nav class="toc" aria-label="이 글의 목차"><h2>Contents</h2><ol>{tocl}</ol></nav>
<div class="prose">
<details class="toc-m"><summary>Contents</summary><ol>{tocl}</ol></details>
{body}</div>
</div>
</article>
<div class="post-end">
{('<div class="pn'+(' one' if not(prv and nxt) else '')+'">'+pn+'</div>') if pn else ''}
{more}
<a class="back" href="../">글 목록으로 돌아가기</a></div>
</main>
'''+foot('../'))
# feed
ents=''.join(f'''<entry>
<title>{html.escape(p['title'])}</title>
<link href="{SITE}{p['slug']}/"/>
<id>{SITE}{p['slug']}/</id>
<updated>{p['date']}T09:00:00+09:00</updated>
<category term="{html.escape(p['category'])}" label="{html.escape(p['category'])}"/>
<summary>{html.escape(p['desc'])}</summary>
</entry>
''' for p in posts)
w('feed.xml',f'''<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ko">
<title>{NAME}</title>
<subtitle>RAG와 1인 앱 개발을 공부하고 만들면서 배운 것의 기록</subtitle>
<link href="{SITE}feed.xml" rel="self"/>
<link href="{SITE}"/>
<id>{SITE}</id>
<updated>{max(p['date'] for p in posts)}T09:00:00+09:00</updated>
<author><name>heysep</name></author>
{ents}</feed>
''')
print('ok')
