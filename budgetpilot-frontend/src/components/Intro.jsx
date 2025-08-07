
import { Link } from "react-router-dom";

export default function Intro() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white px-4 text-center">
      <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
        🎒 <span className="text-yellow-300">BudgetPilot</span>에 오신 걸 환영합니다!
      </h1>
      <p className="text-lg md:text-xl mb-8 text-gray-200">
        여행 예산을 기준으로 나만의 여행을 추천받아보세요.
      </p>
      <Link
        to="/input"
        className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-full hover:bg-yellow-300 transition duration-300 shadow-lg"
      >
        여행 시작하기
      </Link>
    </div>
  );
}

