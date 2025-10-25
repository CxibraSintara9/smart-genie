import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import { FiArrowLeft, FiEdit } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";

export default function PersonalDashboard() {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/landing");
        return;
      }

      const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        navigate("/health-profile");
      } else {
        setProfile(data);
      }
    };

    fetchProfile();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) navigate("/landing", { replace: true });
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <p className="text-center text-lg text-green-700 font-medium animate-pulse">
          Loading profile...
        </p>
      </div>
    );
  }

  const displayLimitedList = (arr) => {
    if (!arr || arr.length === 0) return "None";
    if (arr.length === 1) return arr[0];
    return `${arr[0]} and others`;
  };

  const displayGoal = (goalString) => {
    if (!goalString) return "None";
    const goals = goalString.split(",").map((g) => g.trim());
    if (goals.length === 1) return goals[0];
    return `${goals[0]} and others`;
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-2">
      <span className="text-[14px] text-gray-600">{label}</span>
      <span className="font-semibold text-[14px] text-gray-800">{value}</span>
    </div>
  );

  const NotebookCard = ({ title, children }) => (
    <div className="m-3 p-5 bg-white rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
      {title && (
        <h3 className="text-base font-semibold mb-3 text-green-700 flex items-center gap-2">
          <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
          {title}
        </h3>
      )}
      <div className="divide-y divide-gray-200">{children}</div>
    </div>
  );

  const timeframe = profile.timeframe || 1;
  const caloriesInfo = `${profile.calorie_needs} kcal/day · ${
    profile.calorie_needs * timeframe
  } kcal / ${timeframe} day(s)`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-white w-[375px] h-[667px] rounded-3xl shadow-2xl overflow-hidden relative flex flex-col border border-green-100">
        {/* Header */}
        <div className="bg-green-600 w-full h-[60px] rounded-t-3xl flex items-center justify-between px-5 shadow-md">
          <button
            onClick={() => navigate("/personaldashboard")}
            className="text-white text-sm flex items-center gap-1 hover:opacity-80 transition"
          >
            <FiArrowLeft size={16} /> Back
          </button>

          <div className="text-white font-semibold text-sm tracking-wide">
            Profile
          </div>

          <button
            onClick={() => navigate("/edit-profile")}
            className="text-white text-sm flex items-center gap-1 hover:opacity-80 transition"
          >
            <FiEdit size={16} /> Edit
          </button>
        </div>

        {/* Profile Header Card */}
        <div className="flex flex-col items-center justify-center bg-gradient-to-r from-green-500 to-green-600 text-white py-6 relative">
          <FaUserCircle className="text-white text-6xl mb-2 drop-shadow-lg" />
          <h2 className="text-lg font-bold">{profile.full_name}</h2>
          <p className="text-sm text-green-100">
            {profile.gender} • {profile.age} years old
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 pb-20 bg-gradient-to-b from-white to-green-50 scrollbar-none">
          <style>
            {`
              /* Chrome, Safari, Edge, Opera */
              .scrollbar-none::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>

          <NotebookCard title="Personal Info">
            <InfoRow label="Height" value={`${profile.height_cm} cm`} />
            <InfoRow label="Weight" value={`${profile.weight_kg} kg`} />
            <InfoRow label="Birthday" value={profile.birthday} />
          </NotebookCard>

          <NotebookCard title="Health & Goals">
            <InfoRow label="BMI" value={profile.bmi} />
            <InfoRow label="Calories" value={caloriesInfo} />
            <InfoRow label="Activity Level" value={profile.activity_level} />
            <InfoRow label="Goal" value={displayGoal(profile.goal)} />
          </NotebookCard>

          <NotebookCard title="Lifestyle Info">
            <InfoRow label="Eating Style" value={profile.eating_style} />
            <InfoRow
              label="Allergens"
              value={displayLimitedList(profile.allergens)}
            />
            <InfoRow
              label="Health Conditions"
              value={displayLimitedList(profile.health_conditions)}
            />
          </NotebookCard>
        </div>

        {/* Footer */}
        <FooterNav />
      </div>
    </div>
  );
}
