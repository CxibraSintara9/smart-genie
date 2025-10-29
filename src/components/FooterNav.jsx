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
    <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 rounded-t-2xl shadow-md h-[70px]">
      <div className="flex items-center justify-around h-full px-6">
        {/* Home */}
        <button
          onClick={() => navigate("/personaldashboard")}
          className={`flex flex-col items-center justify-center transition-colors ${
            isHome ? "text-green-500" : "text-gray-500 hover:text-green-500"
          }`}
          aria-label="Home"
        >
          <FiHome size={25} />
        </button>

        {/* Journal */}
        <button
          onClick={() => navigate("/journal")}
          className={`flex flex-col items-center justify-center transition-colors ${
            isJournal ? "text-green-500" : "text-gray-500 hover:text-green-500"
          }`}
          aria-label="Journal"
        >
          <FiBookOpen size={25} />
        </button>

        {/* Workout */}
        <button
          onClick={() => navigate("/workout")}
          className={`flex flex-col items-center justify-center transition-colors ${
            isWorkout ? "text-green-500" : "text-gray-500 hover:text-green-500"
          }`}
          aria-label="Workout"
        >
          <FaDumbbell size={25} />
        </button>

        {/* Scan / Plus */}
        <label
          htmlFor="cameraUpload"
          className={`flex flex-col items-center justify-center text-gray-500 hover:text-green-500 cursor-pointer transition-colors`}
          aria-label="Scan Dish"
        >
          <FiPlus size={32} />
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

        {/* Meal Plan */}
        <button
          onClick={() => navigate("/mealplan")}
          className={`flex flex-col items-center justify-center transition-colors ${
            isPlan ? "text-green-500" : "text-gray-500 hover:text-green-500"
          }`}
          aria-label="Meal Plan"
        >
          <FiCalendar size={25} />
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate("/settings")}
          className={`flex flex-col items-center justify-center transition-colors ${
            isProfile ? "text-green-500" : "text-gray-500 hover:text-green-500"
          }`}
          aria-label="Settings"
        >
          <FiSettings size={25} />
        </button>
      </div>
    </div>

  );
}
