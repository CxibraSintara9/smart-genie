import React from "react";
import {
  FiHome,
  FiPlus,
  FiSettings,
  FiBookOpen,
  FiPaperclip,
  FiCalendar,
} from "react-icons/fi";
import { FaDumbbell } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

export default function FooterNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Active states
  const isHome =
    location.pathname === "/personaldashboard" ||
    location.pathname === "/profile";
  const isJournal = location.pathname === "/journal";
  const isProfile = location.pathname === "/settings";
  const isPlan = location.pathname === "/mealplan";
  const isWorkout = location.pathname === "/workout";

  const iconSize = 24; // Same size for all icons
  const buttonSize = "w-12 h-12"; // Uniform button size

  return (
    <div className="relative w-full h-[70px] bg-white border-t flex items-center justify-around px-8 rounded-t-2xl shadow-lg">
      {/* Home */}
      <button
        onClick={() => navigate("/personaldashboard")}
        className={`flex items-center justify-center ${buttonSize} rounded-full transition-colors ${
          isHome
            ? "bg-green-500 text-white shadow-md"
            : "text-gray-500 hover:text-green-500"
        }`}
        aria-label="Home"
      >
        <FiHome size={iconSize} />
      </button>

      {/* Journal */}
      <button
        onClick={() => navigate("/journal")}
        className={`flex items-center justify-center ${buttonSize} rounded-full transition-colors ${
          isJournal
            ? "bg-green-500 text-white shadow-md"
            : "text-gray-500 hover:text-green-500"
        }`}
        aria-label="Journal"
      >
        <FiBookOpen size={iconSize} />
      </button>
      <button
        onClick={() => navigate("/workout")}
        className={`flex items-center justify-center ${buttonSize} rounded-full transition-colors ${
          isWorkout
            ? "bg-green-500 text-white shadow-md"
            : "text-gray-500 hover:text-green-500"
        }`}
        aria-label="workout"
      >
        <FaDumbbell size={iconSize} />
      </button>

      <button
        onClick={() => navigate("/mealplan")}
        className={`flex items-center justify-center ${buttonSize} rounded-full transition-colors ${
          isPlan
            ? "bg-green-500 text-white shadow-md"
            : "text-gray-500 hover:text-green-500"
        }`}
        aria-label="planner"
      >
        <FiCalendar size={iconSize} />
      </button>

      {/* Plus */}
      <label
        htmlFor="cameraUpload"
        className={`flex items-center justify-center ${buttonSize} rounded-full transition-colors text-gray-500 hover:text-green-500 cursor-pointer`}
        aria-label="Scan Dish"
      >
        <FiPlus size={iconSize} />
        <input
          id="cameraUpload"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Image = reader.result;
              navigate("/analyze", { state: { image: base64Image } });
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>

      {/* Profile */}
      <button
        onClick={() => navigate("/settings")}
        className={`flex items-center justify-center ${buttonSize} rounded-full transition-colors ${
          isProfile
            ? "bg-green-500 text-white shadow-md"
            : "text-gray-500 hover:text-green-500"
        }`}
        aria-label="Profile"
      >
        <FiSettings size={iconSize} />
      </button>
    </div>
  );
}
