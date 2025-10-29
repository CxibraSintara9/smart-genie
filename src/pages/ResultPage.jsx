import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiMessageCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import FooterNav from "../components/FooterNav";
import { CheckCircle, AlertTriangle, Target } from "lucide-react";
import { getBoholCities, recommendStoresForIngredients } from "../services/storeService";

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dishId = location.state?.dishId;
  const fallbackImage = location.state?.imageSrc;
  const accuracy = location.state?.accuracy;
  const allMatches = location.state?.allMatches || [];
  const isLoggedIn = location.state?.isLoggedIn || false;
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServing, setSelectedServing] = useState("Per 100g");
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState("tagbilaran");
  const [storeTypeFilters, setStoreTypeFilters] = useState([]);
  const [boholCities, setBoholCities] = useState([]);
  const [storeRecommendations, setStoreRecommendations] = useState([]);

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const servingOptions = [
    { label: "Per 100g", multiplier: 1 },
    { label: "Per serving (152g)", multiplier: 1.52 },
    { label: "Per cup (245g)", multiplier: 2.45 },
  ];

  const getNutritionValue = (baseValue) => {
    const multiplier =
      servingOptions.find((s) => s.label === selectedServing)?.multiplier || 1;
    return (baseValue * multiplier).toFixed(1);
  };

  useEffect(() => {
    if (!dishId) {
      navigate("/", { replace: true });
      return;
    }

    const fetchDish = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("dishinfo")
        .select(
          `
          id,
          name,
          image_url,
          calories_label,
          calories_value,
          protein_label,
          protein_value,
          fat_label,
          fat_value,
          carbs_label,
          carbs_value,
          ingredient,
          store,
          dietary,
          allergen,
          goal,
          description
        `
        )
        .eq("id", dishId)
        .single();

      if (error) {
        setError("Failed to load dish info: " + error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setDish({
          id: data.id,
          name: data.name,
          image: fallbackImage || data.image_url,
          calories: data.calories_value || 0,
          protein: data.protein_value || 0,
          fat: data.fat_value || 0,
          carbs: data.carbs_value || 0,
          ingredient: data.ingredient || "", // <-- add this
          store: data.store || "", // <-- add this
          dietary: Array.isArray(data.dietary) ? data.dietary : [],
          allergen: Array.isArray(data.allergen) ? data.allergen : [],
          goal: Array.isArray(data.goal) ? data.goal : [],
          description: data.description || "",
        });
      }

      setLoading(false);
    };

    fetchDish();
  }, [dishId, fallbackImage, navigate]);

  const ingredientList = dish?.ingredient
    ? Array.isArray(dish.ingredient)
      ? dish.ingredient.map((n) => ({ name: n }))
      : String(dish.ingredient)
          .split(",")
          .map((n) => ({ name: n.trim() }))
    : [];

  useEffect(() => {
    (async () => {
      const cities = await getBoholCities();
      setBoholCities(cities || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!dish) {
        setStoreRecommendations([]);
        return;
      }
      const recs = await recommendStoresForIngredients(ingredientList, selectedCityId, {
        onlyTypes: storeTypeFilters,
      });
      setStoreRecommendations(recs || []);
    })();
  }, [dish, selectedCityId, storeTypeFilters]);

  // ---- Feedback ----
  const handleSubmitFeedback = async () => {
    if (!isLoggedIn) {
      alert("You must log in first to submit feedback.");
      navigate("/login");
      return;
    }
    if (!feedbackText.trim()) {
      alert("Please enter your feedback.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from("feedback_submissions").insert([
      {
        user_id: userData.user.id,
        dish_id: dish.id,
        feedback_text: feedbackText.trim(),
      },
    ]);

    if (error) {
      alert("Failed to submit feedback.");
    } else {
      alert("Thank you for your feedback!");
      setFeedbackText("");
      setShowFeedbackModal(false);
    }
  };

  if (!dishId) return null;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 p-4">
        <p className="text-lg font-medium text-gray-600 animate-pulse">
          Loading dish details...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4">
      <div className="bg-white/90 backdrop-blur-md w-[375px] h-[667px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-green-200">
        {/* Dish Image */}
        <div className="p-4 relative">
          <div className="relative">
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={dish.image}
              alt={dish.name}
              className="w-full h-[200px] object-cover rounded-2xl shadow-lg"
            />

            {/* Match percentage inside the image (bottom-right) */}
            {accuracy && (
              <span className="absolute bottom-3 right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                {accuracy}% Match
              </span>
            )}
          </div>
          {/* Note below the image */}
          <p className="mt-2 text-xs text-yellow-800 bg-yellow-100 border border-yellow-200 px-3 py-2 rounded-lg shadow-sm">
            ⚠️ Note: This is a suggested dish and may not be accurately detected.
          </p>
        </div>

        {/* Scrollable Content (hidden scrollbar) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {dish.name}
            </h1>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="bg-green-500 p-2 rounded-full shadow-md hover:bg-green-600 transition"
              title="Give Feedback"
            >
              <FiMessageCircle className="text-white w-5 h-5" />
            </button>
          </div>

          {/* Dish description */}
          {dish.description && (
            <div className="mb-5 text-sm text-gray-600">
              <p className="leading-relaxed">
                {showFullDescription
                  ? dish.description
                  : dish.description.length > 100
                  ? dish.description.slice(0, 100) + "..."
                  : dish.description}
              </p>
              {dish.description.length > 100 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-green-500 font-medium text-sm mt-1 hover:underline"
                >
                  {showFullDescription ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {/* Low confidence notice and toggle removed by request */}

          {/* Multiple Matches Display */}
          {showAllMatches && allMatches.length > 1 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold mb-2">All Matches:</h3>
              <div className="space-y-2">
                {allMatches.map((match, index) => (
                  <div
                    key={match.id}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      match.id === dishId
                        ? "bg-green-100 border-green-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      // Update the selected dish
                      setDish({
                        id: match.id,
                        name: match.name,
                        image: fallbackImage || match.image_url,
                        calories: match.calories_value || 0,
                        protein: match.protein_value || 0,
                        fat: match.fat_value || 0,
                        carbs: match.carbs_value || 0,
                        dietary: Array.isArray(match.dietary)
                          ? match.dietary
                          : [],
                        allergen: Array.isArray(match.allergen)
                          ? match.allergen
                          : [],
                        goal: Array.isArray(match.goal) ? match.goal : [],
                        description: match.description || "",
                      });
                      setShowAllMatches(false);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{match.name}</span>
                      <span className="text-xs text-gray-500">
                        {match.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition Section */}
          <div className="border border-green-200 rounded-2xl shadow-lg overflow-hidden mb-6 bg-gradient-to-br from-green-50 to-green-100">
            <div className="p-4">
              <p className="font-bold text-center text-green-900 mb-4 text-lg">
                Nutrition Value
              </p>

              <div className="mb-5 flex items-center gap-2">
                <label className="text-sm font-medium text-green-800">
                  Serving Size:
                </label>
                <select
                  value={selectedServing}
                  onChange={(e) => setSelectedServing(e.target.value)}
                  className="border border-green-300 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm shadow-sm focus:ring-2 focus:ring-green-400 focus:outline-none cursor-pointer"
                >
                  {servingOptions.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {[
                {
                  label: "Calories",
                  value: dish.calories,
                  color: "bg-red-500",
                },
                { label: "Protein", value: dish.protein, color: "bg-blue-500" },
                { label: "Fat", value: dish.fat, color: "bg-yellow-500" },
                { label: "Carbs", value: dish.carbs, color: "bg-green-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full inline-block ${color}`}
                      ></span>
                      <p className="font-medium text-gray-700">{label}</p>
                    </div>
                    <p className="font-semibold text-gray-800">
                      {getNutritionValue(value)}
                    </p>
                  </div>
                  <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          (getNutritionValue(value) / 300) * 100,
                          100
                        )}%`,
                      }}
                      transition={{ duration: 0.8 }}
                      className={`h-2 rounded-full ${color}`}
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-green-100 text-green-800 text-xs px-3 py-2">
              💡 Tip: Balanced nutrition keeps you energized!
            </div>
          </div>
          {/* Ingredients List */}
          {dish.ingredient && dish.ingredient.length > 0 && (
            <div className="mb-4">
              <p className="font-semibold text-gray-800 mb-2">Ingredients:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {Array.isArray(dish.ingredient)
                  ? dish.ingredient.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))
                  : dish.ingredient
                      .split(",")
                      .map((item, index) => <li key={index}>{item.trim()}</li>)}
              </ul>
            </div>
          )}

          {/* Where to buy (Bohol) - mobile-first accordion style */}
          {ingredientList.length > 0 && (
            <div className="mb-5 border rounded-xl border-green-200">
              <div className="p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800">Where to buy (Bohol)</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-gray-700">
                    City/Municipality
                    <select
                      className="ml-2 border rounded px-2 py-1 text-sm"
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                    >
                      {boholCities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "supermarket", label: "Supermarket" },
                      { id: "public_market", label: "Public Market" },
                    ].map((t) => {
                      const active = storeTypeFilters.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() =>
                            setStoreTypeFilters((prev) =>
                              active ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                            )
                          }
                          className={`px-3 py-1 rounded-full text-sm border ${
                            active ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-green-200"
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  {storeRecommendations.map((rec) => (
                    <div key={rec.ingredient.name} className="border rounded-lg p-3 border-green-100">
                      <div className="text-sm font-medium text-gray-800 mb-2">{rec.ingredient.name}</div>
                      {rec.stores.length ? (
                        <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                          {rec.stores.map((s) => (
                            <li key={s.id}>
                              <span className="font-medium">{s.name}</span>
                              <span className="ml-2 text-xs text-gray-500">{s.type === "public_market" ? "Public Market" : "Supermarket"}</span>
                              {s.address ? <span className="ml-2 text-xs text-gray-500">{s.address}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-500">No suggestions for this city. Try removing filters.</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Store List */}
          {dish.store && dish.store.length > 0 && (
            <div className="mb-5">
              <p className="font-semibold text-gray-800 mb-2">Available at:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {Array.isArray(dish.store)
                  ? dish.store.map((item, index) => <li key={index}>{item}</li>)
                  : dish.store
                      .split(",")
                      .map((item, index) => <li key={index}>{item.trim()}</li>)}
              </ul>
            </div>
          )}

          {/* Dietary Info */}
          <div className="mb-5 space-y-1">
            {dish.dietary.length > 0 && (
              <p className="text-sm text-green-500 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-700" />
                <span>Dietary: {dish.dietary.join(", ")}</span>
              </p>
            )}
            {dish.allergen.length > 0 && (
              <p className="text-sm text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                <span>Allergens: {dish.allergen.join(", ")}</span>
              </p>
            )}
            {dish.goal.length > 0 && (
              <p className="text-sm text-blue-500 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-700" />
                <span>Goal: {dish.goal.join(", ")}</span>
              </p>
            )}
          </div>
          {/* Feedback Button */}

          {isLoggedIn ? (
            <FooterNav />
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition duration-200"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {/* --- Feedback Modal --- */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white rounded-2xl shadow-lg w-80 p-5 text-center">
              <h2 className="text-lg font-bold mb-3">Submit Feedback</h2>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full border border-green-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-green-400 outline-none"
                rows="3"
                placeholder="Your feedback..."
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  Submit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
