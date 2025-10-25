import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  FaFire,
  FaDrumstickBite,
  FaOilCan,
  FaBreadSlice,
  FaLeaf,
  FaPlus,
  FaUtensils,
} from "react-icons/fa";

const PersonalDashboard = React.memo(function PersonalDashboard() {
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("nutrition-protocol");
  const [nutritionAdvice, setNutritionAdvice] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [mealLog, setMealLog] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successText, setSuccessText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [mealType, setMealType] = useState("");
  const [servingSize, setServingSize] = useState(1);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  const navigate = useNavigate();
  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 1000); // auto close after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  useEffect(() => {
    const checkUserAndDisclaimer = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      // ✅ Show disclaimer only on first login or if last login > 1 day
      const lastLogin = localStorage.getItem("lastLoginTime");
      const now = new Date();

      let show = false;

      if (!lastLogin) {
        show = true; // first login ever
      } else {
        const last = new Date(lastLogin);
        const diffMs = now - last;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays >= 1) show = true; // inactive >= 1 day
      }

      if (show) setShowDisclaimer(true);

      // ✅ Update last login for next session
      localStorage.setItem("lastLoginTime", now.toISOString());
    };

    checkUserAndDisclaimer();
  }, [navigate]);

  // -------------------- Fetch Data (Ultra-Optimized) --------------------
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Batch all database queries for better performance
        const [profileResult, mealResult, workoutResult, dishesResult] = await Promise.all([
          supabase
            .from("health_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("meal_logs")
            .select("*")
            .eq("user_id", user.id)
            .order("meal_date", { ascending: true }),
          supabase
            .from("workouts")
            .select("calories_burned, fat_burned, carbs_burned")
            .eq("user_id", user.id),
          supabase
            .from("dishes")
            .select(`
              id, name
            `)
        ]);

        // Handle profile data
        if (!profileResult.error && profileResult.data) {
          setProfile(profileResult.data);
          setNutritionAdvice(getNutritionAdvice(profileResult.data));
        } else {
          navigate("/profile");
          setProfile(null);
          setNutritionAdvice([]);
        }

        // Handle meal logs
        if (mealResult.error) {
          console.error("Meal logs fetch error:", mealResult.error.message);
        } else {
          setMealLog(mealResult.data || []);
        }

        // Handle workouts
        if (workoutResult.error) {
          console.error("Workout fetch error:", workoutResult.error.message);
        } else {
          setWorkouts(workoutResult.data || []);
        }

        // Handle dishes
        if (dishesResult.error) {
          console.error("Dish fetch error:", dishesResult.error.message);
        } else {
          setDishes(dishesResult.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // -------------------- Nutrition Advice --------------------
  const getNutritionAdvice = (profile) => {
    const advice = [];

    if (profile.weight_kg && profile.height_cm) {
      const bmi = (profile.weight_kg / (profile.height_cm / 100) ** 2).toFixed(
        1
      );
      if (bmi < 18.5)
        advice.push(
          "You're underweight. Increase calorie intake with nutrient-dense foods."
        );
      else if (bmi >= 25 && bmi < 30)
        advice.push(
          "You're overweight. Consider a calorie deficit with more whole foods."
        );
      else if (bmi >= 30)
        advice.push(
          "Obesity risk detected. Focus on calorie control and regular exercise."
        );
      else
        advice.push(
          "Your BMI is in a healthy range. Maintain with balanced meals."
        );
    }

    if (profile.allergens?.length)
      advice.push(`Avoid foods containing: ${profile.allergens.join(", ")}.`);

    advice.push("Stay consistent with sleep (7–9 hours) to support recovery.");
    advice.push("Drink at least 2–3 liters of water daily.");

    return advice;
  };

  // -------------------- Derived fallbacks (must be before any early return) --------------------
  const derived = React.useMemo(() => {
    // Derive macros if any are missing using simple defaults
    const heightCm = Number(profile?.height_cm) || 0;
    const weightKg = Number(profile?.weight_kg) || 0;
    if (heightCm <= 0 || weightKg <= 0) return {};
    const calories = Math.round(25 * weightKg);
    let proteinPerc = 0.25,
      fatPerc = 0.3,
      carbPerc = 0.45;
    const protein = Math.round((calories * proteinPerc) / 4);
    const fats = Math.round((calories * fatPerc) / 9);
    const carbs = Math.round((calories * carbPerc) / 4);
    return { calories, protein, fats, carbs };
  }, [profile]);

  // -------------------- Totals (Memoized for Performance) --------------------
  const nutritionTotals = useMemo(() => {
    if (!profile) return {};

    const dailyCalories = Number(profile.calorie_needs) || derived.calories || 0;
    const dailyFats = Number(profile.fats_needed) || derived.fats || 0;
    const dailyCarbs = Number(profile.carbs_needed) || derived.carbs || 0;
    const dailyProtein = Number(profile.protein_needed) || derived.protein || 0;
    const timeframeDays = Number(profile.timeframe) || 1;

    const totalCalories = dailyCalories * timeframeDays;
    const totalFats = dailyFats * timeframeDays;
    const totalProtein = dailyProtein * timeframeDays;
    const totalCarbs = dailyCarbs * timeframeDays;

    const consumedTotals = mealLog.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        fats: acc.fats + (meal.fat || 0),
        carbs: acc.carbs + (meal.carbs || 0),
      }),
      { calories: 0, protein: 0, fats: 0, carbs: 0 }
    );

    // Deduct calories, fats, and carbs burned from workouts
    const burnedTotals = workouts.reduce(
      (acc, workout) => ({
        calories: acc.calories + (workout.calories_burned || 0),
        fats: acc.fats + (workout.fat_burned || 0),
        carbs: acc.carbs + (workout.carbs_burned || 0),
      }),
      { calories: 0, fats: 0, carbs: 0 }
    );

    // netTotals = total 'used' amounts (meals eaten + burned during workouts)
    const netTotals = {
      calories: consumedTotals.calories + burnedTotals.calories,
      protein: consumedTotals.protein, // protein isn't typically subtracted by workouts here
      fats: consumedTotals.fats + burnedTotals.fats,
      carbs: consumedTotals.carbs + burnedTotals.carbs,
    };

    const remainingTotals = {
      calories: totalCalories - netTotals.calories,
      protein: totalProtein - netTotals.protein,
      fats: totalFats - netTotals.fats,
      carbs: totalCarbs - netTotals.carbs,
    };

    const progressPercent = totalCalories
      ? Math.min(100, Math.round((netTotals.calories / totalCalories) * 100))
      : 0;

    return {
      dailyCalories,
      dailyFats,
      dailyCarbs,
      dailyProtein,
      totalCalories,
      totalFats,
      totalProtein,
      totalCarbs,
      consumedTotals,
      netTotals,
      remainingTotals,
      progressPercent
    };
  }, [profile, derived, mealLog, workouts]);

  // Destructure for easier access
  const {
    dailyCalories = 0,
    dailyFats = 0,
    dailyCarbs = 0,
    dailyProtein = 0,
    totalCalories = 0,
    totalFats = 0,
    totalProtein = 0,
    totalCarbs = 0,
    consumedTotals = { calories: 0, protein: 0, fats: 0, carbs: 0 },
    netTotals = { calories: 0, protein: 0, fats: 0, carbs: 0 },
    remainingTotals = { calories: 0, protein: 0, fats: 0, carbs: 0 },
    progressPercent = 0
  } = nutritionTotals;

  // -------------------- Format Date Helper (Memoized) --------------------
  const formatDate = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // -------------------- Chart Data (Ultra-Optimized) --------------------
  const chartData = useMemo(() => {
    if (!mealLog.length) return [];

    // Group meals by date for faster lookup
    const mealsByDate = mealLog.reduce((acc, meal) => {
      const dateKey = meal.meal_date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meal);
      return acc;
    }, {});

    const startDate = new Date(mealLog[0].meal_date);
    const endDate = new Date(mealLog[mealLog.length - 1].meal_date);
    
    // Limit chart data to last 30 days for better performance
    const maxDays = 30;
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const actualEndDate = daysDiff > maxDays ? new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000) : endDate;

    const days = [];
    for (
      let d = new Date(startDate);
      d <= actualEndDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = formatDate(new Date(d));
      const mealsOfDay = mealsByDate[dateStr] || [];
      
      // Pre-calculate totals to avoid multiple reduce calls
      let calories = 0, protein = 0, fats = 0, carbs = 0;
      for (const meal of mealsOfDay) {
        calories += meal.calories || 0;
        protein += meal.protein || 0;
        fats += meal.fat || 0;
        carbs += meal.carbs || 0;
      }
      
      days.push({
        date: dateStr,
        calories,
        protein,
        fats,
        carbs,
      });
    }
    return days;
  }, [mealLog, formatDate]);

  // -------------------- Suggested Dishes (Ultra-Optimized) --------------------
  const suggestedDishes = useMemo(() => {
    if (!profile || !dishes?.length) return [];

    // Early return if no restrictions
    const hasAllergens = profile.allergens?.length > 0;
    const hasGoal = profile.goal;
    const hasEatingStyle = profile.eating_style;

    if (!hasAllergens && !hasGoal && !hasEatingStyle) {
      return dishes; // Return all dishes if no filters
    }

    // Pre-compute user preferences once
    const userAllergens = hasAllergens ? (profile.allergens || []).map(a => a.toLowerCase().trim()) : [];
    const userGoal = hasGoal ? profile.goal.toLowerCase().trim() : '';
    const userEatingStyle = hasEatingStyle ? profile.eating_style.toLowerCase().trim() : '';

    return dishes.filter((dish) => {
      // Quick early returns for better performance
      if (hasAllergens) {
        const dishName = (dish.name || "").toLowerCase();
        const dishDescription = (dish.description || "").toLowerCase();
        const hasAllergen = userAllergens.some(allergen => 
          dishName.includes(allergen) || dishDescription.includes(allergen)
        );
        if (hasAllergen) return false;
      }

      if (hasGoal && dish.goal && !dish.goal.toLowerCase().includes(userGoal)) {
        return false;
      }

      if (hasEatingStyle && dish.eating_style && !dish.eating_style.toLowerCase().includes(userEatingStyle)) {
        return false;
      }

      return true;
    });
  }, [profile, dishes]);

  // Filter by search query (ultra-optimized)
  const filteredDishes = useMemo(() => {
    if (!searchTerm.trim()) return suggestedDishes;
    
    const query = searchTerm.toLowerCase().trim();
    const queryLength = query.length;
    
    // Early return for very short queries
    if (queryLength < 2) return suggestedDishes;
    
    return suggestedDishes.filter((dish) => {
      const dishName = dish.name?.toLowerCase() || "";
      const dishDescription = dish.description?.toLowerCase() || "";
      
      // Quick string matching with early returns
      return dishName.includes(query) || dishDescription.includes(query);
    });
  }, [suggestedDishes, searchTerm]);

  const handleAddMeal = useCallback(async (dish, mealType, multiplier, servingSize) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = formatDate(new Date());

    const newEntry = {
      user_id: user.id,
      dish_id: dish.id,
      dish_name: dish.name,
      meal_date: today,
      meal_type: mealType,
      serving_label: `${servingSize}g`,
      calories: Math.round(dish.calories_value * multiplier),
      protein: Math.round(dish.protein_value * multiplier),
      fat: Math.round(dish.fat_value * multiplier),
      carbs: Math.round(dish.carbs_value * multiplier),
    };

    const { error } = await supabase.from("meal_logs").insert([newEntry]);
    if (error) {
      console.error("Error adding meal:", error.message);
      setSuccessText("Failed to add meal. Please try again.");
    } else {
      setMealLog(prev => [...prev, newEntry]);
      setSuccessText(`${dish.name} added as ${mealType}!`);
    }
    setShowSuccessModal(true);
  }, []);

  // Early return after all hooks
  if (isLoading || !profile)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-200 via-white to-green-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-green-700 font-medium">Loading SmartGenie...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 via-white to-green-200 flex items-center justify-center px-4 py-6 font-sans">
      <div className="bg-white w-[375px] h-[700px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-green-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-400 w-full h-[170px] rounded-t-3xl flex flex-col px-5 pt-10 relative">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              SmartGenie.
            </h1>
            <div
              className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-lg text-white text-sm cursor-pointer hover:bg-white/30 transition-all min-w-[110px] md:min-w-[90px]"
              onClick={() => navigate("/profile")}
            >
              <p className="text-[12px] mb-1">
                <strong>BMI:</strong> {profile.bmi}
              </p>
              <p className="font-semibold text-sm">Hi, {profile.full_name}!</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-3">
            {[
              { label: "Nutrition Protocol", viewName: "nutrition-protocol" },
              { label: "My Status", viewName: "my-status" },
              { label: "Suggested Dish", viewName: "suggested-dish" },
            ].map((tab) => (
              <button
                key={tab.viewName}
                className={`py-2 px-3 rounded-lg shadow text-[12px] font-semibold transition ${
                  view === tab.viewName
                    ? "bg-white text-green-600"
                    : "bg-green-100 text-green-600 hover:bg-green-200"
                }`}
                onClick={() => setView(tab.viewName)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* Main Content */}
        <div className="p-4 flex-1 space-y-5 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Nutrition Protocol */}
          {view === "nutrition-protocol" && (
            <div className="bg-white rounded-xl shadow-lg border border-green-100 p-5 space-y-4">
              <h2 className="text-lg font-bold text-green-700">
                Personalized Nutrition Protocol
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {/* Calories */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-center mb-2 text-green-700">
                    <FaFire className="text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Calories</p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#166534",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {dailyCalories} kcal/day
                  </p>
                </div>

                {/* Protein */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-center mb-2 text-green-700">
                    <FaDrumstickBite className="text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Protein</p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#166534",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {dailyProtein} g/day
                  </p>
                </div>

                {/* Fats */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-center mb-2 text-green-700">
                    <FaOilCan className="text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Fats</p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#166534",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {dailyFats} g/day
                  </p>
                </div>

                {/* Carbs */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-2xl text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-center mb-2 text-green-700">
                    <FaBreadSlice className="text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Carbs</p>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#166534",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {dailyCarbs} g/day
                  </p>
                </div>
              </div>

              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {nutritionAdvice.length
                    ? nutritionAdvice.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))
                    : "No advice available."}
                </ul>
              </div>
            </div>
          )}

          {/* My Status */}
          {view === "my-status" && (
            <div className="space-y-5">
              <p
                className="text-gray-700 font-sans"
                style={{ fontSize: "15px" }}
              >
                Goal: <strong>{profile.goal}</strong>
              </p>
              <div className="text-center text-black font-normal font-sans">
                {remainingTotals.calories > 0
                  ? `${remainingTotals.calories} kcal left of ${totalCalories} kcal`
                  : `Goal exceeded by ${Math.abs(
                      remainingTotals.calories
                    )} kcal`}
              </div>

              {/* Circular progress */}
              <svg className="w-36 h-36 mx-auto" viewBox="0 0 120 120">
                <circle
                  className="text-gray-200"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="60"
                  cy="60"
                />
                <circle
                  className="text-green-500"
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r={radius}
                  cx="60"
                  cy="60"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progressPercent / 100)}
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "center",
                  }}
                />
                <text
                  x="60"
                  y="65"
                  textAnchor="middle"
                  className="text-2xl font-bold fill-green-600"
                >
                  {progressPercent}%
                </text>
              </svg>

              {/* Nutrient bars */}
              <div className="space-y-4 mt-4">
                {[
                  {
                    label: "Protein",
                    consumed: netTotals.protein,
                    goal: totalProtein,
                    color: "from-blue-500 to-blue-600",
                    icon: FaDrumstickBite,
                  },
                  {
                    label: "Fats",
                    consumed: netTotals.fats,
                    goal: totalFats,
                    color: "from-yellow-400 to-yellow-500",
                    icon: FaOilCan,
                  },
                  {
                    label: "Carbs",
                    consumed: netTotals.carbs,
                    goal: totalCarbs,
                    color: "from-green-400 to-green-500",
                    icon: FaLeaf,
                  },
                ].map((nutrient) => {
                  const percent = nutrient.goal
                    ? Math.min(
                        100,
                        Math.round((nutrient.consumed / nutrient.goal) * 100)
                      )
                    : 0;

                  // Extract the primary color from the gradient for the icon
                  const iconBaseColor = nutrient.color
                    .split(" ")[0]
                    .replace("from-", "");

                  const IconComponent = nutrient.icon;

                  return (
                    <div
                      key={nutrient.label}
                      className="p-3 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {/* Label & Icon */}
                      <div className="flex justify-between items-center mb-2 font-sans text-sm">
                        <div className="flex items-center gap-2">
                          <IconComponent
                            className={`text-${iconBaseColor}-500`}
                            size={18}
                          />
                          <span className="text-gray-700 font-medium">
                            {nutrient.label}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-800">
                          {nutrient.consumed} / {nutrient.goal} g
                        </span>
                      </div>

                      {/* Gradient Progress Bar */}
                      <div className="w-full bg-gray-200 h-4 rounded-full overflow-hidden">
                        <div
                          className={`h-4 rounded-full bg-gradient-to-r ${nutrient.color} transition-all duration-700`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="w-full h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#374151" />
                    <YAxis stroke="#374151" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#374151" }} />
                    <Bar dataKey="calories" fill="#EF4444" name="Calories" />
                    <Bar dataKey="protein" fill="#3B82F6" name="Protein" />
                    <Bar dataKey="fats" fill="#FACC15" name="Fats" />
                    <Bar dataKey="carbs" fill="#22C55E" name="Carbs" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Suggested Dish */}
          {/* Suggested Dish */}
          {view === "suggested-dish" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-center gap-2">
                <FaUtensils className="text-green-600 text-xl" />
                <h2 className="text-lg font-bold text-green-700">
                  Suggested Dishes
                </h2>
              </div>

              {/* Search Bar */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search dish..."
                  className="flex-1 px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  onClick={() => {}}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Search
                </button>
              </div>

              {/* Suggested Dish List */}
              {(() => {
                if (filteredDishes.length === 0)
                  return (
                    <p className="text-gray-500 italic text-center">
                      No dishes found.
                    </p>
                  );

                return filteredDishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="bg-white rounded-2xl border border-green-100 shadow-md p-4 flex gap-4 items-center hover:shadow-lg transition-all duration-300"
                  >
                    {/* Dish Image */}
                    <div className="w-24 h-24 bg-gray-100 flex items-center justify-center overflow-hidden rounded-xl">
                      {dish.image_url ? (
                        <img
                          src={dish.image_url}
                          alt={dish.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                      )}
                    </div>

                    {/* Dish Info */}
                    <div className="flex-1 flex flex-col justify-between h-full">
                      <div>
                        <h3 className="font-semibold text-md text-gray-800">
                          {dish.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {dish.calories_value} kcal | {dish.protein_value}g
                          protein | {dish.fat_value}g fat | {dish.carbs_value}g
                          carbs
                        </p>
                      </div>

                      {/* Eat Button */}
                      <button
                        onClick={() => {
                          setSelectedDish(dish);
                          setShowMealModal(true);
                        }}
                        className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition self-start flex items-center gap-2 mt-2"
                      >
                        <FaUtensils className="text-white" /> Eat
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
        {showMealModal && selectedDish && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-80">
              <h3 className="text-lg font-bold text-green-700 mb-4">
                Add {selectedDish.name}
              </h3>

              {/* Meal Type */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meal Type
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full border border-green-300 rounded-lg p-2 mb-3 focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select...</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>

              {/* Serving Size Dropdown */}
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serving Size
              </label>
              <select
                value={servingSize || ""}
                onChange={(e) => setServingSize(parseInt(e.target.value))}
                className="w-full border border-green-300 rounded-lg p-2 mb-4 focus:ring-2 focus:ring-green-400"
              >
                <option value="">Select grams...</option>
                <option value={100}>100g</option>
                <option value={152}>152g</option>
                <option value={245}>245g</option>
              </select>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowMealModal(false)}
                  className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!mealType || !servingSize) {
                      setAlertMessage(
                        "Please select a meal type and serving size."
                      );
                      setShowAlertModal(true);
                      return;
                    }

                    // Calculate multiplier based on dish's standard serving
                    const multiplier =
                      servingSize / (selectedDish.standard_serving || 100);

                    await handleAddMeal(
                      selectedDish,
                      mealType,
                      multiplier,
                      servingSize
                    );

                    setShowMealModal(false);
                  }}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Add Meal
                </button>
                {showAlertModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-80 text-center">
                      <h2 className="text-lg font-semibold mb-4 text-gray-800">
                        Notice
                      </h2>
                      <p className="text-gray-600 mb-6">{alertMessage}</p>
                      <button
                        onClick={() => setShowAlertModal(false)}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {showDisclaimer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <h2 className="text-lg font-bold mb-2">Disclaimer</h2>
              <p className="mb-4">This is your disclaimer message.</p>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                OK
              </button>
            </div>
          </div>
        )}
        {showSuccessModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSuccessModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 w-[320px] animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2 text-green-700">
                Meal Log
              </h3>
              <p className="text-sm text-gray-700 mb-4">{successText}</p>
              <div className="flex justify-end"></div>
            </div>
          </div>
        )}
        <FooterNav />;
      </div>
    </div>
  );
});

export default PersonalDashboard;

