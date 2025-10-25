import { FaUser } from "react-icons/fa6";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
export default function PersonalDash() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state || !state.healthResults) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <h1 className="text-xl font-semibold text-red-600">
          No profile data found.
        </h1>
        <p>Please complete your profile setup first.</p>
      </div>
    );
  }

  const { name } = state;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex items-center justify-center px-4 py-4">
      <div className="bg-white w-[375px] min-h-screen rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Blue Header */}
        <div className="bg-blue-500 text-white rounded-t-2xl px-4 pt-4 pb-2 h-[160px]">
          <div className="flex justify-between items-center mb-2">
            <h1 className="font-bold text-2xl pt-10">SmartGenie.</h1>
            <span className="text-sm font-medium">
              <strong>Hi,</strong> {name}!
              <FaUser className="inline-block ml-1" />
            </span>
          </div>
          {/* Horizontal Menu */}
          <div className="flex justify-between space-x-1 text-xs font-medium text-blue-500 pt-5">
            <button
              className="flex-1 py-2 rounded-3xl bg-white hover:bg-blue-100"
              onClick={() => navigate("/NutritionProtocol")}
            >
              Nutrition Protocol
            </button>
            <button className="flex-1 py-2 rounded-3xl bg-white hover:bg-blue-100">
              My Status
            </button>
            <button className="flex-1 py-2 rounded-3xl bg-white hover:bg-blue-100">
              Suggested Meal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
