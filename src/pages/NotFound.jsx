import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiMessageCircle, FiPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import FooterNav from "../components/FooterNav";

export default function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { imageSrc, failReason, dishId } = location.state || {};
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkLogin();
  }, []);

  const handleSubmitFeedback = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("You must login first");
      navigate("/login");
      return;
    }
    if (!feedbackText.trim()) {
      alert("Please enter feedback.");
      return;
    }
    try {
      await supabase.from("feedback_submissions").insert([
        {
          user_id: user.id,
          dish_id: dishId || null,
          feedback_text: feedbackText.trim(),
        },
      ]);
      alert("Thank you for your feedback!");
      setFeedbackText("");
      setShowFeedbackModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to submit feedback.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative">
      <div className="bg-white w-[375px] h-[667px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Uploaded Image */}
        <div className="w-full h-[220px] flex items-center justify-center overflow-hidden rounded-t-2xl shadow-md bg-gray-100">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Uploaded"
              className="object-cover w-full h-full transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <p className="text-gray-400 text-center">No image uploaded</p>
          )}
        </div>

        {/* Dish Not Found Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 text-center mt-4">
            Dish Not Found
          </h1>
          <p className="text-sm text-gray-600 mt-2 mb-6 text-center">
            {failReason ||
              "Sorry, we couldn’t recognize this dish. Try again with a clearer photo."}
          </p>

          {/* Nutrition Facts */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-inner overflow-hidden mb-6 p-4">
            <p className="font-semibold text-center mb-4">Nutrition Facts</p>
            {[
              { label: "Calories", color: "bg-red-400" },
              { label: "Protein", color: "bg-blue-400" },
              { label: "Fat", color: "bg-yellow-400" },
              { label: "Carbs", color: "bg-green-400" },
            ].map(({ label, color }) => (
              <div
                key={label}
                className="flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full ${color}`}></span>
                  <p className="text-gray-700">{label}</p>
                </div>
                <p className="font-medium text-gray-800">0</p>
              </div>
            ))}
            <div className="bg-indigo-50 text-indigo-800 text-xs px-3 py-2 rounded-md text-center">
              Tip: Balanced nutrition keeps you energized!
            </div>
          </div>
        </div>

        {/* Scan Another Dish (only for guests) */}
        {!isLoggedIn && (
          <label
            htmlFor="cameraUpload"
            className="w-full border-t border-gray-200 flex items-center justify-center p-3 hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="bg-blue-600 rounded-full p-3 flex items-center justify-center shadow-md hover:bg-blue-700 transition">
              <FiPlus className="text-white" size={24} />
            </div>
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
                  navigate("/analyze", { state: { image: reader.result } });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        )}

        {/* Floating Feedback Button */}
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="absolute bottom-20 right-5 bg-indigo-600 text-white rounded-full p-3 shadow-lg hover:bg-indigo-700 transition"
        >
          <FiMessageCircle size={22} />
        </button>

        {/* Footer Nav Only if Logged In */}
        {isLoggedIn && <FooterNav />}
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full max-w-md rounded-xl shadow-lg p-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h2 className="text-lg font-bold mb-3">Give Feedback</h2>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm mb-4 focus:outline-indigo-500"
                rows={4}
                placeholder="Write your feedback..."
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
