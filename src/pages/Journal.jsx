import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiTrash2 } from "react-icons/fi";
import { FaTrashAlt } from "react-icons/fa";
import FooterNav from "../components/FooterNav";

const getLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
};

const getWeekDays = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return [...Array(7)].map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

// Optional emoji mapping for workouts
const emojiMap = {
  Cardio: "🏃",
  Strength: "🏋️",
  Yoga: "🧘",
  Default: "🏋️",
};

export default function Journal() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mealLog, setMealLog] = useState([]);
  const [workoutLog, setWorkoutLog] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [mealTypeFilter, setMealTypeFilter] = useState("");
  const ITEMS_PER_PAGE = 6;
  const [logPage, setLogPage] = useState(0);

  // ✅ Fetch profile + meals + workouts with workout type names
  const fetchData = useCallback(async () => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return navigate("/login");

    try {
      const [profileRes, mealRes, workoutRes] = await Promise.all([
        supabase
          .from("health_profiles")
          .select("calorie_needs, protein_needed, fats_needed, carbs_needed")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("meal_logs")
          .select(
            "id, meal_type, calories, protein, fat, carbs, meal_date, dish_name, serving_label"
          )
          .eq("user_id", user.id)
          .order("meal_date", { ascending: true }),
        supabase
          .from("workouts")
          .select(
            `
            id,
            duration,
            calories_burned,
            fat_burned,
            carbs_burned,
            created_at,
            workout_types!inner(name)
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

      setProfile(profileRes.data ?? null);
      setMealLog(mealRes.data ?? []);
      setWorkoutLog(workoutRes.data ?? []);
    } catch (err) {
      console.error("Data fetch failed:", err);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Filter logs per selected day
  const filteredMealLogs = useMemo(() => {
    const dayStr = getLocalDateString(selectedDay);
    return mealLog.filter((m) => {
      const mealDateStr = getLocalDateString(m.meal_date);
      return (
        mealDateStr === dayStr &&
        (!mealTypeFilter || m.meal_type === mealTypeFilter)
      );
    });
  }, [mealLog, selectedDay, mealTypeFilter]);

  const filteredWorkoutLogs = useMemo(() => {
    const dayStr = getLocalDateString(selectedDay);
    return workoutLog.filter(
      (w) => getLocalDateString(w.created_at) === dayStr
    );
  }, [workoutLog, selectedDay]);

  // ✅ Totals
  const totalsMeals = useMemo(
    () =>
      filteredMealLogs.reduce(
        (a, m) => ({
          calories: a.calories + (m.calories || 0),
          protein: a.protein + (m.protein || 0),
          fat: a.fat + (m.fat || 0),
          carbs: a.carbs + (m.carbs || 0),
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [filteredMealLogs]
  );

  const totalsWorkout = useMemo(
    () =>
      filteredWorkoutLogs.reduce(
        (a, w) => ({
          calories: a.calories + (w.calories_burned || 0),
          fat: a.fat + (w.fat_burned || 0),
          carbs: a.carbs + (w.carbs_burned || 0),
          duration: a.duration + (w.duration || 0),
        }),
        { calories: 0, fat: 0, carbs: 0, duration: 0 }
      ),
    [filteredWorkoutLogs]
  );

  // ✅ Delete functions
  const handleDeleteMeal = async (id) => {
    const { error } = await supabase.from("meal_logs").delete().eq("id", id);
    if (!error) setMealLog((prev) => prev.filter((m) => m.id !== id));
  };

  const handleDeleteWorkout = async (id) => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (!error) setWorkoutLog((prev) => prev.filter((w) => w.id !== id));
  };

  // ✅ Pagination
  const paginatedMealLogs = filteredMealLogs.slice(
    logPage * ITEMS_PER_PAGE,
    logPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );
  const paginatedWorkoutLogs = filteredWorkoutLogs.slice(
    logPage * ITEMS_PER_PAGE,
    logPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-t-2xl px-5 pt-6 pb-4 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-2xl font-extrabold text-white">
              SmartGenie
            </span>
            <FiCalendar size={22} className="text-white" />
          </div>
          <div className="text-right text-white font-semibold text-sm mb-3">
            {selectedDay.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="flex justify-between gap-1 overflow-x-auto pb-1">
            {getWeekDays(selectedDay).map((d) => {
              const isSel =
                getLocalDateString(d) === getLocalDateString(selectedDay);
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`flex flex-col items-center min-w-[40px] py-2 px-1 rounded-xl text-xs transition ${
                    isSel
                      ? "bg-white text-green-600 font-bold shadow-md"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  <span className="text-[10px]">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="mt-1 text-sm">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <input
              type="date"
              value={getLocalDateString(selectedDay)}
              onChange={(e) => setSelectedDay(new Date(e.target.value))}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm shadow-inner"
            />
            <select
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm shadow-inner"
              value={mealTypeFilter}
              onChange={(e) => setMealTypeFilter(e.target.value)}
            >
              <option value="">All Meals</option>
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snack</option>
            </select>
          </div>

          {/* Totals */}
          <div className="bg-green-100 p-3 rounded-lg shadow-inner text-sm font-small flex justify-between">
            <span className="font-semibold text-gray-800">Calories Consumed</span>
            <span>
              {totalsMeals.calories} / {profile?.calorie_needs || 0} kcal
            </span>
          </div>
          <div className="bg-green-100 p-3 rounded-lg shadow-inner text-sm font-small flex justify-between">
            <span className="font-semibold text-gray-800">Workout Summary</span>
            <span>
              {totalsWorkout.calories} kcal | Fat: {totalsWorkout.fat} | Carbs:{" "}
              {totalsWorkout.carbs} | Duration: {totalsWorkout.duration} min
            </span>
          </div>

          {/* Meal Logs */}
          <div>
            <h3 className="text-lg font-semibold text-green-700 mb-1">
              Meal and Workouts Logs
            </h3>
            {paginatedMealLogs.length ? (
              paginatedMealLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 mb-2 flex justify-between items-center hover:bg-green-50 transition"
                >
                  <div className="flex flex-col text-sm">
                    <span className="font-semibold text-green-700">
                      {entry.meal_type}
                    </span>
                    <span>{entry.dish_name}</span>
                    <span className="text-xs text-gray-500">
                      {entry.serving_label}
                    </span>
                    <span className="text-xs text-gray-600 mt-1">
                      Cal: {entry.calories} | Protein: {entry.protein} | Fat:{" "}
                      {entry.fat} | Carbs: {entry.carbs}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteMeal(entry.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic text-sm">No logged yet.</p>
            )}
          </div>

          {/* Workout Logs */}
          <div>
            <h3 className="text-lg font-semibold text-green-700 mb-3"></h3>
            {paginatedWorkoutLogs.length === 0 ? (
              <p className="text-gray-500"></p>
            ) : (
              <div className="space-y-3">
                {paginatedWorkoutLogs.map((w) => (
                  <div
                    key={w.id}
                    className="border rounded-xl p-3 shadow-sm flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <span>{emojiMap[w.workout_types?.name] || "🏋️"}</span>
                        {w.workout_types?.name || "—"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {w.duration} min |{" "}
                        {new Date(w.created_at).toLocaleDateString()}
                      </p>
                      {(w.calories_burned ||
                        w.fat_burned ||
                        w.carbs_burned) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {w.calories_burned && (
                            <span>{w.calories_burned} kcal</span>
                          )}
                          {w.fat_burned && <span> • {w.fat_burned}g fat</span>}
                          {w.carbs_burned && (
                            <span> • {w.carbs_burned}g carbs</span>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteWorkout(w.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <FooterNav />
      </div>
    </div>
  );
}
