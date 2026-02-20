# app/routers/attractions.py
# 전국관광지정보표준데이터.csv 기반 관광지 API
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Query

router = APIRouter(prefix="/attractions", tags=["attractions"])

APP_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = APP_ROOT.parent
DATA_DIR = APP_ROOT / "data"

ATTR_CSV = "전국관광지정보표준데이터.csv"
ATTR_CANDIDATES = [
    DATA_DIR / ATTR_CSV,
    BACKEND_ROOT / ATTR_CSV,
    (BACKEND_ROOT / "data" / ATTR_CSV),
]

PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"
DEFAULT_PRICE = 0  # 표준데이터에 입장료 없음 → 무료 기본

_attr_df = None

ATTR_COLS = [
    "관광지명",
    "소재지도로명주소",
    "소재지지번주소",
    "관광지소개",
    "주차가능수",
    "관리기관전화번호",
]


def _pick_path(candidates: list) -> Optional[Path]:
    for p in candidates:
        if p.exists():
            return p
    return None


def _read_csv(path: Path) -> pd.DataFrame:
    encodings = ["utf-8-sig", "utf-8", "cp949", "euc-kr"]
    for enc in encodings:
        try:
            df = pd.read_csv(path, encoding=enc, low_memory=False)
            df.columns = df.columns.astype(str).str.strip()
            missing = [c for c in ATTR_COLS if c not in df.columns]
            if not missing:
                return df[ATTR_COLS].copy()
            return pd.DataFrame(columns=ATTR_COLS)
        except Exception:
            continue
    return pd.DataFrame(columns=ATTR_COLS)


def _load_data():
    global _attr_df
    if _attr_df is not None:
        return
    path = _pick_path(ATTR_CANDIDATES)
    if not path:
        _attr_df = pd.DataFrame(columns=ATTR_COLS)
        return
    _attr_df = _read_csv(path)
    if _attr_df is not None and len(_attr_df) > 0:
        _attr_df = _attr_df.dropna(subset=["관광지명"])
    else:
        _attr_df = pd.DataFrame(columns=ATTR_COLS)


@router.get("")
@router.get("/")
def list_attractions(
    city_keyword: Optional[str] = Query(None, description="지역 키워드 (예: 강릉, 마포구, 부산)"),
    max_price: Optional[int] = Query(None),
    limit: int = Query(80, ge=1, le=200),
):
    _load_data()
    results = []
    if _attr_df is None or len(_attr_df) == 0:
        return results

    df = _attr_df.copy()
    kw = (city_keyword or "").strip()
    if kw:
        addr = (df["소재지도로명주소"].fillna("").astype(str) + " " + df["소재지지번주소"].fillna("").astype(str))
        df = df[addr.str.contains(kw, na=False, case=False)]

    for i, row in df.head(limit).iterrows():
        name = str(row.get("관광지명", "") or "").strip()
        if not name:
            continue
        addr1 = str(row.get("소재지도로명주소", "") or "").strip()
        addr2 = str(row.get("소재지지번주소", "") or "").strip()
        location = (addr1 + " " + addr2).strip() or name
        desc = str(row.get("관광지소개", "") or "").strip() or f"{name} 관광명소입니다."
        parking_count = row.get("주차가능수", 0)
        try:
            parking_count = int(float(parking_count)) if pd.notna(parking_count) and str(parking_count).strip() else 0
        except (ValueError, TypeError):
            parking_count = 0
        phone = str(row.get("관리기관전화번호", "") or "").strip()
        price = DEFAULT_PRICE
        if max_price is not None and price > max_price:
            continue
        results.append({
            "id": f"attr-{i}",
            "name": name,
            "location": location[:120],
            "description": desc,
            "image": PLACEHOLDER_IMAGE,
            "rating": 4.3,
            "reviewCount": 0,
            "price": price,
            "parkingCount": parking_count,
        })

    return results[:limit]
