import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";

export default function EditProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- Constant options memoized ---

  const allergenOptions = useMemo(
    () => [
      // Legumes / Soy
      { name: "Peanuts", category: "Legume" },
      { name: "Tree nuts", category: "Legume" },
      { name: "Soy", category: "Legume" },
      { name: "Soy sauce", category: "Legume" },
      { name: "Miso", category: "Legume" },
      { name: "Tofu", category: "Legume" },

      // Meat
      { name: "Chicken", category: "Meat" },
      { name: "Beef", category: "Meat" },
      { name: "Pork", category: "Meat" },
      { name: "Liver", category: "Meat" },

      // Seafood
      { name: "Fish", category: "Seafood" },
      { name: "Tilapia", category: "Seafood" },
      { name: "Bangus", category: "Seafood" },
      { name: "Shellfish", category: "Seafood" },
      { name: "Shrimp", category: "Seafood" },
      { name: "Prawns", category: "Seafood" },
      { name: "Mussels", category: "Seafood" },
      { name: "Squid", category: "Seafood" },

      // Eggs
      { name: "Egg", category: "Egg" },

      // Grains / Gluten
      { name: "Wheat", category: "Grain" },
      { name: "Gluten", category: "Grain" },
      { name: "Noodles", category: "Grain" },
      { name: "Wrappers", category: "Grain" },
      { name: "Breadcrumbs", category: "Grain" },
      { name: "Flour", category: "Grain" },

      // Dairy
      { name: "Dairy", category: "Dairy" },
      { name: "Milk", category: "Dairy" },
      { name: "Condensed milk", category: "Dairy" },
      { name: "Cream", category: "Dairy" },
      { name: "Butter", category: "Dairy" },

      // Others
      { name: "Coconut", category: "Other" },
      { name: "Corn", category: "Other" },
    ],
    []
  );

  const healthConditionOptions = useMemo(
    () => [
      "Diabetes",
      "High Blood Pressure",
      "Heart Disease",
      "Kidney Disease",
    ],
    []
  );
  const activityLevelOptions = useMemo(
    () => ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"],
    []
  );
  const goalOptions = useMemo(
    () => [
      "Weight loss",
      "Improve physical health",
      "Boost energy",
      "Managing stress",
      "Optimized athletic performance",
      "Eating a balanced diet",
    ],
    []
  );
  const eatingStyleOptions = useMemo(
    () => ["Balanced", "Keto", "Low Carb", "High Protein"],
    []
  );

  // --- Fetch profile ---
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) console.error(error);
      else
        setProfile({
          ...data,
          health_conditions: Array.isArray(data?.health_conditions)
            ? data.health_conditions
            : data?.health_conditions?.split(",") || [],
          allergens: Array.isArray(data?.allergens)
            ? data.allergens
            : data?.allergens?.split(",") || [],
        });
      setLoading(false);
    })();
  }, [navigate]);

  // --- Generic field handlers ---
  const handleChange = (e) =>
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleMultiSelect = (name, value) =>
    setProfile((prev) => {
      const arr = prev[name] || [];
      return {
        ...prev,
        [name]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });

  // --- Memoized BMI ---
  const bmi = useMemo(() => {
    if (!profile?.weight_kg || !profile?.height_cm) return null;
    const h = profile.height_cm / 100;
    return (profile.weight_kg / (h * h)).toFixed(1);
  }, [profile?.weight_kg, profile?.height_cm]);

  const handleSave = async (e) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // BMR + calories
    const { gender, weight_kg, height_cm, age, activity_level, goal } = profile;
    let bmr =
      gender === "Male"
        ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
    const multiplier =
      {
        Sedentary: 1.2,
        "Lightly Active": 1.375,
        "Moderately Active": 1.55,
        "Very Active": 1.725,
      }[activity_level] || 1.2;
    let calories = bmr * multiplier;
    if (goal === "Weight loss") calories -= 500;
    if (goal === "Optimized athletic performance") calories += 300;
    calories = Math.max(1200, calories);

    const updatedProfile = {
      full_name: profile.full_name,
      age: profile.age,
      gender,
      height_cm,
      weight_kg,
      birthday: profile.birthday,
      timeframe: profile.timeframe,
      activity_level,
      goal,
      eating_style: profile.eating_style,
      health_conditions: profile.health_conditions,
      allergens: profile.allergens,
      bmi,
      calorie_needs: Math.round(calories),
      protein_needed: Math.round((calories * 0.25) / 4),
      fats_needed: Math.round((calories * 0.25) / 9),
      carbs_needed: Math.round((calories * 0.5) / 4),
    };

    const { error } = await supabase
      .from("health_profiles")
      .update(updatedProfile)
      .eq("user_id", user.id);
    if (error) console.error("Update failed:", error);
    else navigate("/personaldashboard");
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-green-50">
        <p className="text-green-700 animate-pulse">Loading profile...</p>
      </div>
    );
  if (!profile)
    return (
      <div className="text-center mt-10 text-red-500">No profile found</div>
    );

  // --- Reusable components ---
  const InputField = ({ label, name, type = "text", value }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={handleChange}
        className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
      />
    </div>
  );

  const SelectField = ({ label, name, value, options }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <select
        name={name}
        value={value || ""}
        onChange={handleChange}
        className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
  const TagSelector = ({ options, selected, name, handleMultiSelect }) => {
    // Group options by category (strings go to "Other")
    const groupedOptions = options.reduce((acc, opt) => {
      const isObject = typeof opt === "object";
      const category = isObject ? opt.category : "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(opt);
      return acc;
    }, {});

    return (
      <div className="space-y-3">
        {Object.keys(groupedOptions).map((category) => (
          <div key={category}>
            <p className="text-sm font-semibold text-gray-500 mb-1">
              {category}
            </p>
            <div className="flex flex-wrap gap-2">
              {groupedOptions[category].map((opt) => {
                const value = typeof opt === "object" ? opt.name : opt;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleMultiSelect(name, value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selected.includes(value)
                        ? "bg-green-600 text-white border-green-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-green-50"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex justify-center items-center px-4 py-8">
      <form
        onSubmit={handleSave}
        className="bg-white w-[375px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-green-100"
      >
        <div className="bg-green-600 h-[60px] flex items-center justify-between px-5 rounded-t-3xl shadow-md">
          <button
            type="button"
            onClick={() => navigate("/personaldashboard")}
            className="flex items-center gap-1 text-white hover:opacity-80 transition"
          >
            <FiArrowLeft />
          </button>
          <div className="flex items-center gap-2 text-white font-semibold">
            Edit Profile
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 text-white hover:opacity-80 transition"
          >
            <FiSave /> Save
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto hide-scrollbar bg-gradient-to-b from-white to-green-50">
          <InputField
            label="Full Name"
            name="full_name"
            value={profile.full_name}
          />
          <InputField
            label="Age"
            name="age"
            type="number"
            value={profile.age}
          />
          <SelectField
            label="Gender"
            name="gender"
            value={profile.gender}
            options={["Male", "Female"]}
          />
          <div className="flex gap-4">
            <InputField
              label="Height (cm)"
              name="height_cm"
              type="number"
              value={profile.height_cm}
            />
            <InputField
              label="Weight (kg)"
              name="weight_kg"
              type="number"
              value={profile.weight_kg}
            />
          </div>
          <InputField
            label="Birthday"
            name="birthday"
            type="date"
            value={profile.birthday}
          />
          <InputField
            label="Timeframe (days)"
            name="timeframe"
            value={profile.timeframe}
          />
          <SelectField
            label="Activity Level"
            name="activity_level"
            value={profile.activity_level}
            options={activityLevelOptions}
          />
          <SelectField
            label="Goal"
            name="goal"
            value={profile.goal}
            options={goalOptions}
          />
          <SelectField
            label="Eating Style"
            name="eating_style"
            value={profile.eating_style}
            options={eatingStyleOptions}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Allergens
            </label>
            <TagSelector
              options={allergenOptions} // objects
              selected={profile.allergens} // ["Chicken", "Milk", ...]
              name="allergens"
              handleMultiSelect={handleMultiSelect}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Health Conditions
            </label>
            <TagSelector
              options={healthConditionOptions} // strings
              selected={profile.health_conditions}
              name="health_conditions"
              handleMultiSelect={handleMultiSelect}
            />
          </div>

          {bmi && (
            <div className="mt-5 p-3 border rounded-xl bg-green-50">
              <p className="text-sm font-medium text-green-700">
                Current BMI:{" "}
                <span className="font-bold text-green-800">{bmi}</span>
              </p>
            </div>
          )}
        </div>
      </form>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
