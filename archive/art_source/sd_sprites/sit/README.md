# SD 스프라이트 앉기 모션 (플랜 B)

- 대상: 9종 (cleric_f, rogue_f, warrior_m, archer_m, mage_m, cleric_m, rogue_m, mage_f, warrior_f). **archer_f는 제외**(활 처리 미정).
- 방식: ComfyUI + LTX 2.5, 시작 프레임=서 있는 원본, 끝 프레임=앉은 자세(LTXVAddGuide). 의자는 포함하지 않음(게임에서 그림).
- `<char>/sit_NN.png`: 앉기 구간 프레임(NN=0부터, 서 있음 → 앉은 자세 + 안정화 6프레임). 캔버스 720×700 RGBA, 의자 기준 정렬 완료.
- 일어서기 = 프레임 역재생. 앉아 있는 숨쉬기·깜빡임은 코드로 구현 예정.
- `aligned/`: 앉은 최종 자세 이미지와 meta.json (의자 중심 x=360, 바닥 y=620, 의자 높이 390).
- `sit_chair_placement.json`: 캐릭터별 의자 오프셋(dx, dy).
- 채택 시드: cleric_f s3006, rogue_f s3000, warrior_m s3000, archer_m s3002, mage_m s3000, cleric_m s3002, rogue_m s3002, mage_f s3002, warrior_f sitkf2_s3000.
- 알려진 한계: mage_m은 중간에 몸이 기울고, cleric_m은 옷단에 원형 흔적이 약하게 남음.
- 걷기·여궁수 작업은 이 브랜치에 포함하지 않음.
