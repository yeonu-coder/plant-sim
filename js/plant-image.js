// 식물 그림 만들기: image가 있으면 사진, 없으면 이모지
// 나중에 plants.js의 image에 "./assets/plants/monstera.png"처럼 넣으면 자동으로 사진이 나와요.
function createPlantImage(plant, className) {
  if (plant.image) {
    const img = document.createElement("img");
    img.src = plant.image;
    img.alt = plant.name;
    img.className = className;
    return img;
  }
  const span = document.createElement("span");
  span.className = className + " is-emoji";
  span.textContent = plant.emoji;
  span.setAttribute("role", "img");
  span.setAttribute("aria-label", plant.name);
  return span;
}
