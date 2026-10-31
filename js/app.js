// 게임 진행 중 기억해둘 값들
const state = {
  level: null,   // 경험 수준: 1 입문자 / 2 초보자 / 3 중급자 / 4 고수
  answers: {},   // 질문 key별 답변 값 (예: { light: 2, pet: true })
  step: 0,       // 지금 몇 번째 질문인지 (0부터 시작)
  selectedPlant: null, // 상세보기에서 고른 식물
  selectedShop: null,  // 구매 화면에서 고른 꽃집
  returnTo: {},        // 화면별 "← 돌아가기"로 갈 화면 (예: { "screen-collection": "screen-start" })
};

const LEVEL_NAMES = { 1: "입문자", 2: "초보자", 3: "중급자", 4: "고수" };
const STAGE_NAMES = ["", "씨앗", "떡잎", "본잎", "무럭무럭", "다 자랐어요!"];
const STAGE_COUNT = 5;

function currentScreen() {
  return document.querySelector(".screen.is-active").id;
}

// 화면 하나만 보이게 바꾸기
function showScreen(id) {
  // 게임을 안 하고 결과 화면으로 가려 하면 시작 화면으로
  if (id === "screen-result" && !state.level) id = "screen-start";

  // 구매·도감 화면은 어디서 왔는지 기억해 뒀다가 "←"로 돌아가요
  // (주문 완료 화면에서 왔으면, 구매를 시작했던 화면으로 돌아가요)
  let from = currentScreen();
  if (from === "screen-done") from = state.returnTo["screen-shop"];
  if ((id === "screen-shop" || id === "screen-collection") && from && from !== id) {
    state.returnTo[id] = from;
  }

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === id);
  });
  window.scrollTo(0, 0);
  if (id === "screen-result") renderResult();
  if (id === "screen-collection") renderCollection();
  if (id === "screen-done") document.getElementById("done-result-btn").hidden = !state.level;
}

// ===== 시작 화면 =====
document.querySelectorAll(".level-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.level = Number(btn.dataset.level);
    startGame();
  });
});

// data-go="화면id"가 붙은 버튼은 그 화면으로 이동
document.querySelectorAll("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.go));
});

// ===== 게임 화면 =====
function startGame() {
  state.answers = {};
  state.step = 0;
  renderGame();
  showScreen("screen-game");
}

// 답한 개수에 따라 새싹 단계(1~5) 정하기: 7개 다 답하면 5단계
function stageFor(answeredCount) {
  return 1 + Math.round((answeredCount * (STAGE_COUNT - 1)) / QUESTIONS.length);
}

function renderGame() {
  const total = QUESTIONS.length;
  const done = state.step >= total;

  // 진행 막대
  document.getElementById("progress-fill").style.width = (state.step / total) * 100 + "%";
  document.getElementById("progress-text").textContent = Math.min(state.step + 1, total) + " / " + total;
  document.getElementById("back-btn").disabled = state.step === 0;

  // 새싹 그림
  const stage = stageFor(state.step);
  document.getElementById("sprout-img").src = "./assets/sprout/stage" + stage + ".svg";
  document.getElementById("stage-name").textContent = STAGE_NAMES[stage];

  document.getElementById("question-card").hidden = done;
  document.getElementById("game-done").hidden = !done;
  if (done) return;

  // 질문과 선택지
  const q = QUESTIONS[state.step];
  document.getElementById("question-action").textContent = q.icon + " " + q.action;
  document.getElementById("question-text").textContent = q.text;

  const list = document.getElementById("option-list");
  list.innerHTML = "";
  q.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = '<span class="option-emoji"></span><span></span>';
    btn.children[0].textContent = option.emoji;
    btn.children[1].textContent = option.label;
    btn.addEventListener("click", () => answer(q.key, option.value));
    list.appendChild(btn);
  });
}

function answer(key, value) {
  state.answers[key] = value;
  state.step += 1;
  renderGame();
  playGrow();
}

// 이전 질문으로 돌아가기
document.getElementById("back-btn").addEventListener("click", () => {
  if (state.step === 0) return;
  state.step -= 1;
  delete state.answers[QUESTIONS[state.step].key];
  renderGame();
});

// 새싹이 쑥 자라는 움직임 다시 재생
function playGrow() {
  ["sprout-img", "grow-pop"].forEach((id) => {
    const el = document.getElementById(id);
    const cls = id === "sprout-img" ? "grow" : "show";
    el.classList.remove(cls);
    void el.offsetWidth; // 움직임을 처음부터 다시 시작하게 하는 요령
    el.classList.add(cls);
  });
}

// ===== 결과 화면 =====
const LIGHT_LABELS = { 1: "그늘 OK", 2: "밝은 간접광", 3: "햇빛 좋아함" };
const DIFFICULTY_LABELS = { 1: "쉬움", 2: "보통", 3: "어려움" };

function petLabel(petSafe) {
  if (petSafe === true) return "🐾 반려동물 안전";
  if (petSafe === false) return "⚠️ 반려동물 주의";
  return "❓ 반려동물 확인 필요";
}

function renderResult() {
  // 내가 고른 답변을 작은 이름표로 보여주기
  const chips = document.getElementById("answer-chips");
  chips.innerHTML = "";
  const labels = ["🌱 " + LEVEL_NAMES[state.level]];
  QUESTIONS.forEach((q) => {
    const option = q.options.find((o) => o.value === state.answers[q.key]);
    if (option) labels.push(q.icon + " " + option.label);
  });
  labels.forEach((text) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = text;
    chips.appendChild(chip);
  });

  // 추천 카드 3장
  const list = document.getElementById("plant-cards");
  list.innerHTML = "";
  recommendPlants(state.answers, state.level).forEach((item, i) => {
    const p = item.plant;
    const card = document.createElement("article");
    card.className = "plant-card";
    card.appendChild(createPlantImage(p, "plant-thumb"));

    const body = document.createElement("div");
    body.className = "plant-body";
    body.innerHTML = `
      <div class="plant-rank">추천 ${i + 1}</div>
      <h3 class="plant-name">${p.name}</h3>
      <p class="plant-summary">${p.summary}</p>
      <p class="plant-reason">✔ ${item.reason}</p>
      <ul class="plant-facts">
        <li>☀️ ${LIGHT_LABELS[p.light]}</li>
        <li>💧 약 ${p.waterDays}일에 한 번</li>
        <li>⭐ ${DIFFICULTY_LABELS[p.difficulty]}</li>
        <li>${petLabel(p.petSafe)}</li>
        <li>⏳ 수명: ${p.lifespan || "확인 중"}</li>
      </ul>
      ${p.source === "AI 초안" ? '<span class="draft-badge">AI 초안 정보</span>' : ""}
      <button class="btn btn-sub btn-small detail-btn">자세히 보기</button>
    `;
    body.querySelector(".detail-btn").addEventListener("click", () => openDetail(p));
    card.appendChild(body);
    list.appendChild(card);
  });
}

// ===== 상세보기 =====
const LIGHT_DETAIL = { 1: "그늘에서도 괜찮아요", 2: "밝은 간접광을 좋아해요", 3: "햇빛을 많이 좋아해요" };
const HUMIDITY_DETAIL = { 1: "건조해도 괜찮아요", 2: "보통 습도", 3: "촉촉한 공기를 좋아해요" };
const DIFFICULTY_STARS = { 1: "★☆☆ 쉬움", 2: "★★☆ 보통", 3: "★★★ 어려움" };
const PET_DETAIL = { true: "함께 지내도 안전해요", false: "주의가 필요해요 (먹으면 해로울 수 있어요)", null: "아직 확인 중이에요" };
const NONGSARO_SOURCE = "농촌진흥청 농사로 「실내정원용 식물」";

// 농사로 원문을 초보자도 알기 쉬운 말로
const WATER_PLAIN = {
  wet: "흙이 늘 젖어 있게 해 주세요",
  moist: "흙이 마르지 않게 촉촉하게 유지해 주세요",
  surface: "흙 겉면이 마르면 흠뻑 주세요",
  dry: "화분 속 흙까지 거의 마르면 흠뻑 주세요",
};

// 흙 상태별 물 주기 확인 방법
const WATER_HOW = {
  wet: "흙이 마르지 않도록 매일 확인해 주세요",
  moist: "마르기 전에 자주 확인해 주세요 (보통 2~3일)",
  surface: "손가락을 흙에 2~3cm 넣어 보고, 말라 있으면 흠뻑 주세요",
  dry: "나무젓가락을 흙 깊이 꽂았다 빼서, 젖은 흙이 묻어나지 않으면 흠뻑 주세요",
};

// 농사로 원문이 있으면 원문 문구로, 없으면(AI 초안) 일수로 흙 상태 종류를 정해요.
function waterKind(text, days) {
  if (text) {
    if (text.includes("축축")) return "wet";
    if (text.includes("촉촉")) return "moist";
    if (text.includes("대부분")) return "dry";
    return "surface";
  }
  if (days <= 1) return "wet";
  if (days <= 3) return "moist";
  if (days <= 10) return "surface";
  return "dry";
}

function waterPeriod(days) {
  if (days <= 1) return "거의 매일";
  if (days <= 3) return "보통 2~3일쯤";
  if (days <= 5) return "보통 4~5일쯤";
  if (days <= 8) return "보통 일주일쯤";
  if (days <= 11) return "보통 열흘쯤";
  if (days <= 16) return "보통 2주쯤";
  if (days <= 24) return "보통 3주쯤";
  return "보통 한 달쯤";
}

function waterHTML(p) {
  const text = p.waterTextSpringSummer;
  const kind = waterKind(text, p.waterDays);
  // "촉촉" 확인 방법에는 이미 기간이 들어 있어서 기간 줄을 따로 쓰지 않아요.
  const period = kind === "moist" ? "" : `<p class="water-period">(${waterPeriod(p.waterDays)})</p>`;

  // 원문이 있으면 쉬운 말을 크게, 원문은 아래에 작게. 없으면(AI 초안) 대략 기간만.
  let html = text
    ? `<p class="water-main">${WATER_PLAIN[kind]}</p>${period}`
    : `<p class="water-main">${waterPeriod(p.waterDays)}</p>`;
  html += `<p class="water-how">👉 ${WATER_HOW[kind]}</p>`;
  if (text) html += `<p class="water-original">농사로 원문: ${text}</p>`;

  if (p.waterTextWinter) {
    const winterKind = waterKind(p.waterTextWinter);
    html += `
      <div class="water-winter">
        <p class="water-season">❄️ 겨울에는</p>
        <p class="water-main">${WATER_PLAIN[winterKind]}</p>
        <p class="water-how">👉 ${WATER_HOW[winterKind]}</p>
        <p class="water-original">농사로 원문: ${p.waterTextWinter}</p>
      </div>`;
  }
  return html;
}

// 농사로 CSV에서 가져오는 항목 (scripts/convert_nongsaro.py와 같은 이름)
const NONGSARO_FIELDS = ["물 주기", "빛", "온도", "습도", "난이도", "크기"];

// 출처를 항목별로 나눠서 보여줘요. 농사로 식물도 수명·반려동물·꽃말은 AI 초안이에요.
function sourceHTML(p) {
  if (p.source === "AI 초안") return '<span class="draft-badge">AI 초안 정보</span>';
  if (p.source !== "농사로 공공데이터") return `출처: ${p.source}`;

  const draft = p.draftFields || []; // CSV 값이 없어 AI 초안으로 남은 항목
  const fromCsv = NONGSARO_FIELDS.filter((f) => !draft.includes(f));
  const fromDraft = [...draft, "수명", "반려동물", ...(p.flowerLanguage ? ["꽃말"] : [])];

  let html = `${fromCsv.join("·")}: ${NONGSARO_SOURCE}`;
  // "CSV에 값이 없어 …" 메모는 아래 AI 초안 줄과 겹쳐서 빼고 보여줘요.
  const notes = (p.sourceNote || "").split(" / ").filter((n) => n && !n.startsWith("CSV에 값이 없어"));
  if (notes.length) html += ` (${notes.join(", ")})`;
  html += `<br>${fromDraft.join("·")}: AI 초안`;
  return html;
}

function openDetail(p) {
  const content = document.getElementById("detail-content");
  content.innerHTML = `
    <div class="detail-head">
      <div class="detail-image"></div>
      <div>
        <h2 class="detail-name" id="detail-name">${p.name}</h2>
        <p class="plant-summary">${p.summary}</p>
      </div>
    </div>

    <section class="water-box">
      <h3 class="water-title">💧 물 주기</h3>
      ${waterHTML(p)}
    </section>

    <dl class="detail-facts">
      <div><dt>📏 다 자란 크기</dt><dd>${(p.matureSize || "확인 중").split(" · ").join("<br>")}</dd></div>
      <div><dt>☀️ 빛</dt><dd>${LIGHT_DETAIL[p.light]}</dd></div>
      <div><dt>🌡️ 적정 온도</dt><dd>${p.tempMin}~${p.tempMax}℃</dd></div>
      <div><dt>💦 습도</dt><dd>${HUMIDITY_DETAIL[p.humidity]}</dd></div>
      <div><dt>⭐ 관리 난이도</dt><dd>${DIFFICULTY_STARS[p.difficulty]}</dd></div>
      <div><dt>🐾 반려동물</dt><dd>${PET_DETAIL[String(p.petSafe)]}</dd></div>
      <div><dt>⏳ 수명</dt><dd>${p.lifespan || "확인 중"}</dd></div>
      <div><dt>🌸 꽃말</dt><dd>${p.flowerLanguage || "확인 중"}</dd></div>
    </dl>

    <p class="detail-source">${sourceHTML(p)}</p>
  `;
  content.querySelector(".detail-image").appendChild(createPlantImage(p, "plant-thumb"));

  state.selectedPlant = p; // 6단계 구매 화면에서 사용
  const dialog = document.getElementById("detail-dialog");
  dialog.showModal();
  dialog.querySelector(".detail-inner").scrollTop = 0;
}

const detailDialog = document.getElementById("detail-dialog");
document.getElementById("detail-close").addEventListener("click", () => detailDialog.close());
// 팝업 바깥(어두운 부분)을 눌러도 닫히게
detailDialog.addEventListener("click", (e) => {
  if (e.target === detailDialog) detailDialog.close();
});

document.getElementById("adopt-btn").addEventListener("click", () => {
  detailDialog.close();
  openShop(state.selectedPlant);
});

// ===== 구매 화면 =====
function formatPrice(won) {
  return won.toLocaleString("ko-KR") + "원";
}

// 꽃집별 가격: 기본 가격 × 가게 비율, 100원 단위로 반올림
function shopPrice(plant, shop) {
  return Math.round((plant.price * shop.priceRate) / 100) * 100;
}

function openShop(plant) {
  state.selectedShop = null;

  const info = document.getElementById("shop-plant");
  info.innerHTML = `
    <div class="detail-image"></div>
    <div>
      <h3 class="plant-name">${plant.name}</h3>
      <p class="plant-summary">${plant.summary}</p>
      ${getCollection().includes(plant.id) ? '<p class="owned-note">📖 이미 도감에 있는 식물이에요</p>' : ""}
    </div>
  `;
  info.querySelector(".detail-image").appendChild(createPlantImage(plant, "plant-thumb"));

  const list = document.getElementById("shop-list");
  list.innerHTML = "";
  SHOPS.forEach((shop) => {
    const btn = document.createElement("button");
    btn.className = "shop-btn";
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", "false");
    btn.innerHTML = `
      <span class="shop-emoji">${shop.emoji}</span>
      <span class="shop-text">
        <strong>${shop.name}</strong>
        <small>${shop.distance} · ${shop.comment}</small>
      </span>
      <span class="shop-price">${formatPrice(shopPrice(plant, shop))}</span>
    `;
    btn.addEventListener("click", () => selectShop(shop, btn));
    list.appendChild(btn);
  });

  const orderBtn = document.getElementById("order-btn");
  orderBtn.disabled = true;
  orderBtn.textContent = "꽃집을 골라 주세요";
  showScreen("screen-shop");
}

function selectShop(shop, btn) {
  state.selectedShop = shop;
  document.querySelectorAll(".shop-btn").forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
  const orderBtn = document.getElementById("order-btn");
  orderBtn.disabled = false;
  orderBtn.textContent = `${formatPrice(shopPrice(state.selectedPlant, shop))} 주문하기`;
}

document.getElementById("order-btn").addEventListener("click", () => {
  const plant = state.selectedPlant;
  const shop = state.selectedShop;
  if (!plant || !shop) return;
  showOrderDone(plant, shop, addToCollection(plant.id));
});

document.getElementById("shop-back").addEventListener("click", () => {
  showScreen(state.returnTo["screen-shop"] || "screen-start");
});

// ===== 주문 완료 화면 =====
function showOrderDone(plant, shop, result) {
  document.getElementById("order-summary").innerHTML = `
    <div><dt>🪴 식물</dt><dd>${plant.name}</dd></div>
    <div><dt>🏡 꽃집</dt><dd>${shop.name}</dd></div>
    <div><dt>💰 가격</dt><dd>${formatPrice(shopPrice(plant, shop))}</dd></div>
  `;

  let message = result.added
    ? `📖 도감에 새로 등록됐어요! (${result.count} / ${PLANTS.length})`
    : "📖 이미 도감에 있어요. 도감에는 한 번만 등록돼요.";
  if (!result.saved) message += " (이 브라우저에서는 저장이 안 돼서, 새로고침하면 사라질 수 있어요)";
  document.getElementById("collect-message").textContent = message;

  document.getElementById("badge-celebration").innerHTML = result.newBadges
    .map((b) => `
      <div class="badge-celebrate">
        <span class="badge-big">${b.icon}</span>
        <p><strong>축하해요! ${b.goal}종을 모았어요</strong><br>'${b.name}' 배지를 받았어요</p>
      </div>`)
    .join("");

  showScreen("screen-done");
}

// ===== 도감 화면 =====
function renderCollection() {
  const collection = getCollection();
  const badges = getBadges();

  document.getElementById("collection-count").textContent = collection.length;
  document.getElementById("collection-total").textContent = PLANTS.length;
  document.getElementById("collection-fill").style.width = (collection.length / PLANTS.length) * 100 + "%";

  // 배지: 받은 것은 진하게, 아직이면 흐리게 + 목표 안내
  document.getElementById("badge-list").innerHTML = BADGES.map((b) => {
    const earned = badges.includes(b.goal);
    return `
      <div class="badge ${earned ? "is-earned" : ""}">
        <span class="badge-icon">${b.icon}</span>
        <span class="badge-text"><strong>${b.name}</strong><small>${earned ? "획득!" : `${b.goal}종 모으면`}</small></span>
      </div>`;
  }).join("");

  // 20종 칸: 모은 식물은 그림+이름(누르면 상세보기), 안 모은 식물은 실루엣+"?"
  const grid = document.getElementById("collection-grid");
  grid.innerHTML = "";
  PLANTS.forEach((plant) => {
    const owned = collection.includes(plant.id);
    const cell = document.createElement(owned ? "button" : "div");
    cell.className = "collection-cell" + (owned ? " is-owned" : "");
    cell.appendChild(createPlantImage(plant, "collection-image"));
    const name = document.createElement("span");
    name.className = "collection-name";
    name.textContent = owned ? plant.name : "?";
    cell.appendChild(name);
    if (owned) {
      cell.addEventListener("click", () => openDetail(plant));
    } else {
      cell.setAttribute("aria-label", "아직 모으지 않은 식물");
    }
    grid.appendChild(cell);
  });
}

document.getElementById("collection-back").addEventListener("click", () => {
  showScreen(state.returnTo["screen-collection"] || "screen-start");
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("도감과 배지를 모두 지울까요? (시연용)")) {
    resetCollection();
    renderCollection();
  }
});
