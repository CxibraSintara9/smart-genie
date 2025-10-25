import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function NutritionProtocol() {
  const [profile, setProfile] = useState(null);
  const [nutritionAdvice, setNutritionAdvice] = useState([]);
  const navigate = useNavigate();

  function getNutritionAdvice(user) {
    const advice = [];
    const heightM = user.height_cm / 100;
    const bmi =
      user.bmi ??
      (user.weight_kg && user.height_cm
        ? user.weight_kg / (heightM * heightM)
        : null);

    if (bmi) {
      if (bmi >= 30) {
        advice.push(
          "Focus on a calorie-controlled diet with balanced macros to promote weight loss."
        );
        advice.push(
          "Increase intake of vegetables, fruits, and lean proteins."
        );
        advice.push("Limit processed foods and sugary drinks.");
      } else if (bmi >= 25) {
        advice.push("Maintain a balanced diet to prevent further weight gain.");
        advice.push(
          "Include whole grains, lean proteins, and plenty of fiber."
        );
      } else {
        advice.push("Maintain your healthy weight with a balanced diet.");
      }
    }

    if (user.blood_sugar_mg_dl) {
      if (user.blood_sugar_mg_dl > 200) {
        advice.push(
          "Limit intake of simple sugars and high glycemic index foods."
        );
        advice.push(
          "Prefer complex carbohydrates like whole grains and vegetables."
        );
        advice.push(
          "Monitor carbohydrate portions and spread intake through the day."
        );
      } else if (user.blood_sugar_mg_dl >= 140) {
        advice.push("Reduce sugary snacks and beverages.");
        advice.push("Increase fiber-rich foods to help stabilize blood sugar.");
      }
    }

    if (user.cholesterol_mg_dl) {
      if (user.cholesterol_mg_dl > 240) {
        advice.push(
          "Limit saturated and trans fats found in fried and processed foods."
        );
        advice.push(
          "Increase omega-3 fatty acids intake (e.g., fish, flaxseed)."
        );
        advice.push("Add more soluble fiber (e.g., oats, beans) to your diet.");
      } else if (user.cholesterol_mg_dl > 200) {
        advice.push("Moderate intake of high-fat animal products.");
      }
    }

    if (user.age > 50) {
      advice.push(
        "Ensure adequate calcium and vitamin D intake for bone health."
      );
    }

    if (user.allergens?.length > 0) {
      advice.push(
        `Avoid foods that trigger your allergies: ${user.allergens.join(", ")}.`
      );
    }

    if (user.goal) {
      if (user.goal.toLowerCase().includes("weight loss")) {
        advice.push(
          "Focus on portion control and increase physical activity to achieve weight loss."
        );
      } else if (user.goal.toLowerCase().includes("muscle")) {
        advice.push(
          "Increase protein intake and maintain a balanced diet to support muscle gain."
        );
      } else if (user.goal.toLowerCase().includes("maintenance")) {
        advice.push(
          "Maintain a balanced diet with consistent calorie intake aligned with your activity level."
        );
      }
    }

    if (user.activity_level) {
      advice.push(
        `Considering your activity level (${user.activity_level}), ensure you meet your energy and nutrient needs accordingly.`
      );
    }

    if (user.eating_style) {
      advice.push(
        `Your eating style (${user.eating_style}) should be factored into your meal planning.`
      );
    }

    return advice;
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        navigate("/health-profile");
      } else {
        setProfile(data);
        setNutritionAdvice(getNutritionAdvice(data));
      }
    };

    fetchProfile();
  }, [navigate]);

  if (!profile) {
    return (
      <p className="text-center mt-10 text-lg">Loading nutrition protocol...</p>
    );
  }

  const heightM = profile.height_cm / 100;
  const bmi =
    profile.bmi ??
    (profile.weight_kg && profile.height_cm
      ? (profile.weight_kg / (heightM * heightM)).toFixed(1)
      : "N/A");
  const caloriesNeeded = profile.calorie_needs ?? "N/A";
  const fats_needed = profile.fats_needed ?? "N/A";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-700">
        Nutrition Protocol
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {/* BMI Card */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-300 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">BMI</h2>
          <p className="text-4xl font-bold text-green-700">{bmi}</p>
        </div>

        {/* Calories Needed Card */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-300 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Calories Needed</h2>
          <p className="text-4xl font-bold text-green-700">
            {caloriesNeeded} kcal/day
          </p>
        </div>

        {/* Fat Intake Card */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-300 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Fat Intake</h2>
          <p className="text-4xl font-bold text-green-700">
            {fats_needed} g/day
          </p>
        </div>
      </div>

      <section className="bg-green-50 p-6 rounded-xl border border-green-200 shadow">
        <h2 className="text-2xl font-semibold mb-4 text-green-800">
          Personalized Nutrition Advice
        </h2>
        <ul className="list-disc list-inside space-y-2 text-green-900">
          {nutritionAdvice.length > 0 ? (
            nutritionAdvice.map((item, idx) => <li key={idx}>{item}</li>)
          ) : (
            <li>No specific recommendations at this time.</li>
          )}
        </ul>
      </section>

      <button
        onClick={() => navigate("/dashboard")}
        className="mt-8 bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
