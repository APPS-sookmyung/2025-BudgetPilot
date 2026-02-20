# app/routers/restaurants.py
# 식당(식품_일반음식점) + 카페(전국카페표준데이터) CSV 기반 API
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Query

router = APIRouter(prefix="/restaurants", tags=["restaurants"])

# 경로 기준
APP_ROOT = Path(__file__).resolve().parent.parent          # .../app
BACKEND_ROOT = APP_ROOT.parent                             # .../ (repo root in container)
DATA_DIR = APP_ROOT / "data"                               # .../app/data

# 파일명
REST_MAIN_NAME = "식품_일반음식점.csv"
REST_ALT_NAME = "식품_일반음식점_여행지역만.csv"
CAFE_NAME = "전국카페표준데이터.csv"

# 후보 경로들 (배포/로컬 어떤 구조든 잡히게)
REST_CANDIDATES = [
    DATA_DIR / REST_MAIN_NAME,
    DATA_DIR / REST_ALT_NAME,
    BACKEND_ROOT / REST_MAIN_NAME,
    BACKEND_ROOT / REST_ALT_NAME,
    (BACKEND_ROOT / "data" / REST_MAIN_NAME),
    (BACKEND_ROOT / "data" / REST_ALT_NAME),
]

CAFE_CANDIDATES = [
    DATA_DIR / CAFE_NAME,
    BACKEND_ROOT / CAFE_NAME,
    (BACKEND_ROOT / "data" / CAFE_NAME),
]

_restaurants_df = None  # 식당 DF
_cafes_df = None        # 카페 DF

DEFAULT_PRICE_REST = 12000
DEFAULT_PRICE_CAFE = 8000
PLACEHOLDER_IMAGE_REST = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800"
PLACEHOLDER_IMAGE_CAFE = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800"


def _pick_existing_path(candidates: list[Path]) -> Optional[Path]:
    for p in candidates:
        if p.exists():
            return p
    return None


def _read_csv_robust(path: Path, usecols: list[str]) -> pd.DataFrame:
    """
    인코딩/컬럼 공백/열 이름 mismatch 방지.
    - utf-8, utf-8-sig, cp949, euc-kr 순으로 시도
    - columns strip
    - usecols가 안 맞으면 전체 로드 후 필요한 컬럼만 고름
    """
    encodings = ["utf-8", "utf-8-sig", "cp949", "euc-kr"]

    last_err = None
    for enc in encodings:
        try:
            df = pd.read_csv(path, encoding=enc, low_memory=False)
            df.columns = df.columns.astype(str).str.strip()

            # 필요한 컬럼이 있는지 확인 후 선택
            missing = [c for c in usecols if c not in df.columns]
            if missing:
                # usecols mismatch면 그냥 빈 DF 반환 (상위에서 처리)
                return pd.DataFrame(columns=usecols)

            return df[usecols].copy()
        except Exception as e:
            last_err = e

    # 여기까지 오면 실패 → 빈 DF
    return pd.DataFrame(columns=usecols)


def _load_data():
    global _restaurants_df, _cafes_df
    if _restaurants_df is not None and _cafes_df is not None:
        return

    # -------------------------
    # 식당 로드
    # -------------------------
    rest_path = _pick_existing_path(REST_CANDIDATES)
    print("[REST] candidates:", [str(p) for p in REST_CANDIDATES])
    print("[REST] chosen:", str(rest_path) if rest_path else None)

    if not rest_path:
        _restaurants_df = pd.DataFrame(columns=["사업장명", "_addr", "업태구분명"])
    else:
        df_rest = _read_csv_robust(
            rest_path,
            usecols=["사업장명", "도로명주소", "지번주소", "업태구분명"],
        )

        if len(df_rest) == 0:
            _restaurants_df = pd.DataFrame(columns=["사업장명", "_addr", "업태구분명"])
        else:
            df_rest = df_rest.dropna(subset=["사업장명"])
            df_rest["_addr"] = (
                df_rest["도로명주소"].fillna("").astype(str).str.strip()
                + " "
                + df_rest["지번주소"].fillna("").astype(str).str.strip()
            ).str.strip()
            _restaurants_df = df_rest[["사업장명", "_addr", "업태구분명"]].copy()

    print("[REST] rows:", 0 if _restaurants_df is None else len(_restaurants_df))

    # -------------------------
    # 카페 로드
    # -------------------------
    cafe_path = _pick_existing_path(CAFE_CANDIDATES)
    print("[CAFE] candidates:", [str(p) for p in CAFE_CANDIDATES])
    print("[CAFE] chosen:", str(cafe_path) if cafe_path else None)

    if not cafe_path:
        _cafes_df = pd.DataFrame(columns=["사업장명", "_addr"])
    else:
        df_cafe = _read_csv_robust(
            cafe_path,
            usecols=["사업장명", "시도명", "시군구명", "소재지도로명주소"],
        )

        if len(df_cafe) == 0:
            _cafes_df = pd.DataFrame(columns=["사업장명", "_addr"])
        else:
            df_cafe = df_cafe.dropna(subset=["사업장명"])
            df_cafe["_addr"] = (
                df_cafe["시도명"].fillna("").astype(str).str.strip()
                + " "
                + df_cafe["시군구명"].fillna("").astype(str).str.strip()
                + " "
                + df_cafe["소재지도로명주소"].fillna("").astype(str).str.strip()
            ).str.strip()
            _cafes_df = df_cafe[["사업장명", "_addr"]].copy()

    print("[CAFE] rows:", 0 if _cafes_df is None else len(_cafes_df))


@router.get("")
@router.get("/")
def list_restaurants(
    city_keyword: Optional[str] = Query(None, description="지역 키워드 (예: 강릉, 마포구, 부산)"),
    max_price: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    _load_data()
    results = []
    seen = set()

    def add_row(name: str, addr: str, type_label: str, base_price: int, image: str, idx: int):
        if not name:
            return
        name = name.strip()
        if not name or name in seen:
            return
        seen.add(name)

        price = base_price + (idx % 5) * 2000
        if max_price is not None and price > max_price:
            return

        addr = (addr or "").strip()
        results.append({
            "id": f"rest-{len(results)}",
            "name": name,
            "type": type_label,
            "location": addr[:80],
            "price": price,
            "description": f"{type_label}입니다. {addr[:50]}",
            "image": image,
            "rating": round(3.5 + (idx % 15) / 10, 1),
            "reviewCount": 50 + (idx % 200),
        })

    kw = city_keyword.strip() if city_keyword else None

    # 식당
    if _restaurants_df is not None and len(_restaurants_df) > 0:
        df = _restaurants_df
        if kw:
            df = df[df["_addr"].astype(str).str.contains(kw, na=False, case=False)]
        for i, row in df.head(limit).iterrows():
            add_row(
                str(row.get("사업장명", "")),
                str(row.get("_addr", "")),
                str(row.get("업태구분명", "식당") or "식당"),
                DEFAULT_PRICE_REST,
                PLACEHOLDER_IMAGE_REST,
                int(i),
            )

    # 카페
    if _cafes_df is not None and len(_cafes_df) > 0 and len(results) < limit:
        df = _cafes_df
        if kw:
            df = df[df["_addr"].astype(str).str.contains(kw, na=False, case=False)]
        for i, row in df.head(limit - len(results)).iterrows():
            add_row(
                str(row.get("사업장명", "")),
                str(row.get("_addr", "")),
                "카페",
                DEFAULT_PRICE_CAFE,
                PLACEHOLDER_IMAGE_CAFE,
                int(i) + 10000,
            )

    return results[:limit]