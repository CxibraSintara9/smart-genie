import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import FooterNav from "../components/FooterNav";
import {
  FaRunning,
  FaBiking,
  FaSwimmer,
  FaDumbbell,
  FaWalking,
  FaBasketballBall,
  FaFutbol,
  FaHeartbeat,
  FaTrashAlt, 
  FaSearch,
} from "react-icons/fa";


export default function Workout() {
  const [workoutTypes, setWorkoutTypes] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [duration, setDuration] = useState("");
  const [userId, setUserId] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, message: "" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalWorkout, setModalWorkout] = useState(null);
  const [modalDuration, setModalDuration] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    workoutId: null,
  });

  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const iconMap = {
  "Running": <FaRunning className="text-green-600" />,
  "Cycling": <FaBiking className="text-green-600" />,
  "Swimming": <FaSwimmer className="text-green-600" />,
  "Strength Training": <FaDumbbell className="text-green-600" />,
  "Walking": <FaWalking className="text-green-600" />,
  "Basketball": <FaBasketballBall className="text-green-600" />,
  "Football": <FaFutbol className="text-green-600" />,
  "Cardio": <FaHeartbeat className="text-green-600" />,
};


  // Fetch current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return navigate("/login");
      setUserId(data.user.id);
    };
    getUser();
  }, [navigate]);

  // Fetch health profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("health_profiles")
        .select(
          "goal, gender, age, weight_kg, height_cm, activity_level, health_conditions"
        )
        .eq("user_id", userId)
        .single();
      if (!error) setProfile(data);
    };
    fetchProfile();
  }, [userId]);

  // Fetch workout types
  useEffect(() => {
    const fetchWorkoutTypes = async () => {
      const { data, error } = await supabase.from("workout_types").select("*");
      if (!error) setWorkoutTypes(data);
    };
    fetchWorkoutTypes();
  }, []);

  // Recommended workouts (goal + health conditions)
  useEffect(() => {
    if (!profile || !workoutTypes.length) return;

    const goalLower = profile.goal?.toLowerCase().trim();
    const userHealthConditionsLower = (profile.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );

    const matched = workoutTypes.filter((w) => {
      const suitableForGoal = w.suitable_for?.some(
        (g) => g.toLowerCase().trim() === goalLower
      );
      const unsafeLower = (w.unsuitable_for || []).map((hc) =>
        hc.toLowerCase().trim()
      );
      const safeForHealth = !unsafeLower.some((hc) =>
        userHealthConditionsLower.includes(hc)
      );
      return suitableForGoal && safeForHealth;
    });

    setRecommended(matched);
  }, [profile, workoutTypes]);

  // Fetch logged workouts (filter unsafe)
  const fetchWorkouts = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("workouts")
      .select(
        "id,duration,calories_burned,fat_burned,carbs_burned,created_at,workout_types(id,name,unsuitable_for)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const userHealthConditionsLower = (profile?.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );

    const safeWorkouts = (data || []).filter((w) => {
      const unsafeLower = (w.workout_types?.unsuitable_for || []).map((hc) =>
        hc.toLowerCase().trim()
      );
      return !unsafeLower.some((hc) => userHealthConditionsLower.includes(hc));
    });

    setWorkouts(safeWorkouts);
  };

  useEffect(() => {
    fetchWorkouts();
  }, [userId, profile]);

  // Search filter (health-aware)
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery) return workoutTypes;
    const userHealthConditionsLower = (profile?.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );
    return workoutTypes.filter((w) => {
      const unsafeLower = (w.unsuitable_for || []).map((hc) =>
        hc.toLowerCase().trim()
      );
      const safe = !unsafeLower.some((hc) =>
        userHealthConditionsLower.includes(hc)
      );
      return safe && w.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [workoutTypes, searchQuery, profile]);

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add workout
  const handleAddWorkout = async (e) => {
    e?.preventDefault();
    if (!selectedWorkout || !duration)
      return setModal({ show: true, message: "Please fill all fields." });

    const workoutType = workoutTypes.find((w) => w.id === selectedWorkout);
    const userHealthConditionsLower = (profile?.health_conditions || []).map(
      (hc) => hc.toLowerCase().trim()
    );
    const unsafeLower = (workoutType?.unsuitable_for || []).map((hc) =>
      hc.toLowerCase().trim()
    );

    if (unsafeLower.some((hc) => userHealthConditionsLower.includes(hc))) {
      return setModal({
        show: true,
        message:
          "This workout is not recommended for your health condition(s).",
      });
    }

    setLoading(true);
    const { error } = await supabase
      .from("workouts")
      .insert([
        { user_id: userId, workout_type_id: selectedWorkout, duration },
      ]);
    setLoading(false);

    if (error)
      setModal({
        show: true,
        message: "Error saving workout: " + error.message,
      });
    else {
      setModal({ show: true, message: "Workout logged successfully!" });
      setDuration("");
      setSelectedWorkout("");
      setSearchQuery("");
      fetchWorkouts();
    }
  };

  // Delete workout
  const handleDeleteWorkout = async (id) => {
    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error)
      setModal({
        show: true,
        message: "Error deleting workout: " + error.message,
      });
    else {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      setModal({ show: true, message: "Workout deleted successfully." });
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-t-2xl px-5 pt-6 pb-4 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              Workout Tracker
            </h1>
            <div
              className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-lg text-white text-sm cursor-pointer hover:bg-white/30 transition-all min-w-[110px] md:min-w-[90px]"
              onClick={() => navigate("/profile")}
            >
              <p className="text-[12px] mb-1">
                <strong>BMI:</strong> {profile?.bmi ?? "25.2"}
              </p>
              <p className="font-semibold text-sm">
                Hi, {profile?.full_name ?? "User"}!
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-white to-green-50">
          {/* Workout Form */}
          <div className="bg-white border border-green-100 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
            <form onSubmit={handleAddWorkout} className="space-y-4 relative">
              {/* Search Bar */}
              <div className="relative" ref={dropdownRef}>
                <label className="block mb-1 text-sm font-semibold text-green-700">
                  Workout
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search workout..."
                    className="w-full p-2 pl-9 border border-green-200 focus:ring-2 focus:ring-green-400 rounded-lg text-sm transition-all"
                  />
                </div>

                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute bg-white border border-green-100 rounded-lg shadow-md mt-1 max-h-48 overflow-y-auto w-full z-20">
                    <p className="px-3 pt-2 text-xs text-gray-500">
                      Recommended for {profile?.goal} {profile?.health_conditions}
                    </p>

                    {/* helper to handle selecting a workout item */}
                    {[
                      ...recommended.slice(0, 5).map(item => ({ ...item, _recommended: true })),
                      ...filteredWorkouts.slice(0, 5).map(item => ({ ...item, _recommended: false })),
                    ].map((w) => (
                      <div
                        key={w.id + (w._recommended ? "-r" : "-f")}
                        onClick={() => {
                          // fill the input and store the selected workout id
                          setSelectedWorkout(w.id);
                          setSearchQuery(w.name);
                          setShowDropdown(false);

                          // optional: blur the input if you attach an inputRef (improves mobile UX)
                          if (typeof inputRef !== "undefined" && inputRef?.current) {
                            inputRef.current.blur();
                          }
                        }}
                        className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm flex items-center gap-2 transition"
                      >
                        <span>{iconMap[w.name] || <FaDumbbell className="text-green-600" />}</span>
                        <span className="truncate">{w.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block mb-1 text-sm font-semibold text-green-700">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  className="w-full p-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 text-sm"
                  placeholder="e.g. 30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition font-semibold shadow-sm"
              >
                {loading ? "Saving..." : "Add Workout"}
              </button>

              {/* Recommended List */}
              {recommended.length > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  <p className="font-semibold text-green-700 mb-1">
                    Recommended for{" "}
                    {Array.isArray(profile?.goal)
                      ? profile.goal.length > 1
                        ? `${profile.goal[0]} and more`
                        : profile.goal[0]
                      : profile?.goal}{" "}
                    and{" "}
                    {Array.isArray(profile?.health_conditions)
                      ? profile.health_conditions.length > 1
                        ? `${profile.health_conditions[0]} and more`
                        : profile.health_conditions[0]
                      : profile?.health_conditions || "none"}
                    :
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {recommended.slice(0, 3).map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setModalWorkout(w);
                          setModalDuration("");
                          setShowAddModal(true);
                        }}
                        className="px-3 py-1 bg-green-100 border border-green-200 rounded-full text-green-700 text-xs flex items-center gap-1 hover:bg-green-200 transition"
                      >
                        <span>{iconMap[w.name] || <FaDumbbell className="text-green-600" />}</span>
                        <span className="truncate">{w.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-green-100 bg-white/90 backdrop-blur-sm p-3">
          <FooterNav />
        </div>

        {/* Modals */}
        {modal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm text-center">
              <p className="mb-4 text-gray-800 font-medium">{modal.message}</p>
              <button
                onClick={() => setModal({ show: false, message: "" })}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {confirmDelete.show && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget)
                setConfirmDelete({ show: false, workoutId: null });
            }}
          >
            <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm w-full text-center">
              <h2 className="text-lg font-semibold text-red-600 mb-3">
                Confirm Delete
              </h2>
              <p className="text-gray-600 mb-5">
                Are you sure you want to delete this workout?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() =>
                    setConfirmDelete({ show: false, workoutId: null })
                  }
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteWorkout(confirmDelete.workoutId);
                    setConfirmDelete({ show: false, workoutId: null });
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}
