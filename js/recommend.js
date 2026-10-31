// 사용자 답변과 식물 조건값을 비교해서 점수가 높은 식물 3개를 고르는 곳

// 물을 며칠 동안 못 줘도 버텨야 하는지 (답변 → 일수). 두 질문 중 더 긴 쪽을 써요.
const CARE_DAYS = { 1: 3, 2: 7, 3: 14 }; // 물 챙기기: 자주 / 가끔 잊음 / 거의 못 챙김
const AWAY_DAYS = { 1: 3, 2: 5, 3: 10 }; // 집 비우기: 거의 없음 / 가끔 / 잦음

// 경험 수준(1 입문자 ~ 4 고수)별로 편하게 키울 수 있는 최대 난이도와,
// 그보다 어려운 식물일 때 한 단계마다 깎는 점수
const COMFORT_DIFFICULTY = { 1: 1, 2: 1, 3: 2, 4: 3 };
const OVER_PENALTY = { 1: 20, 2: 10, 3: 8, 4: 0 };

// 적정 온도 범위에서 이만큼(℃)까지 벗어나도 감점하지 않아요.
// (농사로 온도는 "잘 자라는" 좁은 범위라서 조금 벗어나도 키울 수 있어요)
const TEMP_TOLERANCE = 3;

function neededWaterDays(answers) {
  return Math.max(CARE_DAYS[answers.waterCare], AWAY_DAYS[answers.away]);
}

// 식물 하나의 점수 계산 (높을수록 잘 맞음, 최대 약 100점)
function scorePlant(plant, answers, level) {
  let score = 0;

  // 빛 (25점): 빛이 모자라면 크게, 넘치면 조금 감점
  const lightGap = plant.light - answers.light;
  score += 25 - (lightGap > 0 ? lightGap * 15 : -lightGap * 6);

  // 물 (20점): 식물이 버티는 기간이 필요한 기간보다 짧으면 감점
  const days = neededWaterDays(answers);
  score += plant.waterDays >= days ? 20 : Math.max(0, 20 - (days - plant.waterDays) * 2);

  // 온도 (15점): 적정 온도 범위 ± 여유 폭을 넘어 1℃ 벗어날 때마다 감점
  const t = answers.temp;
  const outside = t < plant.tempMin ? plant.tempMin - t : t > plant.tempMax ? t - plant.tempMax : 0;
  const tempGap = Math.max(0, outside - TEMP_TOLERANCE);
  score += Math.max(0, 15 - tempGap * 3);

  // 습도 (15점): 식물이 더 촉촉한 걸 원하면 크게 감점
  const humGap = plant.humidity - answers.humidity;
  score += 15 - (humGap > 0 ? humGap * 8 : -humGap * 4);

  // 공간 (10점): 자리보다 큰 식물이면 크게 감점
  const sizeGap = plant.size - answers.space;
  score += 10 - (sizeGap > 0 ? sizeGap * 8 : -sizeGap * 3);

  // 난이도 (15점): 경험 수준보다 어려우면 감점, 고수는 어려운 식물에 가산점
  const over = plant.difficulty - COMFORT_DIFFICULTY[level];
  score += over > 0 ? 15 - over * OVER_PENALTY[level] : 15;
  if (level === 4) score += (plant.difficulty - 1) * 4;

  // 반려동물: 안전한지 확인 안 된 식물은 감점 (위험한 식물은 아예 제외)
  if (answers.pet && plant.petSafe === null) score -= 30;

  return score;
}

// 이 식물을 추천하는 이유 후보 (앞에 있을수록 우선)
function reasonsFor(plant, answers, level) {
  const reasons = [];
  const days = neededWaterDays(answers);

  // 집 환경과 잘 맞는 점
  if (answers.light === 1 && plant.light === 1) reasons.push("그늘에서도 잘 자라요");
  if (answers.light === 2 && plant.light === 2) reasons.push("밝은 간접광이 드는 방에 딱 맞아요");
  if (answers.light === 3 && plant.light === 3) reasons.push("햇빛이 잘 드는 방을 좋아해요");
  if (days >= 7 && plant.waterDays >= 14) reasons.push("물을 자주 안 줘도 돼요");
  if (days <= 3 && plant.waterDays <= 5) reasons.push("자주 물을 챙겨주면 더 잘 자라요");
  if (answers.humidity === 1 && plant.humidity === 1) reasons.push("건조한 방에서도 잘 버텨요");
  if (answers.humidity === 3 && plant.humidity === 3) reasons.push("촉촉한 공기를 좋아해요");
  if (answers.temp <= 15 && plant.tempMin <= 15) reasons.push("서늘한 방에서도 잘 지내요");
  if (answers.temp >= 27 && plant.tempMax >= 27) reasons.push("따뜻한 방에서도 잘 지내요");
  if (answers.space === 1 && plant.size === 1) reasons.push("책상 위 작은 자리에 쏙 들어가요");
  if (answers.space === 2 && plant.size === 2) reasons.push("선반이나 창가에 두기 좋은 크기예요");
  if (answers.space === 3 && plant.size === 3) reasons.push("넓은 자리를 시원하게 채워줘요");
  if (plant.waterDays >= days) reasons.push("물 주기가 생활패턴과 잘 맞아요");

  // 경험 수준과 반려동물
  if (level <= 2 && plant.difficulty === 1) reasons.push("처음 키워도 어렵지 않아요");
  if (level === 3 && plant.difficulty >= 2) reasons.push("조금 손이 가지만 키우는 재미가 있어요");
  if (level === 4 && plant.difficulty === 3) reasons.push("고수의 손길에 보답하는 까다로운 식물이에요");
  if (answers.pet && plant.petSafe === true) reasons.push("반려동물과 함께 지내도 안전해요");

  return reasons;
}

// 추천 결과 3개: [{ plant, score, reason }]
function recommendPlants(answers, level) {
  const candidates = PLANTS.filter((p) => !(answers.pet && p.petSafe === false));

  const ranked = candidates
    .map((plant) => ({ plant, score: scorePlant(plant, answers, level) }))
    .sort((a, b) =>
      b.score - a.score ||
      a.plant.difficulty - b.plant.difficulty ||
      a.plant.name.localeCompare(b.plant.name, "ko")
    )
    .slice(0, 3);

  // 카드마다 서로 다른 이유가 나오도록, 앞 카드에서 쓴 이유는 건너뛰기
  const used = new Set();
  ranked.forEach((item) => {
    const reason = reasonsFor(item.plant, answers, level).find((r) => !used.has(r));
    item.reason = reason || "우리 집 환경과 두루 잘 맞아요";
    used.add(item.reason);
  });

  return ranked;
}
