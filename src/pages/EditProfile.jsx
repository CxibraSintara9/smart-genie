// import React, { useEffect, useState } from "react";
// import { supabase } from "../supabaseClient";
// import { useNavigate } from "react-router-dom";

// export default function EditProfile() {
//   const [profile, setProfile] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   const allergenOptions = [
//     "Beef",
//     "Pork",
//     "Chicken",
//     "Turkey",
//     "Fish",
//     "Shellfish",
//     "Shrimp",
//     "Crab",
//     "Milk",
//     "Cheese",
//     "Butter",
//     "Yogurt",
//   ];

//   const healthConditionOptions = [
//     "Diabetes",
//     "Hypertension",
//     "Heart Disease",
//     "Kidney Disease",
//   ];

//   const activityLevelOptions = [
//     "Sedentary",
//     "Lightly Active",
//     "Moderately Active",
//     "Very Active",
//   ];

//   const goalOptions = [
//     "Weight loss",
//     "Improve physical health",
//     "Boost energy",
//     "Managing stress",
//     "Optimized athletic performance",
//     "Eating a balanced diet",
//   ];

//   const eatingStyleOptions = ["Balanced", "Keto", "Low Carb", "High Protein"];

//   useEffect(() => {
//     const fetchProfile = async () => {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         navigate("/login");
//         return;
//       }

//       const { data, error } = await supabase
//         .from("health_profiles")
//         .select("*")
//         .eq("user_id", user.id)
//         .single();

//       if (error) console.error(error);
//       else setProfile(data);

//       setLoading(false);
//     };

//     fetchProfile();
//   }, [navigate]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setProfile((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleMultiSelect = (name, value) => {
//     setProfile((prev) => {
//       const current = prev[name] || [];
//       if (current.includes(value)) {
//         return { ...prev, [name]: current.filter((v) => v !== value) };
//       } else {
//         return { ...prev, [name]: [...current, value] };
//       }
//     });
//   };

//   const handleSave = async (e) => {
//     e.preventDefault();

//     const {
//       data: { user },
//     } = await supabase.auth.getUser();
//     if (!user) return;

//     // --- CALCULATE BMI, BMR, CALORIES & MACROS ---
//     const { gender, weight_kg, height_cm, age, activity_level, goal } = profile;

//     // BMI
//     let bmi = null;
//     if (weight_kg && height_cm) {
//       const heightM = height_cm / 100;
//       bmi = weight_kg / (heightM * heightM);
//     }

//     // BMR (Mifflin-St Jeor Equation)
//     let bmr = 0;
//     if (gender === "Male") {
//       bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
//     } else if (gender === "Female") {
//       bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
//     }

//     // Activity multipliers
//     let multiplier = 1.2;
//     if (activity_level === "Lightly Active") multiplier = 1.375;
//     if (activity_level === "Moderately Active") multiplier = 1.55;
//     if (activity_level === "Very Active") multiplier = 1.725;

//     let calories = bmr * multiplier;

//     // Adjust for goals
//     if (goal === "Weight loss") calories -= 500;
//     if (goal === "Optimized athletic performance") calories += 300;

//     if (calories < 1200) calories = 1200;

//     // Macros (example split: 25% protein, 25% fat, 50% carbs)
//     const protein = (calories * 0.25) / 4;
//     const fat = (calories * 0.25) / 9;
//     const carbs = (calories * 0.5) / 4;

//     const updatedProfile = {
//       ...profile,
//       bmi: bmi ? bmi.toFixed(1) : null,
//       calorie_needs: Math.round(calories),
//       protein_needed: Math.round(protein),
//       fats_needed: Math.round(fat),
//       carbs_needed: Math.round(carbs),
//     };

//     // --- UPDATE IN SUPABASE ---
//     const { error } = await supabase
//       .from("health_profiles")
//       .update(updatedProfile)
//       .eq("user_id", user.id);

//     if (error) {
//       console.error("Update failed:", error);
//       alert("Something went wrong while updating profile");
//     } else {
//       navigate("/personaldashboard");
//     }
//   };

//   if (loading) return <p className="text-center mt-10">Loading...</p>;
//   if (!profile) return <p className="text-center mt-10">No profile found</p>;

//   const TagSelector = ({ options, selected, name }) => (
//     <div className="flex flex-wrap gap-2 mt-1">
//       {options.map((opt) => (
//         <button
//           type="button"
//           key={opt}
//           onClick={() => handleMultiSelect(name, opt)}
//           className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
//             selected?.includes(opt)
//               ? "bg-blue-600 text-white border-blue-600"
//               : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
//           }`}
//         >
//           {opt}
//         </button>
//       ))}
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex justify-center items-center px-4 py-12">
//       <form
//         onSubmit={handleSave}
//         className="bg-white w-[375px] rounded-2xl shadow-2xl overflow-auto max-h-[90vh] flex flex-col"
//       >
//         {/* HEADER */}
//         <div className="bg-blue-600 w-full h-[50px] rounded-t-2xl border border-b-0 flex items-center px-5 p-5">
//           <div className="flex space-x-4 text-white text-sm">
//             <button
//               type="button"
//               onClick={() => navigate("/personaldashboard")}
//             >
//               cancel
//             </button>
//           </div>
//           <div className="flex-grow flex justify-center text-white text-sm">
//             <div className="profile font-semibold text-sms">Edit Profile</div>
//           </div>
//           <div className="text-sm text-white">
//             <button type="submit">save</button>
//           </div>
//         </div>

//         {/* FORM CONTENT */}
//         <div className="p-6 space-y-4 flex-1 overflow-auto">
//           {/* Full Name */}
//           <div>
//             <label className="block text-sm font-medium">Full Name</label>
//             <input
//               type="text"
//               name="full_name"
//               value={profile.full_name || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             />
//           </div>

//           {/* Age */}
//           <div>
//             <label className="block text-sm font-medium">Age</label>
//             <input
//               type="number"
//               name="age"
//               value={profile.age || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             />
//           </div>

//           {/* Gender */}
//           <div>
//             <label className="block text-sm font-medium">Gender</label>
//             <select
//               name="gender"
//               value={profile.gender || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             >
//               <option value="">Select</option>
//               <option value="Male">Male</option>
//               <option value="Female">Female</option>
//             </select>
//           </div>

//           {/* Height & Weight */}
//           <div className="flex gap-4">
//             <div className="flex-1">
//               <label className="block text-sm font-medium">Height (cm)</label>
//               <input
//                 type="number"
//                 name="height_cm"
//                 value={profile.height_cm || ""}
//                 onChange={handleChange}
//                 className="w-full border p-2 rounded-lg mt-1"
//               />
//             </div>
//             <div className="flex-1">
//               <label className="block text-sm font-medium">Weight (kg)</label>
//               <input
//                 type="number"
//                 name="weight_kg"
//                 value={profile.weight_kg || ""}
//                 onChange={handleChange}
//                 className="w-full border p-2 rounded-lg mt-1"
//               />
//             </div>
//           </div>

//           {/* Birthday */}
//           <div>
//             <label className="block text-sm font-medium">Birthday</label>
//             <input
//               type="date"
//               name="birthday"
//               value={profile.birthday || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium">TimeFrame</label>
//             <input
//               type="text"
//               name="timeframe"
//               value={profile.timeframe || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             />
//           </div>

//           {/* Activity Level */}
//           <div>
//             <label className="block text-sm font-medium">Activity Level</label>
//             <select
//               name="activity_level"
//               value={profile.activity_level || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             >
//               <option value="">Select</option>
//               {activityLevelOptions.map((opt) => (
//                 <option key={opt} value={opt}>
//                   {opt}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Goal */}
//           <div>
//             <label className="block text-sm font-medium">Goal</label>
//             <select
//               name="goal"
//               value={profile.goal || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             >
//               <option value="">Select</option>
//               {goalOptions.map((opt) => (
//                 <option key={opt} value={opt}>
//                   {opt}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Eating Style */}
//           <div>
//             <label className="block text-sm font-medium">Eating Style</label>
//             <select
//               name="eating_style"
//               value={profile.eating_style || ""}
//               onChange={handleChange}
//               className="w-full border p-2 rounded-lg mt-1"
//             >
//               <option value="">Select</option>
//               {eatingStyleOptions.map((opt) => (
//                 <option key={opt} value={opt}>
//                   {opt}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Allergens */}
//           <div>
//             <label className="block text-sm font-medium mb-1">Allergens</label>
//             <TagSelector
//               options={allergenOptions}
//               selected={profile.allergens || []}
//               name="allergens"
//             />
//           </div>

//           {/* Health Conditions */}
//           <div>
//             <label className="block text-sm font-medium mb-1">
//               Health Conditions
//             </label>
//             <TagSelector
//               options={healthConditionOptions}
//               selected={profile.health_conditions || []}
//               name="health_conditions"
//             />
//           </div>

//           {/* BMI Preview (optional) */}
//           {profile.weight_kg && profile.height_cm && (
//             <div className="mt-4 p-3 border rounded-lg bg-gray-50">
//               <p className="text-sm font-medium">
//                 Current BMI:{" "}
//                 <span className="font-bold">
//                   {(
//                     profile.weight_kg / Math.pow(profile.height_cm / 100, 2)
//                   ).toFixed(1)}
//                 </span>
//               </p>
//             </div>
//           )}
//         </div>
//       </form>
//     </div>
//   );
// }

// ===================================================================================================================================

import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";

export default function EditProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const allergenOptions = [
    "Beef",
    "Pork",
    "Chicken",
    "Turkey",
    "Fish",
    "Shellfish",
    "Shrimp",
    "Crab",
    "Squid",
    "Lobster",
    "Milk",
    "Cheese",
    "Butter",
    "Yogurt",
  ];

  const healthConditionOptions = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Kidney Disease",
  ];

  const activityLevelOptions = [
    "Sedentary",
    "Lightly Active",
    "Moderately Active",
    "Very Active",
  ];

  const goalOptions = [
    "Weight loss",
    "Improve physical health",
    "Boost energy",
    "Managing stress",
    "Optimized athletic performance",
    "Eating a balanced diet",
  ];

  const eatingStyleOptions = ["Balanced", "Keto", "Low Carb", "High Protein"];

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) console.error(error);
      else setProfile(data);

      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMultiSelect = (name, value) => {
    setProfile((prev) => {
      const current = prev[name] || [];
      if (current.includes(value)) {
        return { ...prev, [name]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [name]: [...current, value] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // --- CALCULATE BMI, BMR, CALORIES & MACROS ---
    const { gender, weight_kg, height_cm, age, activity_level, goal } = profile;

    let bmi = null;
    if (weight_kg && height_cm) {
      const heightM = height_cm / 100;
      bmi = weight_kg / (heightM * heightM);
    }

    let bmr = 0;
    if (gender === "Male") {
      bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
    } else if (gender === "Female") {
      bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
    }

    let multiplier = 1.2;
    if (activity_level === "Lightly Active") multiplier = 1.375;
    if (activity_level === "Moderately Active") multiplier = 1.55;
    if (activity_level === "Very Active") multiplier = 1.725;

    let calories = bmr * multiplier;
    if (goal === "Weight loss") calories -= 500;
    if (goal === "Optimized athletic performance") calories += 300;
    if (calories < 1200) calories = 1200;

    const protein = (calories * 0.25) / 4;
    const fat = (calories * 0.25) / 9;
    const carbs = (calories * 0.5) / 4;

    const updatedProfile = {
      ...profile,
      bmi: bmi ? bmi.toFixed(1) : null,
      calorie_needs: Math.round(calories),
      protein_needed: Math.round(protein),
      fats_needed: Math.round(fat),
      carbs_needed: Math.round(carbs),
    };

    const { error } = await supabase
      .from("health_profiles")
      .update(updatedProfile)
      .eq("user_id", user.id);

    if (error) {
      console.error("Update failed:", error);
      alert("Something went wrong while updating profile");
    } else {
      navigate("/personaldashboard");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <p className="text-green-700 text-lg animate-pulse">
          Loading profile...
        </p>
      </div>
    );

  if (!profile)
    return (
      <div className="text-center mt-10 text-red-500">No profile found</div>
    );

  const TagSelector = ({ options, selected, name }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => handleMultiSelect(name, opt)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            selected?.includes(opt)
              ? "bg-green-600 text-white border-green-600 shadow-sm"
              : "bg-white text-gray-700 border-gray-300 hover:bg-green-50"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex justify-center items-center px-4 py-8">
      <form
        onSubmit={handleSave}
        className="bg-white w-[375px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-green-100"
      >
        {/* HEADER */}
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

        {/* FORM CONTENT */}
        <div className="p-6 space-y-5 overflow-y-auto hide-scrollbar bg-gradient-to-b from-white to-green-50">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={profile.full_name || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={profile.age || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Gender
            </label>
            <select
              name="gender"
              value={profile.gender || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Height & Weight */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700">
                Height (cm)
              </label>
              <input
                type="number"
                name="height_cm"
                value={profile.height_cm || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight_kg"
                value={profile.weight_kg || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
              />
            </div>
          </div>

          {/* Birthday */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Birthday
            </label>
            <input
              type="date"
              name="birthday"
              value={profile.birthday || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            />
          </div>

          {/* Time Frame */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Timeframe (days)
            </label>
            <input
              type="text"
              name="timeframe"
              value={profile.timeframe || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            />
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Activity Level
            </label>
            <select
              name="activity_level"
              value={profile.activity_level || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            >
              <option value="">Select</option>
              {activityLevelOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Goal */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Goal
            </label>
            <select
              name="goal"
              value={profile.goal || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            >
              <option value="">Select</option>
              {goalOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Eating Style */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Eating Style
            </label>
            <select
              name="eating_style"
              value={profile.eating_style || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 outline-none transition"
            >
              <option value="">Select</option>
              {eatingStyleOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Allergens */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Allergens
            </label>
            <TagSelector
              options={allergenOptions}
              selected={profile.allergens || []}
              name="allergens"
            />
          </div>

          {/* Health Conditions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Health Conditions
            </label>
            <TagSelector
              options={healthConditionOptions}
              selected={profile.health_conditions || []}
              name="health_conditions"
            />
          </div>

          {/* BMI Preview */}
          {profile.weight_kg && profile.height_cm && (
            <div className="mt-5 p-3 border rounded-xl bg-green-50">
              <p className="text-sm font-medium text-green-700">
                Current BMI:{" "}
                <span className="font-bold text-green-800">
                  {(
                    profile.weight_kg / Math.pow(profile.height_cm / 100, 2)
                  ).toFixed(1)}
                </span>
              </p>
            </div>
          )}
        </div>
      </form>

      {/* Hide scrollbar CSS */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
