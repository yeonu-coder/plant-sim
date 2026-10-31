"""농사로 「실내정원용 식물」 CSV를 읽어서 js/data/plants.js의 조건값을 바꾸는 스크립트

실행 (plant-sim 폴더에서):
  python3 scripts/convert_nongsaro.py           # 데이터 점검 + 변환
  python3 scripts/convert_nongsaro.py --check   # 데이터 점검만 (어떤 파일도 고치지 않음)

- CSV 원본(data/plants_nongsaro.csv)은 읽기만 하고 절대 고치지 않아요.
- 같은 CSV로 몇 번을 다시 돌려도 plants.js는 같은 결과가 돼요.
- 바꾸는 값: 빛, 물 주기, 온도, 습도, 난이도, 크기(+ 다 자란 크기 문구), 물주기 원문, 출처
- 그대로 두는 값: 꽃말, 수명, 반려동물 안전 여부, 이름, 소개, 가격
- 사용자가 직접 확인해서 출처를 바꾼 식물은 건드리지 않아요.
- 변환 규칙은 docs/data-rules.md에 표로 정리돼 있어요.
"""
import csv
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_FILE = ROOT / "data" / "plants_nongsaro.csv"
CSV_ENCODING = "cp949"
PLANTS_FILE = ROOT / "js" / "data" / "plants.js"

SOURCE_CSV = "농사로 공공데이터"
SOURCE_DRAFT = "AI 초안"

# 우리 식물 id → CSV의 '식물_한글유통명' (변환 대상)
CSV_NAMES = {
    "monstera": "몬스테라",
    "sansevieria": "산세베리아",
    "zz-plant": "금전수 (자미오쿨카스, 돈나무)",
    "pothos": "스킨다비스 (신답서스, 스킨답서스)",
    "spathiphyllum": "스파티필름 (스파티필럼, 스파티)",
    "rubber-plant": "데코라고무나무",
    "hoya": "호야",
    "spider-plant": "접란",
    "dracaena-fragrans": "행운목",
    "table-palm": "테이블야자",
    "areca-palm": "아레카야자",
    "fiddle-leaf-fig": "떡갈잎고무나무 (떡갈나무, 떡깔나무)",
    "rosemary": "로즈마리",
    "pachira": "파키라",
    "boston-fern": "보스톤고사리",
    "calathea": "칼라데아 마코야나",
}

# 이름이 정확히 같지 않은 식물: 어떤 CSV 값을 썼는지 sourceNote에 적어둬요.
CSV_NOTES = {
    "rubber-plant": "데코라고무나무 값 사용",
    "boston-fern": "CSV 이름: 보스톤고사리",
    "calathea": "CSV 품종: 칼라데아 마코야나 (Calathea makoya)",
}

# 변환 대상이 아닌 식물: CSV에 이름이 비슷한 행이 있는지 참고로만 찾아봐요.
SIMILAR_WORDS = {
    "aloe": ["알로에", "Aloe"],
    "echeveria": ["에케베리아", "Echeveria"],
    "haworthia": ["하월시아", "Haworthia"],
    "olive": ["올리브", "Olea"],
}

# ---- 변환 규칙 (docs/data-rules.md와 같아야 해요) ----

# 빛: 광요구도 1~3 중 가장 낮은 광도 → light (그 정도 빛에서도 자란다는 뜻)
LIGHT_COLUMNS = ["광요구도코드명_1", "광요구도코드명_2", "광요구도코드명_3"]
LIGHT_RULES = {"낮은 광도": 1, "중간 광도": 2, "높은 광도": 3}

# 물 주기: 봄·여름·가을 물주기 중 가장 많이 나온 문장 → waterDays (같으면 봄 기준)
WATER_COLUMNS = ["물공급봄코드명", "물공급여름코드명", "물공급가을코드명"]
WATER_RULES = {
    "항상 흙을 축축하게 유지함(물에 잠김)": 1,
    "흙을 촉촉하게 유지함(물에 잠기지 않도록 주의)": 3,
    "토양 표면이 말랐을때 충분히 관수함": 7,
    "화분 흙 대부분 말랐을때 충분히 관수함": 14,
}

# 상세보기용 물주기 원문: 봄·여름 기준, 겨울 기준
SPRING_SUMMER_COLUMNS = ["물공급봄코드명", "물공급여름코드명"]
WINTER_COLUMN = "물공급겨울코드명"

# 온도: 생육 온도 → tempMin, tempMax
TEMP_COLUMN = "성장온도코드명"
TEMP_RULES = {"10~15℃": (10, 15), "16~20℃": (16, 20), "21~25℃": (21, 25)}

# 습도
HUMIDITY_COLUMN = "습도코드명"
HUMIDITY_RULES = {"40% 미만": 1, "40 ~ 70%": 2, "70% 이상": 3}

# 난이도: 관리 수준
DIFFICULTY_COLUMN = "관리수준코드명"
DIFFICULTY_RULES = {"초보자": 1, "경험자": 2, "전문가": 3}

# 크기: 성장 높이(cm) → size. 40 이하 1, 100 이하 2, 그보다 크면 3
HEIGHT_COLUMN = "성장높이정보"
WIDTH_COLUMN = "성장넓이정보"
SIZE_LIMITS = [(40, 1), (100, 2)]

FIELD_NAMES = {
    "light": "빛", "waterDays": "물 주기", "tempMin": "최저 온도", "tempMax": "최고 온도",
    "humidity": "습도", "difficulty": "난이도", "size": "크기", "matureSize": "다 자란 크기",
}


def is_blank(value):
    return value is None or value.strip() in ("", "NA", "N/A")


def read_csv():
    with open(CSV_FILE, encoding=CSV_ENCODING, newline="") as f:
        return list(csv.DictReader(f))


def read_plants_js():
    """plants.js에서 식물 블록과 그 안의 id, 출처, 현재 값을 읽어요."""
    text = PLANTS_FILE.read_text(encoding="utf-8")
    plants = {}
    for match in re.finditer(r"  \{\n    id: \"([^\"]+)\".*?\n  \}", text, re.S):
        block = match.group(0)
        values = {key: int(n) for key, n in re.findall(r"\b(\w+): (-?\d+)\b", block)}
        values["name"] = re.search(r'name: "([^"]*)"', block).group(1)
        values["matureSize"] = re.search(r'matureSize: "([^"]*)"', block).group(1)
        values["source"] = re.search(r'source: "([^"]*)"', block).group(1)
        values["petSafe"] = re.search(r"petSafe: (\w+)", block).group(1)
        plants[match.group(1)] = values
    return text, plants


# ---- CSV 한 줄 → 우리 조건값 ----

def convert_row(row):
    """CSV 한 줄을 우리 조건값으로 바꿔요. (바꾼 값, 문제 목록)을 돌려줘요."""
    values, problems = {}, []

    def unknown(column, value):
        problems.append(f"{column}: 규칙에 없는 값 {value!r}")

    # 빛
    levels = []
    for column in LIGHT_COLUMNS:
        if is_blank(row[column]):
            continue
        found = [n for text, n in LIGHT_RULES.items() if row[column].startswith(text)]
        levels += found if found else unknown(column, row[column]) or []
    if levels:
        values["light"] = min(levels)
    else:
        problems.append("광요구도: 빈 값")

    # 물 주기
    texts = [row[c].strip() for c in WATER_COLUMNS if not is_blank(row[c])]
    for column in WATER_COLUMNS:
        if not is_blank(row[column]) and row[column].strip() not in WATER_RULES:
            unknown(column, row[column])
    known = [t for t in texts if t in WATER_RULES]
    if known:
        values["waterDays"] = WATER_RULES[Counter(known).most_common(1)[0][0]]
    else:
        problems.append("물공급(봄·여름·가을): 빈 값")

    # 물주기 원문 (봄과 여름이 다르면 둘 다 적어요)
    spring, summer = (row[c].strip() for c in SPRING_SUMMER_COLUMNS)
    if spring and summer and spring != summer:
        values["waterTextSpringSummer"] = f"봄: {spring} / 여름: {summer}"
    else:
        values["waterTextSpringSummer"] = spring or summer or None
    values["waterTextWinter"] = row[WINTER_COLUMN].strip() or None

    # 온도, 습도, 난이도
    simple = [
        (TEMP_COLUMN, TEMP_RULES, ("tempMin", "tempMax")),
        (HUMIDITY_COLUMN, HUMIDITY_RULES, ("humidity",)),
        (DIFFICULTY_COLUMN, DIFFICULTY_RULES, ("difficulty",)),
    ]
    for column, rules, keys in simple:
        value = row[column]
        if is_blank(value):
            problems.append(f"{column}: 빈 값")
        elif value.strip() not in rules:
            unknown(column, value)
        else:
            result = rules[value.strip()]
            for key, n in zip(keys, result if isinstance(result, tuple) else (result,)):
                values[key] = n

    # 크기
    height, width = row[HEIGHT_COLUMN].strip(), row[WIDTH_COLUMN].strip()
    if not height.isdigit() or int(height) <= 0:
        problems.append(f"{HEIGHT_COLUMN}: 빈 값이거나 숫자가 아님 {height!r}")
    else:
        h = int(height)
        values["size"] = next((size for limit, size in SIZE_LIMITS if h <= limit), 3)
        values["matureSize"] = f"높이 약 {h}cm" + (f" · 폭 약 {width}cm" if width.isdigit() else "")

    return values, problems


# ---- 데이터 점검 ----

def check(rows, plants):
    """점검 결과를 출력하고, 변환할 수 있는 식물의 값을 돌려줘요."""
    print("=" * 60)
    print("1. 파일 전체 점검")
    print("=" * 60)
    print(f"- 식물 {len(rows)}줄, 열 {len(rows[0])}개 (인코딩 {CSV_ENCODING})")

    broken = [i + 2 for i, r in enumerate(rows) if None in r or None in r.values()]
    print(f"- 열 개수가 다른 줄: {broken or '없음'}")

    empty = [r["식물_한글유통명"].strip() for r in rows if is_blank(r["컨텐츠번호"])]
    print(f"- 이름만 있고 나머지가 빈 줄 {len(empty)}개: {', '.join(empty)}")

    names = Counter(r["식물_한글유통명"].strip() for r in rows)
    print(f"- 이름이 겹치는 식물: {[n for n, c in names.items() if c > 1] or '없음'}")

    errors = Counter((column, v.strip()) for r in rows for column, v in r.items()
                     if re.fullmatch(r"#\w+[?!]", (v or "").strip()))
    if errors:
        shown = ", ".join(f"{column} 열 {value!r} {n}칸" for (column, value), n in errors.items())
        print(f"- 엑셀 오류값으로 보이는 칸: {shown} (변환에 쓰지 않는 열)")

    swapped = sum(1 for r in rows if r["과_명"].strip().isdigit())
    if swapped:
        print(f"- 참고: '과_명' 열에 숫자 코드가 들어 있는 줄 {swapped}개 "
              "('과_명'과 '과_코드명'의 열 이름이 서로 바뀐 것으로 보임, 이번 변환에는 안 씀)")

    by_name = {}
    for r in rows:
        by_name.setdefault(r["식물_한글유통명"].strip(), r)

    print()
    print("=" * 60)
    print("2. 우리 식물 20종이 CSV에 있는지")
    print("=" * 60)
    conversions = {}
    for plant_id, plant in plants.items():
        name = plant["name"]
        if plant_id in CSV_NAMES:
            row = by_name.get(CSV_NAMES[plant_id])
            if row is None:
                print(f"✗ {name}: CSV에서 '{CSV_NAMES[plant_id]}'을 찾지 못함 → 변환 안 함")
            elif is_blank(row["컨텐츠번호"]):
                print(f"✗ {name}: CSV에 '{CSV_NAMES[plant_id]}' 줄은 있지만 값이 비어 있음 → 변환 안 함")
            else:
                values, problems = convert_row(row)
                conversions[plant_id] = (values, problems, row)
                print(f"✓ {name}: '{CSV_NAMES[plant_id]}' (컨텐츠번호 {row['컨텐츠번호']})")
        else:
            words = SIMILAR_WORDS.get(plant_id, [])
            similar = [r["식물_한글유통명"].strip() for r in rows
                       if any(w in r["식물_한글유통명"] or w in r["식물학_명"] for w in words)]
            note = f" (참고: 비슷한 이름 {', '.join(similar)})" if similar else ""
            print(f"- {name}: 변환 대상 아님 → {SOURCE_DRAFT} 유지{note}")

    print()
    print("=" * 60)
    print("3. 변환할 식물의 빈 값 · 이상한 값")
    print("=" * 60)
    found = False
    for plant_id, (values, problems, row) in conversions.items():
        name = plants[plant_id]["name"]
        for problem in problems:
            print(f"- {name}: {problem} → 이 항목은 지금 값 유지")
            found = True
        if row[HEIGHT_COLUMN].strip().isdigit() and int(row[HEIGHT_COLUMN]) >= 200 and plants[plant_id]["size"] < 3:
            print(f"- {name}: 성장 높이 {row[HEIGHT_COLUMN]}cm (지금 크기 값과 차이가 큼, 확인 권장)")
            found = True
    if not found:
        print("- 없음")

    # 반려동물 안전 여부는 바꾸지 않지만, 직접 확인할 때 참고하도록 나란히 보여줘요.
    print()
    print("참고: CSV 독성정보 ↔ 우리 petSafe (petSafe는 바꾸지 않음)")
    for plant_id, (_, _, row) in conversions.items():
        toxicity = row["독성정보"].strip() or "(빈 값)"
        print(f"- {plants[plant_id]['name']}: {toxicity} ↔ petSafe {plants[plant_id]['petSafe']}")

    return conversions


# ---- plants.js 고치기 ----

def js_value(value):
    return "null" if value is None else f'"{value}"'


def set_water_texts(block, spring_summer, winter):
    """물주기 원문 두 줄을 source 바로 위에 (다시) 써요."""
    block = re.sub(r"\n    waterText\w+: (null|\"[^\"]*\"),", "", block)
    lines = (f"    waterTextSpringSummer: {js_value(spring_summer)},\n"
             f"    waterTextWinter: {js_value(winter)},\n")
    return block.replace("    source:", lines + "    source:", 1)


def update_block(block, values, notes):
    for key in ("light", "waterDays", "tempMin", "tempMax", "humidity", "difficulty", "size"):
        if key in values:
            block = re.sub(rf"\b{key}: -?\d+\b", f"{key}: {values[key]}", block)
    if "matureSize" in values:
        block = re.sub(r'matureSize: "[^"]*"', f'matureSize: "{values["matureSize"]}"', block)

    block = set_water_texts(block, values.get("waterTextSpringSummer"), values.get("waterTextWinter"))

    # sourceNote는 지우고 다시 써요 (몇 번 돌려도 결과가 같게)
    block = re.sub(r',\n    sourceNote: "[^"]*"', "", block)
    source = f'source: "{SOURCE_CSV}"'
    if notes:
        source += f',\n    sourceNote: "{" / ".join(notes)}"'
    return re.sub(r'source: "[^"]*"', source, block)


def convert(text, plants, conversions):
    print()
    print("=" * 60)
    print("4. 변환 결과 (바뀐 값만)")
    print("=" * 60)

    def replace(match):
        plant_id = match.group(1)
        plant = plants[plant_id]
        if plant["source"] not in (SOURCE_DRAFT, SOURCE_CSV):
            print(f"- {plant['name']}: 출처가 '{plant['source']}'(직접 확인함)이라 건드리지 않음")
            return match.group(0)
        if plant_id not in conversions:
            # CSV 값이 없는 식물도 같은 모양이 되도록 원문 칸만 null로 (이미 있으면 그대로)
            if "waterTextWinter" in match.group(0):
                return match.group(0)
            return set_water_texts(match.group(0), None, None)
        values, _, _ = conversions[plant_id]
        missing = [FIELD_NAMES[k] for k in ("light", "waterDays", "tempMin", "humidity", "difficulty", "size")
                   if k not in values]
        notes = ([CSV_NOTES[plant_id]] if plant_id in CSV_NOTES else []) + (
            [f"CSV에 값이 없어 AI 초안 유지: {', '.join(missing)}"] if missing else [])
        changes = [f"{FIELD_NAMES[k]} {plant[k]}→{v}" for k, v in values.items()
                   if k in FIELD_NAMES and k != "matureSize" and plant[k] != v]
        if changes:
            print(f"- {plant['name']}: {', '.join(changes)}")
        return update_block(match.group(0), values, notes)

    new_text = re.sub(r"  \{\n    id: \"([^\"]+)\".*?\n  \}", replace, text, flags=re.S)
    if new_text == text:
        print("- 바뀐 것 없음 (이미 최신 상태)")
    else:
        PLANTS_FILE.write_text(new_text, encoding="utf-8")
        print(f"\n저장함: {PLANTS_FILE.relative_to(ROOT)}")


def main():
    rows = read_csv()
    text, plants = read_plants_js()
    conversions = check(rows, plants)
    if "--check" in sys.argv:
        print("\n(--check: 점검만 하고 파일은 고치지 않았어요)")
        return
    convert(text, plants, conversions)


if __name__ == "__main__":
    main()
