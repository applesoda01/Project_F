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

  // 아이소메트릭 로비 (2026.11): 배경은 접수대를 오려 낸 두 장 + 접수대 그림 + 탁자·의자 + 리나 5종 + 모험가 9명 × (걷기·서기·앉기)
  const ISO = 'lobby_iso/';
  add('iso_bg', ISO + 'bg.jpg', 1920, 1080, { color: '#d9b783' });
  add('iso_bg_open', ISO + 'bg_open.jpg', 1920, 1080, { color: '#d9b783' });
  add('iso_counter', ISO + 'counter.webp', 320, 220, { color: '#8b5a33' });
  add('iso_table', ISO + 'table.png', 200, 169, { color: '#9a6a3c' });
  add('iso_chair_l', ISO + 'chair_l.png', 138, 202, { color: '#a8784a' });
  add('iso_chair_r', ISO + 'chair_r.png', 138, 202, { color: '#a8784a' });
  // F급 장식 8종 (2026-11-12 자유 배치, 그림은 2배 크기 → 0.5배로 그림. docs/design/guild_interior.md 10-2)
  for (const [k, w, h] of [['plant', 159, 220], ['crest', 122, 180], ['locker', 160, 264], ['banner', 169, 256], ['bench', 216, 193], ['map', 146, 196], ['fireplace', 183, 280], ['trophy', 167, 256]]) add('deco_' + k, 'deco/deco_' + k + '.png', w / 2, h / 2, { optional: true, color: '#8a6a46' });
  add('ui_install', 'ui/deco_menu/deco_install.png', 96, 96, { optional: true, color: '#b06a3a' });   // 건설 연출의 망치 (2026-11-12)
  // 시설 조각 7장 (2026-11-12 롤오버 빛): 원본 배경에서 오려 낸 원래 크기 그림. 위치·윤곽선은 lobby.js FAC_HOT
  for (const [k, w, h] of [['board', 276, 279], ['bar', 326, 267], ['sale', 237, 186], ['doorL', 112, 226], ['doorR', 115, 227], ['doorL_open', 117, 226], ['doorR_open', 114, 227]]) add('hot_' + k, ISO + 'hot/fac_' + k + '.png', w, h, { optional: true, color: '#b08a5a' });
  for (const k of ['idle', 'greet', 'guide', 'paper', 'thanks']) add('iso_lina_' + k, ISO + `lina_${k}.webp`, 2304, 1152, { color: '#6b4a7a' });
  const ISO_CHARS = ['cleric_f', 'rogue_f', 'archer_m', 'mage_m', 'cleric_m', 'rogue_m', 'mage_f', 'warrior_f', 'warrior_m', 'archer_f'];
  const ISO_SZ = {'cleric_f_walk':[1920,400],'cleric_f_idle':[1920,600],'cleric_f_sit':[2160,700],'rogue_f_walk':[1920,400],'rogue_f_idle':[1920,600],'rogue_f_sit':[2160,875],'archer_m_walk':[1920,400],'archer_m_idle':[1920,600],'archer_m_sit':[2160,700],'mage_m_walk':[1920,400],'mage_m_idle':[1920,600],'mage_m_sit':[2160,700],'cleric_m_walk':[1920,400],'cleric_m_idle':[1920,600],'cleric_m_sit':[2160,700],'rogue_m_walk':[1920,400],'rogue_m_idle':[1920,600],'rogue_m_sit':[2160,700],'mage_f_walk':[1920,400],'mage_f_idle':[1920,600],'mage_f_sit':[2160,700],'warrior_f_walk':[1920,400],'warrior_f_idle':[1920,600],'warrior_f_sit':[2160,700],'archer_f_walk':[1920,400],'archer_f_idle':[1920,600],'archer_f_sit':[2160,525],'warrior_m_walk':[1920,400],'warrior_m_idle':[1920,600],'warrior_m_sit':[2160,525]};
  ISO_CHARS.forEach(c => { for (const v of ['walk', 'idle', 'sit']) add(`iso_${c}_${v}`, ISO + `chr/${c}_${v}.webp`, ISO_SZ[c + '_' + v][0], ISO_SZ[c + '_' + v][1], { color: '#7a6a5a' }); });   // 남 전사 서 있기 시트 적용 완료 (2026.11)

  // 길드 바깥 계절·시간대 (2026.11): 바깥 그림 4종(일반·가을·겨울·비)은 방 크기 89%로 맞춰 흐림 5px 처리, 건물 안은 iso_bg 를 마스크로 얹음
  const SKY = 'lobby_iso/season/';
  add('sky_o_day', SKY + 'O_day.jpg', 1920, 1080, { color: '#9ec36a' });
  add('sky_sk_day', SKY + 'SKY_day.png', 1920, 1080, { color: '#8fc0ee' });
  add('sky_lp_day', SKY + 'LP_day.png', 61, 55, { color: '#e8b85a' });
  add('sky_glw_day', SKY + 'GLW_day.png', 104, 99, { color: '#e8b85a' });
  add('sky_o_autumn', SKY + 'O_autumn.jpg', 1920, 1080, { color: '#9ec36a' });
  add('sky_sk_autumn', SKY + 'SKY_autumn.png', 1920, 1080, { color: '#8fc0ee' });
  add('sky_lp_autumn', SKY + 'LP_autumn.png', 60, 55, { color: '#e8b85a' });
  add('sky_glw_autumn', SKY + 'GLW_autumn.png', 102, 96, { color: '#e8b85a' });
  add('sky_o_winter', SKY + 'O_winter.jpg', 1920, 1080, { color: '#9ec36a' });
  add('sky_sk_winter', SKY + 'SKY_winter.png', 1920, 1080, { color: '#8fc0ee' });
  add('sky_lp_winter', SKY + 'LP_winter.png', 70, 66, { color: '#e8b85a' });
  add('sky_glw_winter', SKY + 'GLW_winter.png', 107, 94, { color: '#e8b85a' });
  add('sky_o_rain', SKY + 'O_rain.jpg', 1920, 1080, { color: '#9ec36a' });
  add('sky_sk_rain', SKY + 'SKY_rain.png', 1920, 1080, { color: '#8fc0ee' });
  add('sky_lp_rain', SKY + 'LP_rain.png', 60, 54, { color: '#e8b85a' });
  add('sky_glw_rain', SKY + 'GLW_rain.png', 102, 96, { color: '#e8b85a' });
  add('sky_room', SKY + 'ROOM.png', 1920, 1080);
  add('sky_cloud', SKY + 'cloud.png', 560, 262);
  // 리나 대화 초상 (표정 6종, 상반신)
  for (const f of ['smile', 'serious', 'laugh', 'worried', 'awkward', 'surprised']) add('lina_face_' + f, `npc/lina_face_${f}.png`, 340, 640, { color: '#efe2cf' });

  // 리나 대화 초상 + 눈 깜빡임 (2026.10): 눈 뜬 상반신 한 장 + 얼굴 조각 시트(열: 뜸·반쯤·감김, 행: smile serious laugh worried awkward surprised)
  // 둘 다 읽히면 깜빡임 초상을 쓰고, 하나라도 없으면 위의 lina_face_* 그림으로 대신한다.
  add('lina_stand', 'npc/lina_stand.png', 341, 640, { optional: true });
  add('lina_blink', 'npc/lina_blink.png', 291, 558, { optional: true });

  // 의뢰서 (시안 확정 2026.10)
  for (let i = 0; i < 3; i++) add('quest_paper_' + i, `quest/quest_paper_${i}.png`, 84, 110, { color: '#f3e6c4' });
  for (let i = 0; i < 5; i++) add('quest_stamp_' + i, `quest/quest_stamp_${i}.png`, 44, 44, { color: '#7a5a3a' });
  add('quest_seal', 'quest/quest_seal.png', 30, 30, { color: '#b5332b' });

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
