import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp, IoStar, IoLocation } from "react-icons/io5";
import { MdCameraAlt } from "react-icons/md";
import "../TouristPage.css";

const BACKEND_URL =
  window.__BACKEND__ ||
  import.meta?.env?.VITE_BACKEND_URL ||
  "http://localhost:8000";

const TouristPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const region =
    searchParams.get("region") || searchParams.get("regionIds") || "강릉";
  const period = searchParams.get("period") || "1박2일";
  const totalAmount = Number(searchParams.get("totalAmount")) || 0;
  const hotelId = searchParams.get("hotelId") || "";
  const hotelName = decodeURIComponent(searchParams.get("hotelName") || "");
  
  const budgetStr = useMemo(
    () => searchParams.get("budget") || "{}",
    [searchParams]
  );
  const budget = useMemo(() => {
    try {
      return JSON.parse(budgetStr) || {};
    } catch (e) {
      console.warn("Invalid budget JSON", e);
      return {};
    }
  }, [budgetStr]);

  const breakdownStr = useMemo(
    () => searchParams.get("breakdown") || "{}",
    [searchParams]
  );

  const breakdown = useMemo(() => {
    try {
      return JSON.parse(breakdownStr) || {};
    } catch (e) {
      console.warn("Invalid breakdown JSON", e);
      return {};
    }
  }, [breakdownStr]);

  const selectedRestaurantsStr = searchParams.get("selectedRestaurants") || "[]";
  const selectedRestaurants = useMemo(() => {
    try {
      return JSON.parse(selectedRestaurantsStr);
    } catch (e) {
      return [];
    }
  }, [selectedRestaurantsStr]);

  const tourismBudget = breakdown?.관광 || budget?.관광 || 0;
  const [tourists, setTourists] = useState([]);
  const [selectedTourists, setSelectedTourists] = useState(new Set());
  const [totalSelectedPrice, setTotalSelectedPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (region) params.set("city_keyword", region);
        if (tourismBudget > 0) params.set("max_price", String(tourismBudget));
        params.set("limit", "80");
        const res = await fetch(`${BACKEND_URL}/attractions?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setTourists(
            list.map((a, i) => ({
              id: a.id || `t-${i}`,
              name: a.name || "(이름 없음)",
              location: a.location || "",
              description: a.description || "",
              image: a.image || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
              rating: a.rating ?? 4.0,
              reviewCount: a.reviewCount ?? 0,
              price: Number(a.price) ?? 0,
              parkingCount: Number(a.parkingCount) ?? 0,
            }))
          );
        }
      } catch (e) {
        console.warn("관광지 API 실패:", e);
        if (!cancelled) setTourists([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [region, tourismBudget]);

  const handleTouristToggle = (touristId, price) => {
    setSelectedTourists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(touristId)) {
        newSet.delete(touristId);
        setTotalSelectedPrice((prevPrice) => prevPrice - price);
      } else {
        // 예산 체크
        const newTotal = totalSelectedPrice + price;
        if (newTotal > tourismBudget) {
          alert(`예산을 초과합니다! (현재: ₩${newTotal.toLocaleString()}, 예산: ₩${tourismBudget.toLocaleString()})`);
          return prev;
        }
        newSet.add(touristId);
        setTotalSelectedPrice(newTotal);
      }
      return newSet;
    });
  };

  const handleBack = () => navigate(-1);
  const formatCurrency = (amount) =>
    `₩${(Number(amount) || 0).toLocaleString()}`;

  if (loading) {
    return (
      <div className="tourist-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>관광지를 찾고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tourist-page">
      {/* Header */}
      <header className="tourist-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={22} />
        </button>
        <span className="page-title">📸 관광지 추천</span>
      </header>

      {/* Budget Summary */}
      <div className="budget-summary">
        <div className="summary-card">
          <h3>예산 요약</h3>
          <div className="budget-details">
            <div className="budget-item">
              <span className="budget-label">선택한 숙소</span>
              <span className="budget-value">{hotelName || "미선택"}</span>
            </div>
            <div className="budget-item">
              <span className="budget-label">관광 예산</span>
              <span className="budget-value highlight">
                {formatCurrency(tourismBudget)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">선택한 금액</span>
              <span className={`budget-value ${totalSelectedPrice > tourismBudget ? 'error' : ''}`}>
                {formatCurrency(totalSelectedPrice)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">남은 예산</span>
              <span className={`budget-value ${tourismBudget - totalSelectedPrice < 0 ? 'error' : 'highlight'}`}>
                {formatCurrency(tourismBudget - totalSelectedPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tourist List */}
      <main className="tourist-content">
        {tourists.length > 0 ? (
          <div className="tourist-grid">
            {tourists.map((tourist) => {
              const isSelected = selectedTourists.has(tourist.id);
              const canSelect = totalSelectedPrice + tourist.price <= tourismBudget || isSelected;
              
              return (
                <div 
                  key={tourist.id} 
                  className={`tourist-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                >
                  <div className="tourist-image-container">
                    <img
                      src={tourist.image}
                      alt={tourist.name}
                      className="tourist-image"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800";
                      }}
                    />
                    <div className="tourist-rating">
                      <IoStar className="star-icon" />
                      <span>{tourist.rating}</span>
                    </div>
                    <div className="tourist-type-badge">
                      <MdCameraAlt className="type-icon" />
                      <span>관광지</span>
                    </div>
                  </div>

                  <div className="tourist-info">
                    <div className="tourist-header">
                      <h3 className="tourist-name">{tourist.name}</h3>
                    </div>

                    <div className="tourist-location">
                      <IoLocation className="location-icon" />
                      <span>{tourist.location}</span>
                    </div>

                    <p className="tourist-description">{tourist.description}</p>

                    <div className="tourist-meta">
                      <span className="review-count">리뷰 {tourist.reviewCount}개</span>
                      {tourist.parkingCount > 0 && (
                        <span className="parking-count">🅿️ 주차 {tourist.parkingCount}대</span>
                      )}
                    </div>
                  </div>

                  <div className="tourist-price-section">
                    <div className="price-info">
                      <span className="price-label">예상 비용</span>
                      <span className="price-value">
                        {tourist.price === 0 ? "무료" : formatCurrency(tourist.price)}
                      </span>
                    </div>

                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleTouristToggle(tourist.id, tourist.price)}
                        disabled={!canSelect}
                      />
                      <span className="checkbox-label">
                        {isSelected ? "선택됨" : canSelect ? "선택하기" : "예산 초과"}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-tourists">
            <div className="no-tourists-icon">📸</div>
            <h3>조건에 맞는 관광지가 없습니다</h3>
            <p>다른 지역을 선택하거나 예산을 조정해보세요.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="tourist-footer">
        <div className="footer-summary">
          <span>선택한 관광지: {selectedTourists.size}개</span>
          <span className="footer-total">
            총 {formatCurrency(totalSelectedPrice)}
          </span>
        </div>
        <button 
          className="complete-button"
          onClick={() => {
            if (selectedTourists.size === 0) {
              alert("최소 1개 이상의 관광지를 선택해주세요.");
              return;
            }
            
            // 선택된 관광지 정보를 배열로 변환
            const selectedTouristData = Array.from(selectedTourists).map(id => {
              const tourist = tourists.find(t => t.id === id);
              return {
                id: tourist.id,
                name: tourist.name,
                price: tourist.price
              };
            });
            
            // URL 파라미터에 선택된 관광지 정보 저장 (기존 파라미터 유지)
            const queryParams = new URLSearchParams(location.search);
            // URLSearchParams.set()은 자동으로 인코딩하므로 JSON.stringify만 사용
            queryParams.set("selectedTourists", JSON.stringify(selectedTouristData));
            queryParams.set("touristTotalPrice", totalSelectedPrice.toString());
            
            // 최종 리포트 페이지로 이동
            navigate(`/report?${queryParams.toString()}`);
          }}
        >
          선택 완료
        </button>
      </footer>
    </div>
  );
};

export default TouristPage;

