import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoArrowBackSharp } from "react-icons/io5";
import "../WhoPage.css";

const whoOptions = ["혼자", "반려동물", "친구", "연인", "부모님", "기타"];

const WhoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { region, period } = location.state || {};

  const [selectedWho, setSelectedWho] = useState([]);

  const toggleWho = (who) => {
    if (selectedWho.includes(who)) {
      setSelectedWho(selectedWho.filter((item) => item !== who));
    } else {
      setSelectedWho([...selectedWho, who]);
    }
  };

  const handleNext = () => {
    if (selectedWho.length > 0) {
      navigate("/question/style", {
        state: {
          region,
          period,
          who: selectedWho, // 배열로 넘김
        },
      });
    } else {
      alert("동행자를 1명 이상 선택해주세요!");
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="container">
      <header className="region-header">
        <button className="back-button" onClick={handleBack}>
          <IoArrowBackSharp size={24} />
        </button>
        <span className="step-indicator">3/5</span>
      </header>

      <main className="period-content">
        <h1 className="title">👯 누구와 함께하나요?</h1>
        <p className="subtitle">해당하는 모든 항목을 선택해주세요.</p>
        <div className="period-grid">
          {whoOptions.map((who) => (
            <button
              key={who}
              className={`period-button ${
                selectedWho.includes(who) ? "selected" : ""
              }`}
              onClick={() => toggleWho(who)}
            >
              {who}
            </button>
          ))}
        </div>
      </main>

      <footer className="period-footer">
        <button className="next-button" onClick={handleNext}>
          다음
        </button>
      </footer>
    </div>
  );
};

export default WhoPage;
