import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { supabase } from "../supabaseClient";
import { motion } from "framer-motion";
import { FaMars, FaVenus } from "react-icons/fa";

export default function CreateProfile() {
  const navigate = useNavigate();

  // --- Core UI & Flow ---
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Profile Data ---
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // --- Physical Info ---
  const [heightUnit, setHeightUnit] = useState("cm");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [weight, setWeight] = useState("");

  // --- Activity & Goals ---
  const [activityLevel, setActivityLevel] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [goalDays, setGoalDays] = useState(30);
  const [goals, setGoals] = useState([]);
  const [goalOptions] = useState([
    "Weight loss",
    "Improve physical health",
    "Boost energy",
    "Managing stress",
    "Optimized athletic performance",
    "Eating a balanced diet",
  ]);

  // --- Eating Preferences ---
  const [eatingStyles] = useState([
    {
      name: "Balanced",
      description: "Carbs, protein, and fats in moderation.",
      breakdown: "Protein: 25%, Fat: 30%, Carbs: 45%",
    },
    {
      name: "Keto",
      description: "High fat, very low carb.",
      breakdown: "Protein: 20%, Fat: 75%, Carbs: 5%",
    },
    {
      name: "Low Carb",
      description: "Less carbs, more protein and fats.",
      breakdown: "Protein: 30%, Fat: 45%, Carbs: 25%",
    },
    {
      name: "High Protein",
      description: "Boost muscle with more protein.",
      breakdown: "Protein: 40%, Fat: 30%, Carbs: 30%",
    },
  ]);
  const [selectedStyle, setSelectedStyle] = useState("");

  // --- Allergens ---
  const [allergenCategories] = useState([
    { name: "Meat", items: ["Beef", "Pork", "Chicken", "Turkey"] },
    {
      name: "Seafood",
      items: ["Fish", "Shellfish", "Shrimp", "Crab", "Squid", "Lobster"],
    },
    { name: "Dairy", items: ["Milk", "Cheese", "Butter", "Yogurt"] },
  ]);
  const [selectedAllergens, setSelectedAllergens] = useState([]);

  // --- Health Conditions ---
  const [healthOptions] = useState([
    "Diabetes",
    "High blood pressure",
    "Heart disease",
    "Kidney Disease",
  ]);
  const [healthConditions, setHealthConditions] = useState([]);

  // --- Calculated Health Data ---
  const [age, setAge] = useState(null);
  const [bmi, setBmi] = useState(null);
  const [calorieNeeds, setCalorieNeeds] = useState(null);
  const [proteinNeeded, setProteinNeeded] = useState(null);
  const [fatsNeeded, setFatsNeeded] = useState(null);
  const [carbsNeeded, setCarbsNeeded] = useState(null);

  // --- Activity Options ---
  const [activityOptions] = useState([
    "Sedentary",
    "Lightly active",
    "Moderately active",
    "Very active",
  ]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const years = Array.from(
    { length: 100 },
    (_, i) => `${new Date().getFullYear() - i}`
  );

  // --- Toggle Functions ---
  const toggleItem = (item, array, setArray) => {
    if (array.includes(item)) setArray(array.filter((i) => i !== item));
    else setArray([...array, item]);
  };
  const toggleAllergen = (item) =>
    toggleItem(item, selectedAllergens, setSelectedAllergens);

  const selectAllInCategory = (categoryName) => {
    const category = allergenCategories.find((c) => c.name === categoryName);
    if (!category) return;
    const allSelected = category.items.every((i) =>
      selectedAllergens.includes(i)
    );
    if (allSelected)
      setSelectedAllergens((prev) =>
        prev.filter((i) => !category.items.includes(i))
      );
    else
      setSelectedAllergens((prev) => [
        ...new Set([...prev, ...category.items]),
      ]);
  };

  

  // ----------------- Health Calculations -----------------
  
  const calculateAge = (year, month, day) => {
    if (!year || !month || !day) return null;
    const birthDate = new Date(
      parseInt(year),
      months.indexOf(month),
      parseInt(day)
    );
    const today = new Date();
    if (birthDate > today) return null;
    let ageCalc = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageCalc--;
    return ageCalc >= 15 ? ageCalc : null;
  };

  const getHeightInCm = () =>
    heightUnit === "cm"
      ? parseFloat(heightCm) || 0
      : (parseFloat(heightFt) || 0) * 30.48 +
        (parseFloat(heightIn) || 0) * 2.54;
  const getWeightInKg = () =>
    weightUnit === "kg"
      ? parseFloat(weight) || 0
      : (parseFloat(weight) || 0) / 2.20462;

  const calculateBMR = (weightKg, heightCm, age, gender) =>
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const getActivityMultiplier = (level) =>
    ({
      Sedentary: 1.2,
      "Lightly active": 1.375,
      "Moderately active": 1.55,
      "Very active": 1.725,
    }[level] || 1.2);

  const adjustMacros = (goalsList, baseCalories) => {
    let proteinPerc = 0.25,
      fatPerc = 0.3,
      carbPerc = 0.45,
      calories = baseCalories;
    goalsList.forEach((goal) => {
      switch (goal) {
        case "Weight loss":
          calories *= 0.9;
          proteinPerc += 0.05;
          fatPerc -= 0.05;
          break;
        case "Muscle gain":
          calories *= 1.1;
          proteinPerc += 0.05;
          carbPerc += 0.05;
          break;
        case "Boost energy":
          carbPerc += 0.05;
          fatPerc -= 0.05;
          break;
        case "Managing stress":
          fatPerc += 0.05;
          carbPerc -= 0.05;
          break;
        case "Improve physical health":
          fatPerc += 0.05;
          carbPerc -= 0.05;
          break;
        case "Eating a balanced diet":
          proteinPerc = 0.25;
          fatPerc = 0.3;
          carbPerc = 0.45;
          break;
        default:
          break;
      }
    });
    const total = proteinPerc + fatPerc + carbPerc;
    proteinPerc /= total;
    fatPerc /= total;
    carbPerc /= total;
    return {
      calories: Math.round(calories),
      protein: Math.round((calories * proteinPerc) / 4),
      fat: Math.round((calories * fatPerc) / 9),
      carbs: Math.round((calories * carbPerc) / 4),
    };
  };

  // ----------------- Fetch User -----------------
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUser(null);
          setLoading(false);
          return;
        }
        setUser(user);
        const { data: profile, error } = await supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) console.error(error.message);
        else if (profile) {
          navigate("/personaldashboard", { replace: true });
          return;
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  // ----------------- Compute Health Metrics -----------------
  useEffect(() => {
    const userAge = calculateAge(birthYear, birthMonth, birthDay);
    const heightCmValue = getHeightInCm();
    const weightKgValue = getWeightInKg();

    if (!userAge || heightCmValue <= 0 || weightKgValue <= 0) {
      setAge(null);
      setBmi(null);
      setCalorieNeeds(null);
      setProteinNeeded(null);
      setFatsNeeded(null);
      setCarbsNeeded(null);
      return;
    }
    setAge(userAge);
    const bmiValue = +(weightKgValue / (heightCmValue / 100) ** 2).toFixed(2);
    setBmi(bmiValue);

    const bmr = calculateBMR(weightKgValue, heightCmValue, userAge, gender);
    const tdee = bmr * getActivityMultiplier(activityLevel);
    const macros = adjustMacros(goals, tdee);

    setCalorieNeeds(macros.calories);
    setProteinNeeded(macros.protein);
    setFatsNeeded(macros.fat);
    setCarbsNeeded(macros.carbs);
  }, [
    birthYear,
    birthMonth,
    birthDay,
    heightCm,
    heightFt,
    heightIn,
    heightUnit,
    weight,
    weightUnit,
    gender,
    activityLevel,
    goals,
  ]);

  // ----------------- Step Validation -----------------
  const isStepValid = () => {
    switch (step) {
      case 1:
        return fullName.trim() !== "";
      case 2:
        return gender !== "";
      case 3: {
        if (!birthDate) return false;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age >= 18; // ✅ Only allow 18+
      }
      case 8:
        return activityLevel !== "";
      case 9:
        return heightUnit === "cm"
          ? heightCm.trim() !== ""
          : heightFt.trim() !== "" && heightIn.trim() !== "";
      case 10:
        return weight.trim() !== "";
      case 11:
        return mealsPerDay !== "";
      case 12:
        return goalDays !== "";
      default:
        return true;
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate(-1);
  };

  const handleContinue = async () => {
    if (!isStepValid()) {
      if (step === 3) {
        alert("You must be at least 18 years old to continue.");
      }
      return;
    }

    if (step < 12) {
      setStep(step + 1);
      return;
    }

    // ✅ Final data submission to Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    const birthday =
      birthDate ||
      (birthYear && birthMonth && birthDay
        ? `${birthYear}-${String(months.indexOf(birthMonth) + 1).padStart(
            2,
            "0"
          )}-${String(birthDay).padStart(2, "0")}`
        : null);

    const { data, error } = await supabase.from("health_profiles").insert([
      {
        user_id: user.id,
        full_name: fullName,
        birthday,
        gender,
        height_cm: getHeightInCm(),
        weight_kg: getWeightInKg(),
        activity_level: activityLevel,
        goal: goals.join(", "),
        eating_style: selectedStyle,
        meals_per_day: mealsPerDay,
        allergens: selectedAllergens,
        health_conditions: healthConditions,
        age,
        bmi,
        calorie_needs: calorieNeeds,
        protein_needed: proteinNeeded,
        fats_needed: fatsNeeded,
        carbs_needed: carbsNeeded,
        timeframe: goalDays,
      },
    ]);

    if (error) {
      console.error("❌ Error inserting profile:", error.message);
    } else {
      navigate("/personaldashboard");
    }
  };

  if (loading)
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{
          background:
            "linear-gradient(to bottom right, #ECFDF5,#ECFDF5,#D1FAE5)",
        }}
      >
        <div className="border-4 border-gray-200 border-t-emerald-600 rounded-full w-12 h-12 animate-spin"></div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200"
        >
          Checking Profile
        </motion.div>
      </div>
    );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(to bottom right, #ECFDF5, #ECFDF5, #D1FAE5)",
      }}
    >
      <div className="bg-white w-[375px] min-h-[667px] rounded-2xl shadow-2xl pt-5 px-4 pb-6 relative flex flex-col">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 text-emerald-600"
        >
          <FiArrowLeft size={24} />
        </button>

        <p className="text-sm text-gray-500 text-center mb-2">
          Step {step} of 10
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={step}
          className="mt-2 flex flex-col items-center flex-grow gap-4 w-full"
        >
          {/* Step 1: Name */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-center sans-serif">
                Hey there! What should we call you?
              </h2>
              <h4>What name would like to us to call you?</h4>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pt-20 border-b-2 border-gray-300 focus:border-emerald-500 w-full text-center text-lg outline-none transition duration-200"
                placeholder="Enter your name"
              />
            </>
          )}

          {/* Step 2: Gender */}
          {step === 2 && (
            <div className="text-center">
              {/* Heading */}
              <br />
              <h2 className="text-2xl font-bold text-center sans-serif">
                What is your biological sex?
              </h2>
              <p className="mt-2 text-gray-600 text-sm max-w-sm mx-auto">
                Knowing your biological sex allows us to personalize your health
                and calorie recommendations.
              </p>

              {/* Buttons */}
              <div className="flex flex-col items-center gap-4 mt-8">
                {[
                  {
                    label: "Male",
                    icon: <FaMars className="text-blue-500 text-xl" />,
                  },
                  {
                    label: "Female",
                    icon: <FaVenus className="text-pink-500 text-xl" />,
                  },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setGender(option.label)}
                    className={`flex items-center justify-center gap-3 w-[220px] py-3 rounded-xl text-lg font-semibold transition-all duration-200 ${
                      gender === option.label
                        ? "bg-emerald-100 text-emerald-700 shadow-md border-2 border-emerald-300"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-emerald-50"
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Birthday */}
          {step === 3 && (
            <div className="animate-fadeIn flex flex-col items-center">
              {/* Title */}
              <h2 className="text-2xl font-extrabold text-green-700 text-center">
                When is your birthday?
              </h2>
              <p className="mt-2 text-gray-600 text-sm max-w-sm text-center">
                Your age helps us fine-tune your plan to match your metabolism.
              </p>

              <br />

              {/* Input Card */}
              <div className="w-full max-w-xs text-center">
                <label
                  htmlFor="birthday"
                  className="block text-sm font-semibold text-green-600 mb-3"
                >
                  Select your birth date
                </label>

                <input
                  type="date"
                  id="birthday"
                  value={birthDate || ""}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-green-300 text-gray-700 
                            focus:outline-none focus:ring-2 focus:ring-green-400 
                            transition duration-200 cursor-pointer"
                />

                {/* Age Preview */}
                {birthDate && (() => {
                  const birth = new Date(birthDate);
                  const today = new Date();
                  let age = today.getFullYear() - birth.getFullYear();
                  const m = today.getMonth() - birth.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                    age--;
                  }

                  return (
                    <p className="mt-4 text-sm text-gray-600">
                      You are{" "}
                      <span className={`font-semibold ${age < 18 ? "text-red-500" : "text-green-600"}`}>
                        {age}
                      </span>{" "}
                      years old.
                      {age < 18 && (
                        <span className="block text-red-500 mt-1 font-medium">
                          You must be at least 18 years old to continue.
                        </span>
                      )}
                    </p>
                  );
                })()}
              </div>
            </div>
          )}


          {/* Step 4: Goal */}
          {step === 4 && (
            <>
              <h2 className="text-xl font-bold text-center">
                What are you hoping to accomplish with your meals?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {goalOptions.map((g) => (
                  <div
                    key={g}
                    onClick={() => toggleItem(g, goals, setGoals)}
                    className={`p-4 rounded-xl cursor-pointer border ${
                      goals.includes(g)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    {g}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 5: Eating style */}
          {step === 5 && (
            <>
              <h2 className="text-xl font-bold text-center">
                How would you describe your eating style?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {eatingStyles.map((style) => (
                  <div
                    key={style.name}
                    onClick={() => setSelectedStyle(style.name)}
                    className={`p-4 rounded-xl cursor-pointer border ${
                      selectedStyle === style.name
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    <h3 className="font-semibold">{style.name}</h3>
                    <p className="text-xs">{style.description}</p>
                    <p className="text-xs">{style.breakdown}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 6: Allergens */}
          {step === 6 && (
            <div className="text-center font-sans ">
              {/* Title */}
              <h2 className="text-2xl font-bold text-emerald-700">
                Let us know your allergens
              </h2>
              <p className="mt-2 text-gray-600 text-sm max-w-md mx-auto">
                Select any foods you are allergic to so we can tailor your
                experience.
              </p>

              {/* Allergens List */}
              <div className="flex flex-col gap-6 w-full max-h-[350px] overflow-y-auto mt-6 pr-2 scrollbar-hide">
                {allergenCategories.map((cat) => (
                  <div
                    key={cat.name}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
                  >
                    {/* Category Header */}
                    <div
                      className="flex justify-between items-center cursor-pointer mb-3"
                      onClick={() => selectAllInCategory(cat.name)}
                    >
                      <h3 className="font-semibold text-lg text-gray-800">
                        {cat.name}
                      </h3>
                      <span className="text-emerald-600 text-sm font-medium hover:underline">
                        {cat.items.every((i) => selectedAllergens.includes(i))
                          ? "Deselect all"
                          : "Select all"}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="grid grid-cols-2 gap-3">
                      {cat.items.map((item) => (
                        <label
                          key={item}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium shadow-sm transition-all duration-200 cursor-pointer ${
                            selectedAllergens.includes(item)
                              ? "bg-emerald-100 border-emerald-300 text-emerald-700 shadow-md"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAllergens.includes(item)}
                            onChange={() => toggleAllergen(item)}
                            className="accent-emerald-600 w-4 h-4"
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Health conditions */}
          {step === 7 && (
            <>
              <h2 className="text-xl font-bold text-center">
                Do you have any health conditions?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {healthOptions.map((cond) => (
                  <div
                    key={cond}
                    onClick={() =>
                      toggleItem(cond, healthConditions, setHealthConditions)
                    }
                    className={`p-4 rounded-xl cursor-pointer border ${
                      healthConditions.includes(cond)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    {cond}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 8: Activity */}
          {step === 8 && (
            <>
              <h2 className="text-xl font-bold text-center">
                How active are you?
              </h2>
              <div className="flex flex-col gap-2 w-full">
                {activityOptions.map((lvl) => (
                  <div
                    key={lvl}
                    onClick={() => setActivityLevel(lvl)}
                    className={`p-4 rounded-xl cursor-pointer border ${
                      activityLevel === lvl
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    {lvl}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 9: Height */}
          {step === 9 && (
            <>
              <h2 className="text-xl font-bold text-center">
                What's your height?
              </h2>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => setHeightUnit("cm")}
                  className={`px-4 py-2 rounded-full border ${
                    heightUnit === "cm"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  cm
                </button>
                <button
                  onClick={() => setHeightUnit("ft")}
                  className={`px-4 py-2 rounded-full border ${
                    heightUnit === "ft"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  ft/in
                </button>
              </div>
              {heightUnit === "cm" ? (
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g., 170"
                  className="border-b-2 w-full text-center text-lg outline-none pt-20 mt-4"
                />
              ) : (
                <div className="flex gap-2 justify-center mt-4">
                  <input
                    type="number"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    placeholder="ft"
                    className="w-20 border-b-2 text-center text-lg outline-none"
                  />
                  <input
                    type="number"
                    value={heightIn}
                    onChange={(e) => setHeightIn(e.target.value)}
                    placeholder="in"
                    className="w-20 border-b-2 text-center text-lg outline-none"
                  />
                </div>
              )}
            </>
          )}

          {/* Step 10: Weight */}
          {step === 10 && (
            <>
              <h2 className="text-xl font-bold text-center">
                What's your weight?
              </h2>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => setWeightUnit("kg")}
                  className={`px-4 py-2 rounded-full border ${
                    weightUnit === "kg"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  kg
                </button>
                <button
                  onClick={() => setWeightUnit("lbs")}
                  className={`px-4 py-2 rounded-full border ${
                    weightUnit === "lbs"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white border-gray-300 hover:bg-emerald-100"
                  }`}
                >
                  lbs
                </button>
              </div>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={`e.g., ${weightUnit === "kg" ? "65" : "143"}`}
                className="border-b-2 w-full text-center text-lg outline-none pt-20 mt-4"
              />
            </>
          )}
          {step === 11 && (
            <>
              <h2 className="text-xl font-bold text-center text-gray-800">
                How many meals do you eat per day?
              </h2>
              <p className="text-gray-600 text-sm text-center mb-4">
                This helps us plan your daily nutrition.
              </p>
              <div className="flex justify-center gap-4">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setMealsPerDay(num)}
                    className={`px-6 py-3 rounded-xl text-lg font-medium border ${
                      mealsPerDay === num
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white border-gray-200 hover:bg-emerald-100"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 12 && (
            <>
              <h2 className="text-xl font-bold text-center text-gray-800">
                How many days for your goal?
              </h2>
              <p className="text-gray-600 text-sm text-center mb-4">
                Enter your desired timeframe.
              </p>
              <div className="flex items-center justify-center gap-4">
                <label className="font-medium">Timeframe (days):</label>
                <input
                  type="number"
                  min={1}
                  value={goalDays}
                  onChange={(e) => setGoalDays(Number(e.target.value))}
                  className="border rounded-lg px-2 py-1 w-20"
                />
              </div>
            </>
          )}
        </motion.div>

        <div className="mt-6">
          <button
            onClick={handleContinue}
            disabled={!isStepValid()}
            className={`mt-6 w-full py-3 rounded-xl font-semibold transition ${
              isStepValid()
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {step < 12 ? "Continue" : "Finish"}
          </button>
        </div>
      </div>
    </div>
  );
}
