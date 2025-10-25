import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiTrash2 } from "react-icons/fi";
import FooterNav from "../components/FooterNav";
// ✅ Safe date conversion
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

export default function Journal() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [mealLog, setMealLog] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [mealTypeFilter, setMealTypeFilter] = useState("");
  const ITEMS_PER_PAGE = 6;
  const [logPage, setLogPage] = useState(0);

  // ✅ Fetch profile + meal logs
  const fetchData = useCallback(async () => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) return navigate("/login");

    try {
      const [profileRes, mealRes] = await Promise.all([
        supabase
          .from("health_profiles")
          .select("calorie_needs, protein_needed, fats_needed, carbs_needed")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("meal_logs")
          .select("id, meal_type, calories, protein, fat, carbs, meal_date, dish_name, serving_label")
          .eq("user_id", user.id)
          .order("meal_date", { ascending: true }),
      ]);

      setProfile(profileRes.data ?? null);
      setMealLog(mealRes.data ?? []);
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
      return mealDateStr === dayStr && (!mealTypeFilter || m.meal_type === mealTypeFilter);
    });
  }, [mealLog, selectedDay, mealTypeFilter]);
  

  // ✅ Totals
  const totals = useMemo(
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

  // ✅ Delete meal
  const handleDeleteMeal = async (id) => {
    const { error } = await supabase.from("meal_logs").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      setMealLog((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const paginatedLogs = filteredMealLogs.slice(
    logPage * ITEMS_PER_PAGE,
    logPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  // ✅ UI
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl overflow-auto flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-t-2xl px-5 pt-6 pb-4 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-2xl font-extrabold text-white">SmartGenie</span>
            <FiCalendar size={22} className="text-white" />
          </div>
          <div className="text-right text-white font-semibold text-sm mb-3">
            {selectedDay.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </div>

          {/* Week days */}
          <div className="flex justify-between gap-1 overflow-x-auto pb-1">
            {getWeekDays(selectedDay).map((d) => {
              const isSel = getLocalDateString(d) === getLocalDateString(selectedDay);
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
              <option value="">All</option>
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snack</option>
            </select>
          </div>

          {/* Totals */}
          <div className="bg-green-100 p-3 rounded-lg shadow-inner text-sm font-medium flex justify-between">
            <span>Calories</span>
            <span>
              {totals.calories} / {profile?.calorie_needs || 0} kcal
            </span>
          </div>

          {/* Meal Logs */}
          <div>
            <h3 className="text-lg font-semibold text-green-700 mb-1">Meal Log</h3>
            {paginatedLogs.length ? (
              paginatedLogs.map((entry) => (
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
                      Cal: {entry.calories} | P: {entry.protein} | F: {entry.fat} | C: {entry.carbs}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteMeal(entry.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full"
                    title="Delete"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic text-sm">No meals logged yet.</p>
            )}
          </div>
        </div>

        <FooterNav />
      </div>
    </div>
  );
}
