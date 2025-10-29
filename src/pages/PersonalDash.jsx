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
import { BsCircleFill } from "react-icons/bs";

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
  const [servingSize, setServingSize] = useState(100);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMealType, setSelectedMealType] = useState("");
  const [allergenOptions, setAllergenOptions] = useState([]);
  const [showDishPrompt, setShowDishPrompt] = useState(false);

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

  // Encourage user to explore Suggested Dishes (show at most once per day)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceShow = params.get("showDishesPrompt") === "1";

    const lastShown = localStorage.getItem("suggestedPromptLastShown");
    const now = new Date();

    let shouldShow = forceShow;
    if (!shouldShow) {
      if (!lastShown) {
        shouldShow = true;
      } else {
        const last = new Date(lastShown);
        const diffDays = (now - last) / (1000 * 60 * 60 * 24);
        if (diffDays >= 1) shouldShow = true;
      }
    }

    if (shouldShow) {
      setShowDishPrompt(true);
      localStorage.setItem("suggestedPromptLastShown", now.toISOString());
    }
  }, []);

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
        const [profileResult, mealResult, workoutResult, dishesResult] =
          await Promise.all([
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
            supabase.from("dishes").select(`
        id, name, description, default_serving, meal_type, goal,
        eating_style, health_condition, steps, image_url,
        ingredients_dish_id_fkey(
          id, name, amount, unit, calories, protein, fats, carbs, is_rice,allergen_id
        )
      `),
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

        // Handle dishes and filter by health conditions
        if (dishesResult.error) {
          console.error("Dish fetch error:", dishesResult.error.message);
        } else {
          // ❗ Don't pre-filter by health conditions here — keep all dishes
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

  useEffect(() => {
    const fetchAllergens = async () => {
      const { data, error } = await supabase.from("allergens").select("*");
      if (!error && data) setAllergenOptions(data);
    };
    fetchAllergens();
  }, []);

  const userAllergenIds = (profile?.allergens || [])
    .map((name) => {
      const match = allergenOptions.find(
        (a) => a.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      return match?.id;
    })
    .filter(Boolean); // only valid IDs
  // only valid IDs

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
    if (!profile) return {};

    const heightCm = Number(profile.height_cm) || 0;
    const weightKg = Number(profile.weight_kg) || 0;
    const age = Number(profile.age) || 25;
    const gender = profile.gender || "female";
    const activity = profile.activity_level || "moderate";

    // ✅ Parse goals (works for array or comma-separated string)
    let goals = [];
    if (Array.isArray(profile.goals)) {
      goals = profile.goals.map((g) => g.toLowerCase());
    } else if (typeof profile.goals === "string") {
      goals = profile.goals.split(",").map((g) => g.trim().toLowerCase());
    }

    if (!heightCm || !weightKg) return {};

    // --- Step 1: BMR (Mifflin-St Jeor) ---
    const bmr =
      gender === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    // --- Step 2: Activity Multiplier ---
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      "very active": 1.9,
    };
    const tdee = bmr * (activityMultipliers[activity] || 1.55);

    // --- Step 3: Adjust Calories Based on Goals ---
    let calorieGoal = tdee;

    if (goals.includes("weight loss")) calorieGoal -= 500;
    if (goals.includes("boost energy")) calorieGoal += 150;
    if (goals.includes("managing stress")) calorieGoal += 100;
    if (goals.includes("optimized athletic performance")) calorieGoal += 300;

    // “Improve physical health” & “Eating a balanced diet” = baseline (no change)
    calorieGoal = Math.round(calorieGoal);

    // --- Step 4: Macro Ratios Based on Goals ---
    let proteinPerc = 0.25,
      carbPerc = 0.5,
      fatPerc = 0.25;

    if (goals.includes("weight loss")) {
      proteinPerc = 0.35;
      carbPerc = 0.4;
      fatPerc = 0.25;
    }

    if (
      goals.includes("boost energy") ||
      goals.includes("optimized athletic performance")
    ) {
      proteinPerc = 0.3;
      carbPerc = 0.55;
      fatPerc = 0.15;
    }

    if (goals.includes("managing stress")) {
      proteinPerc = 0.25;
      carbPerc = 0.45;
      fatPerc = 0.3;
    }

    if (
      goals.includes("eating a balanced diet") ||
      goals.includes("improve physical health")
    ) {
      proteinPerc = 0.25;
      carbPerc = 0.5;
      fatPerc = 0.25;
    }

    // --- Step 5: Convert to Grams ---
    const protein = Math.round((calorieGoal * proteinPerc) / 4);
    const carbs = Math.round((calorieGoal * carbPerc) / 4);
    const fats = Math.round((calorieGoal * fatPerc) / 9);

    return { calories: calorieGoal, protein, carbs, fats };
  }, [profile]);

  useEffect(() => {
    const saveCalculatedMacros = async () => {
      if (!profile || !derived.calories) return;

      // Avoid redundant writes
      if (
        profile.calorie_needs === derived.calories &&
        profile.protein_needed === derived.protein &&
        profile.fats_needed === derived.fats &&
        profile.carbs_needed === derived.carbs
      )
        return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("health_profiles")
        .update({
          calorie_needs: derived.calories,
          protein_needed: derived.protein,
          fats_needed: derived.fats,
          carbs_needed: derived.carbs,
        })
        .eq("user_id", user.id);

      if (error) console.error("❌ Error saving macros:", error.message);
      else console.log("✅ Macros synced to database");
    };

    saveCalculatedMacros();
  }, [derived, profile]);

  // -------------------- Totals (Memoized for Performance) --------------------
  const nutritionTotals = useMemo(() => {
    if (!profile) return {};

    // ✅ Helper to safely parse numbers
    const parseSafe = (val, fallback = 0) => {
      const num = parseFloat(val);
      return isFinite(num) && !isNaN(num) ? num : fallback;
    };

    // ✅ Use derived values as fallback
    const dailyCalories = parseSafe(profile.calorie_needs, derived.calories);
    const dailyFats = parseSafe(profile.fats_needed, derived.fats);
    const dailyCarbs = parseSafe(profile.carbs_needed, derived.carbs);
    const dailyProtein = parseSafe(profile.protein_needed, derived.protein);
    const timeframeDays = parseSafe(profile.timeframe, 1);

    // ✅ Calculate totals for the timeframe
    const totalCalories = dailyCalories * timeframeDays;
    const totalFats = dailyFats * timeframeDays;
    const totalProtein = dailyProtein * timeframeDays;
    const totalCarbs = dailyCarbs * timeframeDays;

    // ✅ Compute consumed totals (from meals)
    const consumedTotals = mealLog.reduce(
      (acc, meal) => ({
        calories: acc.calories + parseSafe(meal.calories),
        protein: acc.protein + parseSafe(meal.protein),
        fats: acc.fats + parseSafe(meal.fat),
        carbs: acc.carbs + parseSafe(meal.carbs),
      }),
      { calories: 0, protein: 0, fats: 0, carbs: 0 }
    );

    // ✅ Compute burned totals (from workouts)
    const burnedTotals = workouts.reduce(
      (acc, workout) => ({
        calories: acc.calories + parseSafe(workout.calories_burned),
        fats: acc.fats + parseSafe(workout.fat_burned),
        carbs: acc.carbs + parseSafe(workout.carbs_burned),
      }),
      { calories: 0, fats: 0, carbs: 0 }
    );

    // ✅ Combine totals
    const netTotals = {
      calories: consumedTotals.calories + burnedTotals.calories,
      protein: consumedTotals.protein,
      fats: consumedTotals.fats + burnedTotals.fats,
      carbs: consumedTotals.carbs + burnedTotals.carbs,
    };

    // ✅ Remaining (goal - used)
    const remainingTotals = {
      calories: totalCalories - netTotals.calories,
      protein: totalProtein - netTotals.protein,
      fats: totalFats - netTotals.fats,
      carbs: totalCarbs - netTotals.carbs,
    };

    // ✅ Progress %
    const progressPercent = totalCalories
      ? Math.min(100, Math.round((netTotals.calories / totalCalories) * 100))
      : 0;

    // ✅ Round all final numbers to prevent weird decimals (like 174.1700000002)
    const roundAll = (obj) =>
      Object.fromEntries(
        Object.entries(obj).map(([key, val]) => [key, Math.round(val)])
      );

    return {
      dailyCalories: Math.round(dailyCalories),
      dailyFats: Math.round(dailyFats),
      dailyCarbs: Math.round(dailyCarbs),
      dailyProtein: Math.round(dailyProtein),

      totalCalories: Math.round(totalCalories),
      totalFats: Math.round(totalFats),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),

      consumedTotals: roundAll(consumedTotals),
      netTotals: roundAll(netTotals),
      remainingTotals: roundAll(remainingTotals),
      progressPercent,
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
    progressPercent = 0,
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
    const actualEndDate =
      daysDiff > maxDays
        ? new Date(startDate.getTime() + maxDays * 24 * 60 * 60 * 1000)
        : endDate;

    const days = [];
    for (
      let d = new Date(startDate);
      d <= actualEndDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = formatDate(new Date(d));
      const mealsOfDay = mealsByDate[dateStr] || [];

      // Pre-calculate totals to avoid multiple reduce calls
      let calories = 0,
        protein = 0,
        fats = 0,
        carbs = 0;
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
    if (!profile || !dishes?.length || !allergenOptions?.length) return [];

    return dishes.map((dish) => {
      let recommended = true;

      // --- Allergens ---
      if (userAllergenIds.length && dish.ingredients_dish_id_fkey?.length) {
        const ingredientAllergenIds = dish.ingredients_dish_id_fkey
          .map((ing) => ing.allergen)
          .filter(Boolean);

        if (userAllergenIds.some((id) => ingredientAllergenIds.includes(id))) {
          recommended = false;
        }
      }

      // --- Health conditions ---
      const userHealthConditions = Array.isArray(profile.health_conditions)
        ? profile.health_conditions
            .map((h) => h.toLowerCase().trim())
            .filter(Boolean)
        : profile.health_conditions
        ? [profile.health_conditions.toLowerCase().trim()]
        : [];

      if (userHealthConditions.length && dish.health_condition) {
        const dishConditions = Array.isArray(dish.health_condition)
          ? dish.health_condition
              .map((c) => c?.toLowerCase().trim())
              .filter(Boolean)
          : dish.health_condition?.toLowerCase().trim()
          ? [dish.health_condition.toLowerCase().trim()]
          : [];

        if (dishConditions.some((c) => userHealthConditions.includes(c))) {
          recommended = false;
        }
      }

      // --- Goal ---
      const userGoal = profile.goal?.toLowerCase().trim() || "";
      if (userGoal && dish.goal) {
        const dishGoals = Array.isArray(dish.goal)
          ? dish.goal.map((g) => g.toLowerCase().trim()).filter(Boolean)
          : [dish.goal.toLowerCase().trim()];

        if (!dishGoals.some((g) => g.includes(userGoal))) recommended = false;
      }

      // --- Eating style ---
      const userEatingStyle = profile.eating_style?.toLowerCase().trim() || "";
      if (userEatingStyle && dish.eating_style) {
        const dishStyles = Array.isArray(dish.eating_style)
          ? dish.eating_style.map((s) => s.toLowerCase().trim()).filter(Boolean)
          : [dish.eating_style.toLowerCase().trim()];

        if (!dishStyles.some((s) => s.includes(userEatingStyle)))
          recommended = false;
      }

      return { ...dish, recommended };
    });
  }, [profile, dishes, allergenOptions]);

  // 2️⃣ Apply search filter
  const filteredDishes = useMemo(() => {
    if (!searchTerm?.trim()) return suggestedDishes;

    const query = searchTerm.toLowerCase().trim();
    if (query.length < 2) return suggestedDishes;

    return suggestedDishes.filter((dish) => {
      const dishName = dish.name?.toLowerCase() || "";
      const dishDescription = dish.description?.toLowerCase() || "";
      return dishName.includes(query) || dishDescription.includes(query);
    });
  }, [suggestedDishes, searchTerm]);

  const handleAddMeal = useCallback(
    async (dish, mealType, multiplier, servingSize) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSuccessText("You must be logged in to add a meal.");
        setShowSuccessModal(true);
        return;
      }

      // 🧠 Check if dish.id exists before proceeding
      if (!dish?.id) {
        console.error("Dish ID is missing:", dish);
        setSuccessText("Cannot add meal: Missing dish ID.");
        setShowSuccessModal(true);
        return;
      }

      const today = new Date().toISOString().split("T")[0]; // standardized date format

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
        setMealLog((prev) => [...prev, newEntry]);
        setSuccessText(`${dish.name} added as ${mealType}!`);
      }

      setShowSuccessModal(true);
    },
    []
  );


  // Early return after all hooks
  if (isLoading || !profile)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-200 via-white to-green-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-green-700 font-medium">
            Loading SmartGenie...
          </p>
        </div>
      </div>
    );

  const handleEatDish = async (dish) => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        alert("Please log in to save this meal.");
        navigate("/login");
        return;
      }

      // Log meal to Supabase
      const { error } = await supabase.from("meal_logs").insert([
      {
        user_id: user.id,
        dish_id: dish.id,  // Add this
        dish_name: dish.name,
        meal_type: dish.meal_type || "Lunch",
        calories: dish.calories || 0,
        protein: dish.protein || 0,
        fat: dish.fat || 0,
        carbs: dish.carbs || 0,
        serving_label: dish.serving_label || "1 serving",
        meal_date: new Date().toISOString().split("T")[0],
      },
    ]);

      if (error) {
        console.error("Error saving meal:", error);
        alert("Failed to log your meal.");
      } else {
        alert(`✅ ${dish.name} added to your Meal Log!`);
        // Optional: Navigate automatically to journal page
        // navigate("/journal");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };


  return (
    // <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6 ">
    //   <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6 ">
      <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative pb-[20px]">
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
          <div className="flex justify-center space-x-3 mt-2">
            {[
              { label: "Nutrition Protocol", viewName: "nutrition-protocol" },
              { label: "Dishes", viewName: "suggested-dish" },
              { label: "My Status", viewName: "my-status" },
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
                    {derived.calories} kcal/day
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
            </div>
          )}

          {/* Suggested Dish */}
          {view === "suggested-dish" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-center gap-2">
                <FaUtensils className="text-green-600 text-xl" />
                <h2 className="text-lg font-bold text-green-700">
                  Suggested Dishes for You
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
              <div className="space-y-6">
                {filteredDishes.length === 0 ? (
                  <p className="text-gray-500 italic text-center">
                    No dishes found.
                  </p>
                ) : (
                  // Sort recommended dishes first
                  [...filteredDishes]
                    .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0))
                    .map((dish) => (
                      <div
                        key={dish.id}
                        className={`bg-white rounded-2xl border shadow-md p-4 flex gap-4 items-center hover:shadow-lg transition-all duration-300 ${
                          dish.recommended ? "border-green-100" : "border-red-300"
                        }`}
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
                            <p className="text-sm text-gray-500 mt-1 flex items-center">
                              <BsCircleFill className="mr-1 text-yellow-400" size={10} />
                              {dish.eating_style}
                            </p>
                            {!dish.recommended && (
                              <p className="text-red-500 text-sm mt-1">Not recommended</p>
                            )}

                            {dish.positiveMatch && (
                              <p className="text-green-600 text-xs mt-1">
                                Suitable for your condition
                              </p>
                            )}
                          </div>

                          {/* Eat Button */}
                          <button
                            onClick={() => handleEatDish(dish)}
                            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition self-start flex items-center gap-2 mt-2"
                          >
                            <FaUtensils className="text-white" /> Eat
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

        </div>
        {/* Meal Modal */}
        {showMealModal && selectedDish && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-3xl overflow-auto max-h-[90vh] relative shadow-lg">
              <button
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-xl"
                onClick={() => {
                  setSelectedDish(null);
                  setShowMealModal(false);
                }}
              >
                ✕
              </button>

              <h2 className="text-2xl font-bold mb-4">{selectedDish.name}</h2>

              {/* 🔽 Meal Type & Serving Size */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <label className="block font-medium text-gray-700 mb-1">
                    Meal Type
                  </label>
                  <select
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Meal Type</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block font-medium text-gray-700 mb-1">
                    Serving Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Enter servings (e.g. 1)"
                  />
                </div>
              </div>

              <div className="flex gap-6 mb-6">
                <div className="flex-1">
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Meal Type:</span>{" "}
                    {selectedDish.meal_type || "N/A"}
                  </p>
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Goal:</span>{" "}
                    {selectedDish.goal || "—"}
                  </p>
                  <p className="text-gray-600 mb-2">
                    <span className="font-medium">Dietary Style:</span>{" "}
                    {selectedDish.eating_style || "—"}
                  </p>
                </div>

                <div className="flex-1">
                  {selectedDish.description && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Description
                      </h3>
                      <p className="text-gray-600">
                        {selectedDish.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 🍽 Ingredients Table */}
              {selectedDish.ingredients_dish_id_fkey?.length > 0 && (
                <div className="bg-gray-50 rounded-lg overflow-hidden mb-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-3">Ingredient</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-right p-3">Calories</th>
                        <th className="text-right p-3">Protein</th>
                        <th className="text-right p-3">Carbs</th>
                        <th className="text-right p-3">Fats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDish.ingredients_dish_id_fkey.map((ing) => (
                        <tr key={ing.id} className="border-t border-gray-200">
                          <td className="p-3">{ing.name}</td>
                          <td className="text-right p-3">
                            {ing.amount} {ing.unit || "g"}
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ing.calories || 0)}
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ing.protein || 0)}g
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ing.carbs || 0)}g
                          </td>
                          <td className="text-right p-3">
                            {Math.round(ing.fats || 0)}g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 🧑‍🍳 Preparation Steps */}
              {selectedDish.steps?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">
                    Preparation Steps
                  </h3>
                  <ol className="list-decimal ml-6 space-y-2">
                    {selectedDish.steps.map((step, idx) => (
                      <li key={idx} className="text-gray-700">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    console.log("Add meal:", {
                      name: selectedDish.name,
                      mealType: selectedMealType,
                      servings: servingSize,
                    });
                    setShowMealModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Add to Meal Log
                </button>
                <button
                  onClick={() => {
                    setSelectedDish(null);
                    setShowMealModal(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
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
        {showDishPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] px-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center relative">
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowDishPrompt(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FaUtensils className="text-green-600" />
              </div>
              <h3 className="text-lg font-extrabold text-green-700 mb-2">
                Hungry for ideas?
              </h3>
              <p className="text-sm text-gray-600 mb-5">
                Discover dishes picked for your goals and eating style. Tap to find
                your perfect bite.
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  onClick={() => {
                    setView("suggested-dish");
                    setShowDishPrompt(false);
                  }}
                >
                  Show me dishes
                </button>
                <button
                  className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                  onClick={() => setShowDishPrompt(false)}
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}
        <FooterNav />;
      </div>
    </div>
  );
});

export default PersonalDashboard;
