/* 말풍선 대사 (M2-8)
   상황(수주·출발·성공·실패·레벨업·승급·식사·첫 방문·잡담/소문) × 말투(성향)로 한마디를 고른다.
   말투는 성향에서 정함: 무모 → 호탕, 신중 → 조심, 사교적 → 다정, 독불장군 → 무뚝뚝, 그 외 → 보통.
   대사는 데이터처럼 이 표만 고치면 된다. */
(function (root) {
  'use strict';
  const TONE_NAME = { bold: '호탕', careful: '조심', friendly: '다정', loner: '무뚝뚝', plain: '보통' };
  const L = {
    accept: {
      bold: ['이 정도는 식은 죽 먹기지!', '제일 센 걸로 줘요!', '빨리 끝내고 올게!'],
      careful: ['조건부터 다시 볼게요…', '이건 해볼 만하겠네요.', '무리는 안 하겠습니다.'],
      friendly: ['다 같이 가면 금방이죠!', '이 의뢰, 같이 할 사람?', '리나 씨, 이걸로 할게요!'],
      loner: ['…이걸로.', '혼자로 충분해.', '접수 부탁하지.'],
      plain: ['이 의뢰 맡을게요!', '이걸로 할게요.', '접수 부탁드려요.']
    },
    depart: {
      bold: ['가자아!', '금방 돌아온다!'], careful: ['준비물 다 챙겼지?', '조심해서 다녀올게요.'],
      friendly: ['다녀오겠습니다~!', '다들 힘내자!'], loner: ['…간다.', '다녀오지.'], plain: ['다녀오겠습니다!', '출발!']
    },
    success: {
      bold: ['역시 나야!', '싱거웠는걸?'], careful: ['무사히 끝났어요.', '계획대로였어요.'],
      friendly: ['다들 수고했어!', '해냈어요, 리나 씨!'], loner: ['…끝났다.', '보고하지.'], plain: ['다녀왔습니다!', '의뢰 완료!']
    },
    fail: {
      bold: ['다음엔 안 진다!', '쳇, 운이 없었어.'], careful: ['…무리였나 봐요.', '준비가 부족했어요.'],
      friendly: ['미안해요, 실패했어요…', '그래도 다들 무사해요.'], loner: ['…실패다.', '말할 것 없다.'], plain: ['…실패했어요.', '면목 없네요.']
    },
    levelup: { bold: ['몸이 가벼워!'], careful: ['조금 늘었네요.'], friendly: ['레벨 올랐어요!'], loner: ['…강해졌군.'], plain: ['레벨이 올랐다!'] },
    gradeup: { bold: ['이제 진짜 시작이다!'], careful: ['승급… 해냈네요.'], friendly: ['저 승급했어요!'], loner: ['…당연하지.'], plain: ['승급했다!'] },
    meal: { bold: ['고기! 고기 주세요!'], careful: ['든든히 먹고 가야죠.'], friendly: ['같이 먹자!'], loner: ['…밥.'], plain: ['배부터 채우자!'] },
    drink: { bold: ['한 잔 더!'], careful: ['따뜻한 차 한 잔이요.'], friendly: ['다 같이 한 잔 해요!'], loner: ['…물.'], plain: ['한 잔 주세요!'] },
    first: { bold: ['여기가 길드냐!'], careful: ['저, 처음 왔는데요…'], friendly: ['안녕하세요! 잘 부탁해요!'], loner: ['…등록하러 왔다.'], plain: ['여기가 길드인가요?'] },
    chat: {
      bold: ['다음엔 더 큰 놈 잡아야지', '심심한데 의뢰 없나'], careful: ['장비 손질해야겠다', '무리하면 안 돼'],
      friendly: ['여기 분위기 좋다~', '리나 씨 오늘도 바쁘네'], loner: ['…', '…시끄럽군'], plain: ['오늘은 무슨 의뢰가 있으려나', '배고프다…']
    }
  };
  // 소문 한마디: 성향과 무관, 세계관 정보를 흘림 (잡담 중 일부 확률로)
  const RUMOR = ['북쪽 숲에 늑대가 늘었대', '옆 마을 길드는 문 닫았다던데', '옛 용사 파티 얘기 들었어?', '광산에서 이상한 빛이 났대', '왕국에서 보조금이 늘었다나 봐'];

  function tone(a) { if (!a) return 'plain'; if (a.risk === 2) return 'bold'; if (a.risk === 0) return 'careful'; if (a.social === 2) return 'friendly'; if (a.social === 0) return 'loner'; return 'plain'; }
  function line(a, ev, seed) {
    if (ev === 'chat' && Math.random() < 0.3) return RUMOR[Math.floor(Math.random() * RUMOR.length)];
    const set = (L[ev] || L.chat)[tone(a)] || L[ev].plain;
    const i = seed != null ? Math.abs(seed) % set.length : Math.floor(Math.random() * set.length);
    return set[i];
  }
  root.Speech = { line, tone, TONE_NAME };
})(this);
