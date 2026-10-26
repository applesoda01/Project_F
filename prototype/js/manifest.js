/* 리소스 매니페스트 (M2-1)
   - 모든 좌표·크기는 화면 기준 1920×1080 단위. 그림 파일은 @2x로 넣어도 되며, 그릴 때 w·h로 맞춘다.
   - ax, ay: 기준점(0~1). 인물·가구는 발밑 가운데(0.5, 1).
   - 파일이 없거나 읽기에 실패하면 같은 크기의 임시 그래픽(color + 이름표)으로 대신 그린다.
   - 리소스를 바꿀 때는 같은 파일명으로 덮어쓰기만 하면 된다. */
(function (root) {
  'use strict';
  const M = {};
  const add = (key, src, w, h, o) => { M[key] = Object.assign({ src, w, h, ax: 0, ay: 0, color: '#b9a37e' }, o || {}); };

  // 로비 레이어
  add('lobby_wall', 'lobby/lobby_wall.png', 1920, 1080, { color: '#e8d6b4' });           // 벽+바닥+게시판 (현재 한 장)
  add('lobby_counter', 'lobby/lobby_counter.png', 1920, 178, { color: '#8b5a33' });      // 카운터 앞면 (y=372에 놓음)
  add('npc_lina_idle', 'npc/npc_lina_idle.png', 200, 300, { ax: 0.5, ay: 0, color: '#6b4a7a' });
  // 접수원 리나 (2026.10 교체): 128 셀 시트, 발밑 y=122, 캐릭터 키 108 (모험가와 같은 비율). 256 업스케일본도 그대로 읽음
  const RECEP = { cell: 128, pivotY: 122, charH: 108, cols: 12, rows: 6, fps: 24 };
  add('recep_idle', 'npc/receptionist_idle_blink.png', 384, 128, { optional: true, sheet: Object.assign({}, RECEP, { cols: 3, rows: 1 }) });
  for (const k of ['greet_a', 'guide_a', 'guide_b', 'read_a', 'read_b']) add('recep_' + k, `npc/receptionist_${k}.png`, 1536, 768, { optional: true, sheet: RECEP });

  // 리나 대화 초상 (표정 6종, 상반신)
  for (const f of ['smile', 'serious', 'laugh', 'worried', 'awkward', 'surprised']) add('lina_face_' + f, `npc/lina_face_${f}.png`, 340, 640, { color: '#efe2cf' });

  // 의뢰서 (시안 확정 2026.10)
  for (let i = 0; i < 3; i++) add('quest_paper_' + i, `quest/quest_paper_${i}.png`, 84, 110, { color: '#f3e6c4' });
  for (let i = 0; i < 5; i++) add('quest_stamp_' + i, `quest/quest_stamp_${i}.png`, 44, 44, { color: '#7a5a3a' });
  add('quest_seal', 'quest/quest_seal.png', 30, 30, { color: '#b5332b' });

  // 가구
  for (const lv of [1, 2]) {
    add(`table_lv${lv}`, `furniture/table_lv${lv}.png`, 200, 179, { ax: 0.5, ay: 1, color: '#9a6a3c' }); // 확정 탁자(2026.10): 둥근 상판+기둥, 레벨 2는 임시로 같은 그림
    add(`chair_lv${lv}_front`, `furniture/chair_lv${lv}_front.png`, 72, 132, { ax: 0.5, ay: 1, color: '#a8784a' });
    add(`chair_lv${lv}_back`, `furniture/chair_lv${lv}_back.png`, 72, 132, { ax: 0.5, ay: 1, color: '#a8784a' });
    add(`chair_lv${lv}_side_l`, `furniture/chair_lv${lv}_side_l.png`, 71, 132, { ax: 0.5, ay: 1, color: '#a8784a' }); // 왼쪽 자리 의자(오른쪽=탁자를 봄)
    add(`chair_lv${lv}_side_r`, `furniture/chair_lv${lv}_side_r.png`, 71, 132, { ax: 0.5, ay: 1, color: '#a8784a' }); // 오른쪽 자리 의자(왼쪽=탁자를 봄)
  }

  // 모험가 SD (1차 직업 5종 × 남녀 × 앞·뒤)
  const CLS = ['warrior', 'archer', 'mage', 'cleric', 'rogue'];
  const CCOL = ['#4a78b8', '#4f8f4a', '#7a4fa8', '#e0d6b8', '#3f3f4f'];
  CLS.forEach((c, i) => {
    for (const sex of ['f', 'm']) for (const dir of ['front', 'back'])
      add(`chr_${c}_${sex}_${dir}`, `chr/chr_${c}_${sex}_${dir}.png`, 136, 250, { ax: 0.5, ay: 1, color: CCOL[i] });
  });

  // 걷기 시트 (선택): chr_<직업>_<성별>_walk.png — 3072×512, 셀 128, 24프레임 × 4행(아래·왼쪽·오른쪽·위), 30fps, 발밑 y=122.
  // 파일이 없으면 임시 그래픽을 만들지 않고, 정지 SD 그림을 통통 튀게 움직이는 방식으로 대신한다.
  const WALK = { cell: 128, cols: 24, rows: ['down', 'left', 'right', 'up'], fps: 30, pivotY: 122, charH: 108, stepPx: 29 };
  CLS.forEach(c => { for (const sex of ['f', 'm']) add(`chr_${c}_${sex}_walk`, `chr/chr_${c}_${sex}_walk.png`, 3072, 512, { optional: true, sheet: WALK }); });

  root.ASSET_MANIFEST = { base: 'assets/', items: M, CLS, WALK };
})(this);
