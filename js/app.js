// 게임 진행 중 기억해둘 값들
const state = {
  level: null,   // 경험 수준: 1 입문자 / 2 초보자 / 3 중급자 / 4 고수
  answers: {},   // 질문 key별 답변 값 (예: { light: 2, pet: true })
  step: 0,       // 지금 몇 번째 질문인지 (0부터 시작)
};

const LEVEL_NAMES = { 1: "입문자", 2: "초보자", 3: "중급자", 4: "고수" };
const STAGE_NAMES = ["", "씨앗", "떡잎", "본잎", "무럭무럭", "다 자랐어요!"];
const STAGE_COUNT = 5;

// 화면 하나만 보이게 바꾸기
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === id);
  });
  window.scrollTo(0, 0);
  if (id === "screen-result") showAnswersDebug();
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

// ===== 결과 화면 (4단계 전까지 확인용) =====
function showAnswersDebug() {
  const lines = ["경험 수준: " + LEVEL_NAMES[state.level]];
  QUESTIONS.forEach((q) => {
    lines.push(q.action + " (" + q.key + "): " + JSON.stringify(state.answers[q.key]));
  });
  document.getElementById("answers-debug").textContent = lines.join("\n");
}
