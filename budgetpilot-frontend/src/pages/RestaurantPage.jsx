import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp, IoStar, IoLocation } from "react-icons/io5";
import { MdRestaurant, MdLocalCafe } from "react-icons/md";
import "../RestaurantPage.css";

const BACKEND_URL =
  window.__BACKEND__ ||
  import.meta?.env?.VITE_BACKEND_URL ||
  "http://localhost:8000";

const RestaurantPage = () => {
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

  const foodBudget = breakdown?.식비 || budget?.식비 || 0;
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState(new Set());
  const [totalSelectedPrice, setTotalSelectedPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (region) params.set("city_keyword", region);
        if (foodBudget > 0) params.set("max_price", String(foodBudget));
        params.set("limit", "80");
        const res = await fetch(`${BACKEND_URL}/restaurants?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setRestaurants(list.map((r, i) => ({
            id: r.id || `r-${i}`,
            name: r.name || "(이름 없음)",
            type: r.type || "식당",
            location: r.location || "",
            price: Number(r.price) || 10000,
            description: r.description || "",
            image: r.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            rating: r.rating ?? 4.0,
            reviewCount: r.reviewCount ?? 0,
          })));
        }
      } catch (e) {
        console.warn("식당 API 실패:", e);
        if (!cancelled) setRestaurants([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [region, foodBudget]);

  const handleRestaurantToggle = (restaurantId, price) => {
    setSelectedRestaurants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(restaurantId)) {
        newSet.delete(restaurantId);
        setTotalSelectedPrice((prevPrice) => prevPrice - price);
      } else {
        // 예산 체크
        const newTotal = totalSelectedPrice + price;
        if (newTotal > foodBudget) {
          alert(`예산을 초과합니다! (현재: ₩${newTotal.toLocaleString()}, 예산: ₩${foodBudget.toLocaleString()})`);
          return prev;
        }
        newSet.add(restaurantId);
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
      <div className="restaurant-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>식당을 찾고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-page">
      {/* Header */}
      <header className="restaurant-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={22} />
        </button>
        <span className="page-title">🍽️ 식당 & 카페 추천</span>
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
              <span className="budget-label">식비 예산</span>
              <span className="budget-value highlight">
                {formatCurrency(foodBudget)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">선택한 금액</span>
              <span className={`budget-value ${totalSelectedPrice > foodBudget ? 'error' : ''}`}>
                {formatCurrency(totalSelectedPrice)}
              </span>
            </div>
            <div className="budget-item">
              <span className="budget-label">남은 예산</span>
              <span className={`budget-value ${foodBudget - totalSelectedPrice < 0 ? 'error' : 'highlight'}`}>
                {formatCurrency(foodBudget - totalSelectedPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant List */}
      <main className="restaurant-content">
        {restaurants.length > 0 ? (
          <div className="restaurant-grid">
            {restaurants.map((restaurant) => {
              const isSelected = selectedRestaurants.has(restaurant.id);
              const canSelect = totalSelectedPrice + restaurant.price <= foodBudget || isSelected;
              
              return (
                <div 
                  key={restaurant.id} 
                  className={`restaurant-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                >
                  <div className="restaurant-image-container">
                    <img
                      src={restaurant.image}
                      alt={restaurant.name}
                      className="restaurant-image"
                      onError={(e) => {
                        e.currentTarget.src =
                          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
                      }}
                    />
                    <div className="restaurant-rating">
                      <IoStar className="star-icon" />
                      <span>{restaurant.rating}</span>
                    </div>
                    <div className="restaurant-type-badge">
                      {restaurant.type === "카페" ? (
                        <MdLocalCafe className="type-icon" />
                      ) : (
                        <MdRestaurant className="type-icon" />
                      )}
                      <span>{restaurant.type}</span>
                    </div>
                  </div>

                  <div className="restaurant-info">
                    <div className="restaurant-header">
                      <h3 className="restaurant-name">{restaurant.name}</h3>
                    </div>

                    <div className="restaurant-location">
                      <IoLocation className="location-icon" />
                      <span>{restaurant.location}</span>
                    </div>

                    <p className="restaurant-description">{restaurant.description}</p>

                    <div className="restaurant-meta">
                      <span className="review-count">리뷰 {restaurant.reviewCount}개</span>
                    </div>
                  </div>

                  <div className="restaurant-price-section">
                    <div className="price-info">
                      <span className="price-label">예상 비용</span>
                      <span className="price-value">
                        {formatCurrency(restaurant.price)}
                      </span>
                    </div>

                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRestaurantToggle(restaurant.id, restaurant.price)}
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
          <div className="no-restaurants">
            <div className="no-restaurants-icon">🍽️</div>
            <h3>조건에 맞는 식당이 없습니다</h3>
            <p>다른 지역을 선택하거나 예산을 조정해보세요.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="restaurant-footer">
        <div className="footer-summary">
          <span>선택한 식당: {selectedRestaurants.size}개</span>
          <span className="footer-total">
            총 {formatCurrency(totalSelectedPrice)}
          </span>
        </div>
        <button 
          className="complete-button"
          onClick={() => {
            if (selectedRestaurants.size === 0) {
              alert("최소 1개 이상의 식당을 선택해주세요.");
              return;
            }
            
            // 선택된 식당 정보를 배열로 변환
            const selectedRestaurantData = Array.from(selectedRestaurants).map(id => {
              const restaurant = restaurants.find(r => r.id === id);
              return {
                id: restaurant.id,
                name: restaurant.name,
                price: restaurant.price
              };
            });
            
            // URL 파라미터에 선택된 식당 정보 저장 (기존 파라미터 유지)
            const queryParams = new URLSearchParams(location.search);
            // URLSearchParams.set()은 자동으로 인코딩하므로 JSON.stringify만 사용
            queryParams.set("selectedRestaurants", JSON.stringify(selectedRestaurantData));
            queryParams.set("restaurantTotalPrice", totalSelectedPrice.toString());
            
            navigate(`/tourist?${queryParams.toString()}`);
          }}
        >
          선택 완료
        </button>
      </footer>
    </div>
  );
};

export default RestaurantPage;

