#!/bin/bash
# 분석 측정을 처음부터 다시 돌려 results/ 에 글로 남김 (약 35분). 큰 중간 파일은 시스템 임시 폴더에 둠.
cd "$(dirname "$0")"; R=results
node exp_levers.js 100 48 > $R/01_결정영향력_100판48주.txt 2>&1
node paired.js > $R/02_결정영향력_짝비교.txt 2>&1
node exp_sens.js 60 > $R/03_능동시스템_민감도_60판96주.txt 2>&1
node exp_long.js 60 144 base > /dev/null 2>&1; node an_long.js base > $R/04_장기_기본봇_60판144주.txt 2>&1; node an_kinds.js base >> $R/04_장기_기본봇_60판144주.txt 2>&1
node exp_long.js 60 144 full > /dev/null 2>&1; node an_long.js full > $R/05_장기_다사는봇_60판144주.txt 2>&1
node exp_tension.js > $R/06_긴장감_메인퀘스트_100판.txt 2>&1
node exp_req.js > $R/07_리퀘스트_수명_60판96주.txt 2>&1
node exp_req2.js > $R/08_리퀘스트_봇여유금.txt 2>&1
node exp_newcomer.js > $R/09_신입모험가_출석.txt 2>&1
node exp_new2.js > $R/10_신입모험가_상주시험.txt 2>&1
node exp_y2.js > $R/11_2년차_칸배분_업그레이드.txt 2>&1
node exp_rep.js > $R/12_의뢰_몬스터_반복.txt 2>&1
node savechk.js > $R/13_저장_수치.txt 2>&1
node exp_drift.js > $R/14_승급시점_최근변경.txt 2>&1
node chk_donate.js > $R/15_첫해_지출_내역.txt 2>&1
node exp_seat.js > $R/16_식당_자리_이용.txt 2>&1
for r in now att3 att6 v1 v2 v3; do node exp_d1.js $r 100 > /dev/null 2>&1; done; node an_d1.js 100 > $R/17_D1_먹으면_더_자주_온다.txt 2>&1
node exp_wallet.js 30 > $R/19_모험가_지갑.txt 2>&1
node exp_grow.js 100 > $R/24_육성_기준값.txt 2>&1
echo done
