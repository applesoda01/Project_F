# 부록 A. 근거 자료와 검토 범위

> **첨부 개선안 원문 · 신규 제안 / 게임 미반영.** 기준 커밋 `bd7e207`, 2026-11-16 검토 초안. 기존 구현에 관한 서술도 이 기준의 정적 검토이며 이번 작업의 실행 검증 결과가 아닙니다. 숫자는 별도 명시가 없으면 검증용입니다. [자료 안내](README.md)


<p>모든 저장소 링크는 검토 당시 커밋에 고정했다. 문서의 <code>[S번호]</code>는 아래 자료를 가리킨다. 기존 자료에 쓰인 측정 수치는 해당 자료의 당시 조건에 한정되며 이 개선안의 측정 결과가 아니다.</p>
<div class="table-wrap"><table>
<thead>
<tr>
<th>ID</th>
<th>자료</th>
<th>이번 검토에서 사용한 부분</th>
</tr>
</thead>
<tbody>
<tr>
<td>S01</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/00_%EA%B2%8C%EC%9E%84%EA%B0%9C%EC%9A%94.md" rel="noopener noreferrer" target="_blank">v2/00_게임개요.md</a></td>
<td>요약·§1·§2: 자율 육성, 주 단위 시간, 핵심 루프, 최신 F→E 흐름</td>
</tr>
<tr>
<td>S02</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/01_%EB%AA%A8%ED%97%98%EA%B0%80.md" rel="noopener noreferrer" target="_blank">v2/01_모험가.md</a></td>
<td>요약·§1·§7·§8·§9: 자율성, 전직, 애착·거주 불일치, 성향</td>
</tr>
<tr>
<td>S03</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/02_%EC%9D%98%EB%A2%B0.md" rel="noopener noreferrer" target="_blank">v2/02_의뢰.md</a></td>
<td>요약·§1·§2·§6~§8 관련 부분: 분류, 게시, 지명, 갱신 규칙</td>
</tr>
<tr>
<td>S04</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/04_%EC%95%84%EC%9D%B4%ED%85%9C.md" rel="noopener noreferrer" target="_blank">v2/04_아이템.md</a></td>
<td>요약·§1: 개인 장비, 마을 상점, 소재 사용, 요리 발견</td>
</tr>
<tr>
<td>S05</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/05_%EA%B8%B8%EB%93%9C.md" rel="noopener noreferrer" target="_blank">v2/05_길드.md</a></td>
<td>요약·§1~§2: 시설 역할, F·E 업그레이드, 유지비 삭제</td>
</tr>
<tr>
<td>S06</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/06_%EB%A7%88%EC%9D%84.md" rel="noopener noreferrer" target="_blank">v2/06_마을.md</a></td>
<td>요약·§1: 인구 기여, 마을 건물·화면, 구현 범위</td>
</tr>
<tr>
<td>S07</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/07_%EA%B2%BD%EC%A0%9C.md" rel="noopener noreferrer" target="_blank">v2/07_경제.md</a></td>
<td>요약·§1~§6 관련 부분: 중계료, 개인 경제, 지출, 보조금, 장부와 불일치</td>
</tr>
<tr>
<td>S08</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/08_%EA%B8%B8%EB%93%9C%EC%8A%B9%EA%B8%89.md" rel="noopener noreferrer" target="_blank">v2/08_길드승급.md</a></td>
<td>요약·§1·§2: 최신 F→E 조건, 모험가 상한</td>
</tr>
<tr>
<td>S09</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/docs/design/v2/10_UI.md" rel="noopener noreferrer" target="_blank">v2/10_UI.md</a></td>
<td>요약·§1: 기존 책갈피 구조와 UI 책임 분리</td>
</tr>
<tr>
<td>S10</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/prototype/js/game_core.js#L430-L555" rel="noopener noreferrer" target="_blank">game_core.js: 430~555행</a></td>
<td>출발·식사·술·물약·귀환 보상·자동 차익·월 보조금·이탈</td>
</tr>
<tr>
<td>S11</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/prototype/data/balance.csv#L1-L85" rel="noopener noreferrer" target="_blank">balance.csv: 1~85행</a></td>
<td>시작 500G·2명, 의뢰 보상, 중계료 10%, 보조금, 유지비 0, 섭외비·마진</td>
</tr>
<tr>
<td>S12</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/prototype/js/game_core.js#L28-L140" rel="noopener noreferrer" target="_blank">game_core.js: 28~140행</a></td>
<td>초기 상태, 창립 상주, 지갑, 인구 집계, 수수료, 전체 인원 상한</td>
</tr>
<tr>
<td>S13</td>
<td><a href="https://github.com/applesoda01/Project_F/blob/bd7e20769d767771f84d3fbb72bc4e72f1f73e05/prototype/js/game_core.js#L748-L805" rel="noopener noreferrer" target="_blank">game_core.js: 748~805행</a></td>
<td>지명 비용·확률·조건·예약·침공 출발 제한</td>
</tr>
<tr>
<td>S14</td>
<td>사용자 첨부 <code>길드의 수익 구조.md</code></td>
<td>수익원 6개 축, 지출, 사용자 요율 설정, 길드 발주, 매입·위탁, 독점 계약. 홍보비·보험·공제는 취소선 처리</td>
</tr>
</tbody>
</table></div>
