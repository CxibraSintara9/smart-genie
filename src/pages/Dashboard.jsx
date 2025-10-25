import React, { useState } from "react";
import { FaInfoCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex items-center justify-center px-4 py-4">
      <div className="bg-white w-[375px] h-[667px] rounded-2xl shadow-2xl pt-5 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-center text-gray-800">
            <FaInfoCircle className="inline-block mr-2 text-blue-600" />
            Health Disclaimer for Smart Genie
          </h2>
          <p className="text-gray-600 text-sm mt-4 px-6 text-justify">
            The information provided by SmartGenie is for general informational
            and educational purposes only. While we strive to offer accurate
            nutritional details and personalized meal suggestions, SmartGenie is
            not a substitute for professional medical advice, diagnosis, or
            treatment. <br />
            Always consult with a qualified healthcare provider, registered
            dietitian, or nutritionist before making any significant changes to
            your diet, especially if you have food allergies, medical
            conditions, or specific dietary requirements. <br />
            SmartGenie does not guarantee the accuracy, completeness, or safety
            of any meal recommendation or ingredient information. Users are
            responsible for reviewing ingredient labels and consulting
            appropriate professionals as needed. <br /> <br />
            <span className="font-bold">
              Use SmartGenie at your own discretion.
            </span>
          </p>
        </div>
        <div className="flex justify-center mb-6">
          <button
            onClick={() => navigate("/create-profile")} // replace with your logic
            className="w-[250px] border border-violet-600 text-violet-700 font-semibold py-3 rounded-xl shadow-md 
             transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-violet-600 hover:text-white"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
