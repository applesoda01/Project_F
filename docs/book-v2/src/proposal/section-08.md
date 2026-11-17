# 8. 정산 규칙과 계산 예시

> **첨부 개선안 원문 · 신규 제안 / 게임 미반영.** 기준 커밋 `bd7e207`, 2026-11-16 검토 초안. 기존 구현에 관한 서술도 이 기준의 정적 검토이며 이번 작업의 실행 검증 결과가 아닙니다. 숫자는 별도 명시가 없으면 검증용입니다. [자료 안내](README.md)


<h3>8.1 일반 외부 의뢰 — 개인 배분 기준액</h3>
<p>의뢰 보상 총액을 <code>R</code>, 파티원 수를 <code>n</code>, 모험가 i의 수수료 차감 전 배분 기준액을 <code>B_i</code>라고 한다.</p>
<pre><code class="language-text">B_i = R을 파티원에게 균등 분배한 금액
자유 모험가 i의 길드 몫 = B_i × 일반 중계료율
정식 모험가 i의 길드 몫 = B_i × 계약상 길드 배분율
모험가 i의 실수령액 = B_i − 해당 길드 몫
길드 의뢰 수입 = 모든 참가자의 길드 몫 합계
</code></pre>
<p><strong>정식 계약 배분율은 일반 중계료를 포함한 최종 비율</strong>로 정의한다. 일반 10%를 먼저 떼고 정식 30%를 또 떼지 않는다. 계약원 1명이 파티 전체 보상에 30%의 권리를 발생시키는 것도 아니다.</p>
<p>정수 G를 사용하므로 균등 배분 잔액은 고정된 참가자 ID 순서 등 재현 가능한 규칙으로 배분한다. 길드 몫은 개인 기준액에 정해진 반올림 규칙을 적용하고, 개인 실수령액은 차액으로 계산한다. <strong>길드 몫 + 모든 개인 몫 = 원래 보상 총액</strong>이 항상 같아야 한다.</p>
<h3>8.2 혼성 파티 예시</h3>
<p>총 보상 1,000G, 자유 2명·정식 2명, 일반 중계료 10%, 정식 계약 길드 몫 30%라고 가정한다. 모두 계산 설명용이다.</p>
<div class="table-wrap"><table>
<thead>
<tr>
<th>참가자</th>
<th style="text-align:right">개인 배분 기준액</th>
<th style="text-align:right">길드 몫</th>
<th style="text-align:right">개인 실수령액</th>
</tr>
</thead>
<tbody>
<tr>
<td>자유 A</td>
<td style="text-align:right">250G</td>
<td style="text-align:right">25G</td>
<td style="text-align:right">225G</td>
</tr>
<tr>
<td>자유 B</td>
<td style="text-align:right">250G</td>
<td style="text-align:right">25G</td>
<td style="text-align:right">225G</td>
</tr>
<tr>
<td>정식 C</td>
<td style="text-align:right">250G</td>
<td style="text-align:right">75G</td>
<td style="text-align:right">175G</td>
</tr>
<tr>
<td>정식 D</td>
<td style="text-align:right">250G</td>
<td style="text-align:right">75G</td>
<td style="text-align:right">175G</td>
</tr>
<tr>
<td>합계</td>
<td style="text-align:right"><strong>1,000G</strong></td>
<td style="text-align:right"><strong>200G</strong></td>
<td style="text-align:right"><strong>800G</strong></td>
</tr>
</tbody>
</table></div>
<p>정식 C·D의 정기 보수와 지원비는 별도 길드 지출이다. 이 의뢰에서 200G가 들어왔다고 200G 전체를 순이익으로 표시하지 않는다.</p>
<p>모험가 보상 분배는 출발 때 확정한 계약·요율 스냅샷을 사용한다. 수행 중 계약 종료나 정책 변경이 있어도 보상을 귀환 시점의 새로운 조건으로 갈아 끼우지 않는다.</p>
<h3>8.3 정식 편입의 손익분기</h3>
<p>정식 계약의 경제성을 비교할 때 보상 총액 전체가 아니라 <strong>그 사람의 월간 개인 배분 기준액 합계 <code>S</code></strong>를 사용한다.</p>
<pre><code class="language-text">자유 상태의 길드 기여 = f × S
정식 상태의 길드 기여 = r × S − 정기 보수 − 실제 지원비
전환으로 늘어난 직접 기여 = (r − f) × S − 정기 보수 − 실제 지원비
</code></pre>
<p>일반 10%, 정식 30%, 월 보수 40G, 실제 지원비 20G를 가정하면 다음과 같다. 영입금·섭외비 절감·추가 의뢰·보조금·전리품 효과는 제외한 단순 비교다.</p>
<div class="table-wrap"><table>
<thead>
<tr>
<th style="text-align:right">월간 개인 배분 기준액 S</th>
<th style="text-align:right">자유 상태 길드 기여</th>
<th style="text-align:right">정식 상태 길드 기여</th>
<th style="text-align:right">전환 차이</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:right">0G</td>
<td style="text-align:right">0G</td>
<td style="text-align:right">−60G</td>
<td style="text-align:right">−60G</td>
</tr>
<tr>
<td style="text-align:right">100G</td>
<td style="text-align:right">10G</td>
<td style="text-align:right">−30G</td>
<td style="text-align:right">−40G</td>
</tr>
<tr>
<td style="text-align:right">300G</td>
<td style="text-align:right">30G</td>
<td style="text-align:right">30G</td>
<td style="text-align:right">0G</td>
</tr>
<tr>
<td style="text-align:right">600G</td>
<td style="text-align:right">60G</td>
<td style="text-align:right">120G</td>
<td style="text-align:right">+60G</td>
</tr>
</tbody>
</table></div>
<p>이 가정에서는 직접 수익만으로 비교한 손익분기점이 <code>S = 60 ÷ 0.2 = 300G</code>다. <strong>실제 지원비가 0인 달에는 20G를 지출로 잡지 않는다.</strong> 위 0G 사례는 부상·대기 중 생활·치료 지원 20G가 실제 발생한 경우다.</p>
<p>현재 F급 보상 100G 의뢰를 4명이 나누면 개인 기준액은 25G다. 네 번 성공해도 그 사람의 S는 100G이지 400G가 아니다. 앞선 단순 고용 예시처럼 파티 전체 보상에 한 사람의 배분율을 적용하면 정식 영입의 수익성을 과대평가한다.</p>
<p>보다 완전한 비교에는 다음을 추가한다.</p>
<pre><code class="language-text">추가 가치 = 기존 지명 섭외비 절감
          + 계약원 확보로 새로 수행한 외부 사업의 추가 공헌
          + 가용성·지원으로 줄인 실제 손실
추가 비용 = 영입금 + 계약 때문에 늘어난 운영비 + 추가 장비·치료 비용
</code></pre>
<p>예컨대 기존 F급 섭외비가 20G라면 계약 범위 내 지명 두 번은 최대 40G의 <strong>길드 지출 절감</strong>이 될 수 있다. 이는 보조금처럼 새 돈이 지급되는 것이 아니다. 반대로 그 사람이 이미 거의 섭외되지 않던 모험가라면 절감 효과도 작다. 실제 이용 건수로만 계산한다. [S11, S13]</p>
<h3>8.3-1 모험가 쪽에서도 계약할 이유가 있어야 한다</h3>
<p>같은 예시를 모험가 입장에서 보면, 월 개인 배분 기준액이 300G일 때 자유 상태 현금 수입은 270G이고, 정식 상태는 의뢰 210G + 기본 보수 40G = 250G다. 여기에 실제로 필요한 지원 20G를 받으면 경제적 편익이 비슷해질 수 있지만, 지원은 개인 지갑에 들어오는 현금이 아니다.</p>
<p>반면 S가 600G인 숙련자는 자유 상태 540G와 정식 상태 현금 460G를 비교한다. 지원 20G가 본인에게 그만큼 가치가 있어도 총 편익은 480G여서 자유 활동보다 적다. 이런 인재는 더 좋은 보수·지원·업무 조건을 요구하거나 계약을 거절하는 것이 자연스럽다.</p>
<p>따라서 길드에 이익인 계약이 모험가에게도 항상 매력적이라고 가정하지 않는다. 영입·갱신은 최근 개인 순수입, 실제로 필요한 지원, 안정적인 보수의 가치와 계약상 제약을 함께 비교한다. 유망주를 좋은 조건에 육성한 뒤에는 성장에 맞는 재계약 요구가 생긴다. 이를 막기 위해 성장 전의 싼 계약을 영구 유지시키지 않는다.</p>
<h3>8.4 상단 장기 계약 — 관리비와 수행 보수를 분리</h3>
<p><strong>예시:</strong> 상단이 한 달 계약금 300G를 맡긴다. 이 중 60G는 ‘합의한 인력 확보·관리’ 대가이고, 240G는 호위 4회 × 회당 60G의 수행 보수다. 이것은 실제 밸런스 제안이 아니라 정산 형식 설명이다.</p>
<p>선수금 300G를 즉시 길드 이익으로 넣지 않고 예치금으로 보관한다. 길드가 확보 의무는 지켰으나 호위는 3회만 성공했으며, 1회 실패 시 관리비에서 15G를 배상한다고 가정한다.</p>
<div class="table-wrap"><table>
<thead>
<tr>
<th>처리</th>
<th style="text-align:right">금액</th>
</tr>
</thead>
<tbody>
<tr>
<td>완료 3회 수행자 지급</td>
<td style="text-align:right">180G</td>
</tr>
<tr>
<td>미완료 1회분 환급</td>
<td style="text-align:right">60G</td>
</tr>
<tr>
<td>관리비에서 차감하는 배상</td>
<td style="text-align:right">15G</td>
</tr>
<tr>
<td>길드 관리 대가 순수입</td>
<td style="text-align:right">45G</td>
</tr>
<tr>
<td>합계</td>
<td style="text-align:right"><strong>300G</strong></td>
</tr>
</tbody>
</table></div>
<p>길드 순수입 45G에서도 정기 보수·실제 지원·기타 직접비는 별도 차감한다. 수행 보수 180G에는 이 계약의 관리비가 이미 분리돼 있으므로 <strong>일반 중계료나 정식 30%를 다시 떼지 않는다.</strong> 계약별 정산 방식 중 하나만 적용한다.</p>
<p>성과 보너스는 계약 체결 때 ‘수행자 풀 / 길드 성과 보수’로 분리한다. 원래 인력 확보 의무를 지키지 못했다면 관리비 60G도 전액 인정되지 않게 조건을 명시한다. 장기 계약은 수익뿐 아니라 예약한 전력을 다른 곳에 쓸 수 없는 기회비용을 갖는다.</p>
<h3>8.5 길드 발주 정산</h3>
<p>소재 확보 보상 200G를 걸었다면 게시 때 200G를 예약하고, 납품 성공 시 길드 현금 −200G·수행자 지갑 합계 +200G로 처리한다. 길드 창고에는 지정 물품이 들어온다. 길드 수수료 +20G, 보조금 +160G를 추가하지 않는다.</p>
<p>정식 계약원을 활용하는 경우에는 <code>급여에 포함된 지정 업무 + 필요한 실비</code>인지 <code>별도 보수 200G가 있는 업무</code>인지 발주 때 선택한 표준 계약으로 표시한다. 같은 임무에 자동으로 두 가지 보수를 겹쳐 지급하지 않는다. 다만 명시한 정기 기본 보수는 정상적으로 유지한다.</p>
<h3>8.6 지명 섭외비 정리</h3>
<p>기존 자유 모험가의 섭외비(거절해도 지출)는 우선 유지한다. 현재 확인 코드에는 수취인의 지갑 입금이 없으므로 다음 중 의미를 정해야 한다. [S13]</p>
<p><strong>초기 추천은 ‘섭외 운영비’로 명시</strong>하는 것이다. 연락·준비·행정 비용이며, 현재 동작과 가장 가깝다. 정식 계약 범위 내 요청은 이 비용이 정기 운영에 포함되어 별도 지출하지 않는다.</p>
<p>이를 ‘모험가에게 지급하는 응답·대기료’로 바꾼다면 개인 지갑 입금을 추가하고, 거절할수록 개인 돈이 늘어나는 효과를 별도 검증해야 한다. 이 변경을 단순 문구 수정으로 취급하지 않는다.</p>
