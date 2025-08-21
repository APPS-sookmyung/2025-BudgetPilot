import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";
import { useQueryNavigator } from "../hook/useQueryNavigator";
import "../PeriodPage.css"; // 별도 CSS

const periodOptions = [
  "당일치기",
  "1박 2일",
  "2박 3일",
  "3박 4일",
  "4박 5일",
  "5박 6일",
];

const PeriodPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { goTo } = useQueryNavigator();

  const searchParams = new URLSearchParams(location.search);
  const regionIds = searchParams.get("region");

  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const handlePeriodClick = (period) => {
    setSelectedPeriod(period);
  };

  const handleNextClick = () => {
    if (selectedPeriod) {
      // 다음 페이지로 region, period 함께 넘기기
      goTo("/question/who", {
        state: {
          region: regionIds,
          period: selectedPeriod,
        },
      });
    } else {
      alert("여행 기간을 선택해주세요!");
    }
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="container">
      {/* Header 고정 */}
      <header className="region-header">
        <button className="back-button" onClick={handleBackClick}>
          <IoArrowBackSharp size={24} />
        </button>
        <span className="step-indicator">2/5</span>
      </header>

      <main className="period-content">
        <h1 className="title">🗓 여행 기간은?</h1>
        <p className="subtitle">원하는 기간을 선택해 주세요.</p>
        <div className="period-grid">
          {periodOptions.map((period) => (
            <button
              key={period}
              className={`period-button ${
                selectedPeriod === period ? "selected" : ""
              }`}
              onClick={() => handlePeriodClick(period)}
            >
              {period}
            </button>
          ))}
        </div>
      </main>

      <footer className="period-footer">
        <button className="next-button" onClick={handleNextClick}>
          다음
        </button>
      </footer>
    </div>
  );
};

export default PeriodPage;
