# 공부 노트(/notes/) 소스

`/notes/` 아래 HTML·피드는 이 폴더의 `build.py` 가 만든 결과예요. 글을 고치거나 새로 쓸 때는 결과물(`notes/`)을 직접 고치지 말고 여기를 고친 뒤 다시 빌드하세요.

이 폴더(`_notes-src/`)는 밑줄로 시작해서 GitHub Pages(Jekyll)가 서비스하지 않아요. 저장소에는 올라가지만 사이트로는 열리지 않아요.

## 다른 컴퓨터에서 고치기
필요한 것: `git`, `python3`(표준 라이브러리만 써요. 따로 설치할 게 없어요).

```bash
git clone https://github.com/heysep/heysep.github.io
cd heysep.github.io
# 1) 글 고치기: _notes-src/a.html · b.html · c.html (본문), 글 목록·분류·문구는 _notes-src/build.py 위쪽
# 2) 스타일은 _notes-src/notes.css, 동작은 _notes-src/notes.js
python3 _notes-src/build.py          # notes/ 를 다시 만들어요
python3 -m http.server 8801          # http://localhost:8801/notes/ 에서 확인
git add -A && git commit -m "notes: …" && git push
```
- 푸시하면 GitHub Pages 가 몇 분 안에 반영해요.
- 앞으로 **기존 앱 폴더와 `app-ads.txt` 는 건드리지 마세요**(앱스토어 심사 URL 이 걸려 있어요).
- 새 글(특히 앱 개발 글)은 `POST-TEMPLATE-app.md` 를 보세요. 공개해도 되는지 점검하는 체크리스트가 있어요.
- 새 글을 넣을 때 비밀(키, 계정, 서버 주소, 회사·고객 정보)이 들어갔는지 꼭 확인하세요.

## 폴더에 있는 것
- `build.py` — 글 목록 데이터, 분류, 문구, 페이지 조립
- `a.html` `b.html` `c.html` — 글 3편의 본문 조각
- `notes.css` `notes.js` — 스타일과 동작(빌드할 때 `notes/assets/` 로 복사돼요)
- `DESIGN-NOTES.md` — 디자인 요소마다 어떤 레퍼런스에서 왔는지 근거
- `POST-TEMPLATE-app.md` — 앱 개발 글 추가 방법과 공개 전 점검표
- 3D(`notes/assets/3d/`)와 글꼴(`notes/assets/fonts/`)은 빌드 대상이 아니라 `notes/` 에 그대로 있는 정적 파일이에요.
