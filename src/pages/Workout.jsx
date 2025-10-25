import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaDumbbell, FaTrashAlt } from "react-icons/fa";
import FooterNav from "../components/FooterNav";

export default function Workout() {
  const [workoutTypes, setWorkoutTypes] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [duration, setDuration] = useState("");
  const [userId, setUserId] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ show: false, message: "" });
  const navigate = useNavigate();

  // 🔹 Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return navigate("/login");
      setUserId(data.user.id);
    };
    getUser();
  }, [navigate]);

  // 🔹 Fetch available workout types
  useEffect(() => {
    const fetchWorkoutTypes = async () => {
      const { data, error } = await supabase.from("workout_types").select("*");
      if (error) console.error("Error fetching workout types:", error);
      else setWorkoutTypes(data);
    };
    fetchWorkoutTypes();
  }, []);

  // 🔹 Fetch user's workouts
  const fetchWorkouts = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("workouts")
      .select(`
        id,
        duration,
        calories_burned,
        fat_burned,
        carbs_burned,
        created_at,
        workout_types (name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching workouts:", error);
    else setWorkouts(data);
  };

  useEffect(() => {
    fetchWorkouts();
  }, [userId]);

  // 🔹 Add new workout
  const handleAddWorkout = async (e) => {
    e.preventDefault();
    if (!selectedWorkout || !duration) {
      setModal({ show: true, message: "Please fill all fields." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("workouts").insert([
      {
        user_id: userId,
        workout_type_id: selectedWorkout,
        duration: duration,
      },
    ]);

    if (error)
      setModal({ show: true, message: "Error saving workout: " + error.message });
    else {
      setModal({ show: true, message: "Workout logged successfully!" });
      setDuration("");
      setSelectedWorkout("");
      fetchWorkouts(); // ✅ Re-fetch after adding
    }

    setLoading(false);
  };

  // 🔹 Delete workout (fixed)
  const handleDeleteWorkout = async (id) => {
    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // ✅ Include user_id for RLS

    if (error) {
      setModal({ show: true, message: "Error deleting workout: " + error.message });
    } else {
      // ✅ Refresh state to reflect deletion
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      setModal({ show: true, message: "Workout deleted successfully." });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <FaDumbbell className="text-blue-600" /> Workout Tracker
      </h1>

      {/* Form Section */}
      <div className="border rounded-xl p-4 mb-6 shadow-sm">
        <form onSubmit={handleAddWorkout} className="space-y-3">
          <div>
            <label className="block mb-1 text-sm font-medium">Workout</label>
            <select
              value={selectedWorkout}
              onChange={(e) => setSelectedWorkout(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">-- Select a workout --</option>
              {workoutTypes.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Duration (minutes)
            </label>
            <input
              type="number"
              placeholder="e.g. 30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            {loading ? "Saving..." : "Add Workout"}
          </button>
        </form>
      </div>

      {/* Logged Workouts */}
      <h2 className="text-lg font-semibold mb-2">Your Workouts</h2>
      {workouts.length === 0 ? (
        <p className="text-gray-500">No workouts logged yet.</p>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <div
              key={w.id}
              className="border rounded-xl p-3 shadow-sm flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{w.workout_types?.name || "—"}</p>
                <p className="text-sm text-gray-500">
                  {w.duration} min | {new Date(w.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  🔥 {w.calories_burned?.toFixed(1) || 0} kcal | Fat:{" "}
                  {w.fat_burned?.toFixed(1) || 0}g | Carbs:{" "}
                  {w.carbs_burned?.toFixed(1) || 0}g
                </p>
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

      {/* Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-lg max-w-sm text-center">
            <p className="mb-4">{modal.message}</p>
            <button
              onClick={() => setModal({ show: false, message: "" })}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
      <FooterNav />
    </div>
  );
}
