// 브라우저 localStorage에 도감과 배지를 저장하는 곳
// - 저장된 값이 없거나 깨져 있어도 오류로 멈추지 않고 빈 상태로 시작해요.
// - 읽을 때 값을 먼저 검사해서, 우리 식물 id·배지 목표만 남겨요.
// - 저장이 막힌 브라우저(시크릿 창 등)에서도 화면은 계속 동작해요.

const STORAGE_KEYS = {
  collection: "plantSim.collection", // 도감에 등록된 식물 id 배열
  badges: "plantSim.badges",         // 받은 배지(모은 개수 목표) 배열
};

// 모은 개수 목표별 배지
const BADGES = [
  { goal: 5, icon: "🌼", name: "꽃 피운 식집사" },
  { goal: 10, icon: "🏆", name: "초록 정원사" },
];

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return []; // 값이 깨졌거나 저장소를 쓸 수 없음 → 빈 목록
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch (error) {
    return false;
  }
}

// 도감: 실제로 있는 식물 id만, 중복 없이
function getCollection() {
  const validIds = new Set(PLANTS.map((p) => p.id));
  const ids = readList(STORAGE_KEYS.collection).filter((id) => typeof id === "string" && validIds.has(id));
  return [...new Set(ids)];
}

// 배지: 정해진 목표 숫자이면서, 지금 도감 개수로 실제 받을 수 있는 것만
function getBadges() {
  const count = getCollection().length;
  const goals = BADGES.map((b) => b.goal).filter((goal) => count >= goal);
  return [...new Set(readList(STORAGE_KEYS.badges).filter((n) => goals.includes(n)))];
}

// 도감에 식물 등록. 결과: { added, count, newBadges, saved }
function addToCollection(plantId) {
  const collection = getCollection();
  if (collection.includes(plantId)) {
    return { added: false, count: collection.length, newBadges: [], saved: true };
  }

  collection.push(plantId);
  const badges = getBadges();
  const newBadges = BADGES.filter((b) => collection.length >= b.goal && !badges.includes(b.goal));
  const saved =
    writeList(STORAGE_KEYS.collection, collection) &&
    writeList(STORAGE_KEYS.badges, [...badges, ...newBadges.map((b) => b.goal)]);

  return { added: true, count: collection.length, newBadges, saved };
}

// 시연용: 도감과 배지 모두 지우기
function resetCollection() {
  try {
    localStorage.removeItem(STORAGE_KEYS.collection);
    localStorage.removeItem(STORAGE_KEYS.badges);
  } catch (error) {
    // 저장소를 쓸 수 없으면 지울 것도 없어요
  }
}
