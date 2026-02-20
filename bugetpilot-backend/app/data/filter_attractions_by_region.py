# -*- coding: utf-8 -*-
"""전국관광지정보표준데이터.csv에서 지정한 여행 지역만 남기고 나머지 삭제"""
import pandas as pd

# 남길 지역 키워드 (음식점 필터와 동일: 도로명/지번 주소에 하나라도 포함되면 유지)
REGIONS = [
    "강남구", "마포구", "성수동", "성수 ", "종로구", "가평", "인천", "수원", "대전", "천안",
    "단양", "춘천", "속초", "강릉", "전주", "여수", "목포", "광주", "부산", "대구",
    "경주", "통영", "제주", "울릉",
]

INPUT_CSV = "전국관광지정보표준데이터.csv"
OUTPUT_CSV = "전국관광지정보표준데이터.csv"

def keep_row(row):
    addr1 = str(row.get("소재지도로명주소", "") or "")
    addr2 = str(row.get("소재지지번주소", "") or "")
    combined = addr1 + " " + addr2
    return any(kw in combined for kw in REGIONS)

def main():
    for enc in ("cp949", "utf-8", "utf-8-sig"):
        try:
            df = pd.read_csv(INPUT_CSV, encoding=enc, low_memory=False)
            break
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue
    else:
        raise SystemExit("CSV 인코딩을 읽을 수 없습니다.")

    n_before = len(df)
    filtered = df[df.apply(keep_row, axis=1)]
    n_after = len(filtered)

    filtered.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"필터 완료: {n_before}행 → {n_after}행 (삭제: {n_before - n_after}행)")

if __name__ == "__main__":
    main()
