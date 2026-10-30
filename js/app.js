// 게임 진행 중 기억해둘 값들
const state = {
  level: null, // 경험 수준: 1 입문자 / 2 초보자 / 3 중급자 / 4 고수
};

const LEVEL_NAMES = { 1: "입문자", 2: "초보자", 3: "중급자", 4: "고수" };

// 화면 하나만 보이게 바꾸기
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === id);
  });
  window.scrollTo(0, 0);
}

// 시작 화면: 경험 수준 고르기
document.querySelectorAll(".level-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.level = Number(btn.dataset.level);
    document.getElementById("chosen-level").textContent = LEVEL_NAMES[state.level];
    showScreen("screen-game");
  });
});

// data-go="화면id"가 붙은 버튼은 그 화면으로 이동
document.querySelectorAll("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.go));
});
