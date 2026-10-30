// 게임 질문 7개
// - key: 답변을 저장할 이름 (추천 계산에서 사용)
// - action: 게임 버튼처럼 보여줄 행동 이름
// - options의 value: 식물 조건값과 비교하기 쉬운 숫자/값

window.QUESTIONS = [
  {
    key: "waterCare",
    icon: "💧",
    action: "물 주기",
    text: "새싹에게 물을 줄 시간이에요! 평소 물을 얼마나 자주 챙길 수 있나요?",
    options: [
      { label: "자주 챙길 수 있어요", emoji: "😊", value: 1 },
      { label: "가끔 잊어요", emoji: "😅", value: 2 },
      { label: "거의 못 챙겨요", emoji: "😴", value: 3 }
    ]
  },
  {
    key: "light",
    icon: "☀️",
    action: "햇빛 쬐기",
    text: "새싹을 창가에 두려고 해요. 방에 햇빛이 얼마나 드나요?",
    options: [
      { label: "거의 안 들어요", emoji: "🌥️", value: 1 },
      { label: "밝지만 직접 들진 않아요", emoji: "⛅", value: 2 },
      { label: "햇빛이 쨍하게 들어와요", emoji: "🌞", value: 3 }
    ]
  },
  {
    key: "temp",
    icon: "🌡️",
    action: "온도 맞추기",
    text: "새싹이 지낼 방은 평소 어떤 느낌인가요?",
    options: [
      { label: "서늘한 편 (18℃ 아래)", emoji: "🧊", value: 15 },
      { label: "적당해요 (18~24℃)", emoji: "🙂", value: 21 },
      { label: "따뜻한 편 (24℃ 위)", emoji: "🔥", value: 27 }
    ]
  },
  {
    key: "humidity",
    icon: "💦",
    action: "공기 느끼기",
    text: "방 공기는 어떤가요?",
    options: [
      { label: "건조해요", emoji: "🏜️", value: 1 },
      { label: "보통이에요", emoji: "🌤️", value: 2 },
      { label: "촉촉한 편이에요", emoji: "🌧️", value: 3 }
    ]
  },
  {
    key: "away",
    icon: "🧳",
    action: "외출 준비",
    text: "집을 비우는 일이 얼마나 자주 있나요?",
    options: [
      { label: "거의 집에 있어요", emoji: "🏠", value: 1 },
      { label: "가끔 하루이틀 비워요", emoji: "🚶", value: 2 },
      { label: "출장·여행이 잦아요", emoji: "✈️", value: 3 }
    ]
  },
  {
    key: "pet",
    icon: "🐾",
    action: "친구 소개",
    text: "새싹과 같이 사는 반려동물이 있나요?",
    options: [
      { label: "반려동물이 있어요", emoji: "🐶", value: true },
      { label: "반려동물이 없어요", emoji: "🙅", value: false }
    ]
  },
  {
    key: "space",
    icon: "📏",
    action: "자리 정하기",
    text: "다 자란 식물을 어디에 둘 건가요?",
    options: [
      { label: "책상 위 작은 자리", emoji: "🖥️", value: 1 },
      { label: "선반이나 창가", emoji: "🪟", value: 2 },
      { label: "바닥 넓은 자리", emoji: "🛋️", value: 3 }
    ]
  }
];
