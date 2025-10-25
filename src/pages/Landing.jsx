import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/NavBar";
import {
  FiCamera,
  FiUpload,
  FiBookOpen,
  FiTarget,
  FiShoppingCart,
} from "react-icons/fi";

function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/personaldashboard", { replace: true });
    });
  }, [navigate]);

  function handleFileUpload(event) {
    const file = event.target.files[0]; // get selected file
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      const base64Image = reader.result;
      navigate("/analyze", { state: { image: base64Image } });
    };

    reader.readAsDataURL(file);
  }

  return (
    <>
      <Navbar />
      {/* your landing page content here */}
      <div className="min-h-screen flex flex-col justify-center items-center text-center bg-gradient-to-b from-white to-green-50 px-4 pt-24">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight pt-10">
          Discover Your Perfect <br />
          <span className="text-green-600">Meal Plan</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-xl leading-relaxed">
          Upload any dish photo for instant analysis, get personalized meal
          plans, and discover where to buy fresh ingredients in Bohol
        </p>

        {/* Upload & Camera Section */}
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-4xl mx-auto text-center mt-12">
          <div className="flex justify-center mb-4">
            <FiCamera className="text-green-500 text-4xl" />
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Try Our Food Analysis
          </h2>

          <p className="text-gray-600 mb-8">
            Upload/capture a photo of any dish to see the magic happen
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            {/* Upload from gallery or camera */}
            <label
              htmlFor="fileUpload"
              className="flex flex-col justify-center items-center border-2 border-dashed border-green-400 rounded-xl w-64 h-48 cursor-pointer hover:bg-green-50 transition"
            >
              <FiUpload className="text-green-500 text-3xl mb-2" />
              <p className="text-md font-semibold text-gray-800">
                Click to upload
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or take a photo with camera
              </p>

              {/* ✅ accept both gallery + camera */}
              <input
                id="fileUpload"
                type="file"
                accept="image/*"
                capture="environment" // ← this triggers camera on mobile
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full bg-white shadow-md p-8 px-4 md:px-12 text-center mt-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Everything You Need for Healthy Living
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mt-6 max-w-3xl mx-auto leading-relaxed">
            From instant food analysis to personalized meal planning, SmartGenie
            Bohol has all the tools you need
          </p>

          <div className="mt-8 flex flex-col md:flex-row justify-center gap-8 flex-wrap">
            <div className="bg-green-50 border border-green-200 shadow-sm rounded-xl p-6 w-full max-w-xs text-left">
              <h2 className="flex items-center text-xl font-semibold text-green-700 mb-2">
                <FiCamera className="mr-2 text-green-700" size={24} />
                Food Analysis
              </h2>
              <p className="text-gray-700 text-base">
                Instantly identify dishes and get detailed nutritional
                information from any photo.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 shadow-sm rounded-xl p-6 w-full max-w-xs text-left">
              <h2 className="flex items-center text-xl font-semibold text-blue-700 mb-2">
                <FiBookOpen className="mr-2 text-blue-700" size={24} />
                Recipe Discovery
              </h2>
              <p className="text-gray-700 text-base">
                Explore thousands of recipes tailored to your dietary
                preferences and goals.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 shadow-sm rounded-xl p-6 w-full max-w-xs text-left">
              <h2 className="flex items-center text-xl font-semibold text-yellow-700 mb-2">
                <FiTarget className="mr-2 text-yellow-700" size={24} />
                Personal Goals
              </h2>
              <p className="text-gray-700 text-base">
                Set weight loss, muscle gain, or maintenance goals with
                customized meal plans.
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 shadow-sm rounded-xl p-6 w-full max-w-xs text-left">
              <h2 className="flex items-center text-xl font-semibold text-purple-700 mb-2">
                <FiShoppingCart className="mr-2 text-purple-700" size={24} />
                Local Markets
              </h2>
              <p className="text-gray-700 text-base">
                Find fresh ingredients at local stores in Bohol.
              </p>
            </div>
          </div>
        </div>

        {/* Steps Section */}
        <div className="w-full py-16 px-6 md:px-12 bg-gradient-to-r from-white to-yellow-50">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
            Simple Steps to Better Nutrition
          </h1>
          <div className="w-full flex flex-col md:flex-row justify-center gap-12 px-6 md:px-12 py-12">
            <div className="flex flex-col items-center max-w-xs text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload & Analyze</h3>
              <p className="text-gray-700">
                Take a photo of any dish for instant nutritional analysis.
              </p>
            </div>

            <div className="flex flex-col items-center max-w-xs text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500 text-white font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Set Your Goals</h3>
              <p className="text-gray-700">
                Define your health objectives and dietary preferences.
              </p>
            </div>

            <div className="flex flex-col items-center max-w-xs text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 text-white font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Suggested Meal</h3>
              <p className="text-gray-700">
                Get personalized meal plans with local ingredient sourcing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-6 md:px-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              SmartGenie Bohol
            </h2>
            <p>Your personal nutrition companion for healthy living in Bohol</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
            <ul className="space-y-2">
              <li>Food Analysis</li>
              <li>Meal Planning</li>
              <li>Recipe Discovery</li>
              <li>Local Markets</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Community</h3>
            <ul className="space-y-2">
              <li>Success Stories</li>
              <li>Recipe Sharing</li>
              <li>Health Tips</li>
              <li>Support Groups</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
            <p>smartGenie@bohol.com</p>
            <p className="mt-2">+63 912 4567 124</p>
            <p className="mt-2">Tagbilaran City, Bohol</p>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm text-gray-500">
          © 2025 SmartGenie Bohol. All rights reserved.
        </div>
      </footer>
    </>
  );
}

export default LandingPage;
