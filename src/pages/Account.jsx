// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { supabase } from "../supabaseClient";

// export default function AccountManagement() {
//   const navigate = useNavigate();
//   const [confirmDelete, setConfirmDelete] = useState(false);
//   const [confirmClear, setConfirmClear] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [userId, setUserId] = useState(null);

//   // Get current user
//   useEffect(() => {
//     const fetchUser = async () => {
//       const { data, error } = await supabase.auth.getUser();
//       if (error) {
//         console.error(error);
//         navigate("/login");
//         return;
//       }

//       if (!data.user) {
//         navigate("/login");
//       } else {
//         setUserId(data.user.id);
//       }
//     };
//     fetchUser();
//   }, [navigate]);

//   // Clear health profiles and meal logs
//   const handleClearData = async () => {
//     if (!userId) return;
//     console.log("Clearing data for user:", userId);
//     setLoading(true);

//     try {
//       // Delete health profiles
//       const { data: healthData, error: healthError } = await supabase
//         .from("health_profiles")
//         .delete()
//         .eq("user_id", userId);
//       if (healthError) throw healthError;

//       console.log("Deleted health profiles:", healthData);

//       // Delete meal logs
//       const { data: mealData, error: mealError } = await supabase
//         .from("meal_logs")
//         .delete()
//         .eq("user_id", userId);
//       if (mealError) throw mealError;

//       console.log("Deleted meal logs:", mealData);

//       alert("All your health profiles and meal logs have been cleared.");
//       setConfirmClear(false);
//     } catch (error) {
//       console.error(error);
//       alert("Failed to clear data. Make sure RLS policies allow deletion.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Delete account + auth + health profiles + meal logs via Edge Function
//   const handleDeleteAccount = async () => {
//     if (!userId) return;
//     setLoading(true);

//     try {
//       const res = await fetch("/functions/v1/delete-user", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId }),
//       });

//       const data = await res.json();

//       if (res.ok && data.success) {
//         alert("Your account and all data have been deleted.");
//         await supabase.auth.signOut(); // ensure user is signed out
//         navigate("/login");
//       } else {
//         throw new Error(data.error || "Failed to delete account.");
//       }
//     } catch (error) {
//       console.error(error);
//       alert("Failed to delete account.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex items-center justify-center px-4 py-6">
//       <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl overflow-auto flex flex-col">
//         {/* Header */}
//         <div className="bg-blue-400 p-4 rounded-t-2xl text-white shadow flex items-center">
//           {/* Back Button */}
//           <button
//             onClick={() => navigate("/settings")}
//             className="text-white text-sm"
//           >
//             Back
//           </button>
//           {/* FAQ Title */}
//           <div className="flex-1 text-center font-semibold text-white text-sm">
//             Account Management
//           </div>
//           {/* Placeholder to balance the flex */}
//           <div className="w-[40px]"></div>
//         </div>

//         {/* Content */}
//         <div className="p-4 flex-1 overflow-auto flex flex-col justify-start space-y-6">
//           <div className="text-gray-700 text-sm">
//             Manage your account: delete account or clear your health profile
//             data and meal logs.
//           </div>

//           {/* Clear Data */}
//           <div>
//             {confirmClear ? (
//               <div className="flex flex-col space-y-2">
//                 <div className="text-gray-700 text-sm">
//                   Clear all health profiles and meal logs?
//                 </div>
//                 <div className="flex space-x-2">
//                   <button
//                     onClick={handleClearData}
//                     disabled={loading}
//                     className="flex-1 bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 transition disabled:opacity-50"
//                   >
//                     {loading ? "Clearing..." : "Yes, Clear Data"}
//                   </button>
//                   <button
//                     onClick={() => setConfirmClear(false)}
//                     className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <button
//                 onClick={() => setConfirmClear(true)}
//                 className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 transition"
//               >
//                 Clear Health Profiles & Meal Logs
//               </button>
//             )}
//           </div>

//           {/* Delete Account */}
//           <div>
//             {confirmDelete ? (
//               <div className="flex flex-col space-y-2">
//                 <div className="text-gray-700 text-sm">
//                   Delete your account permanently?
//                 </div>
//                 <div className="flex space-x-2">
//                   <button
//                     onClick={handleDeleteAccount}
//                     disabled={loading}
//                     className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition disabled:opacity-50"
//                   >
//                     {loading ? "Deleting..." : "Yes, Delete Account"}
//                   </button>
//                   <button
//                     onClick={() => setConfirmDelete(false)}
//                     className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <button
//                 onClick={() => setConfirmDelete(true)}
//                 className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
//               >
//                 Delete Account
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// =========================================================================================================================================================================================================

// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { supabase } from "../supabaseClient";
// import { FiArrowLeft, FiTrash2, FiXCircle, FiDatabase } from "react-icons/fi";

// export default function AccountManagement() {
//   const navigate = useNavigate();
//   const [confirmDelete, setConfirmDelete] = useState(false);
//   const [confirmClear, setConfirmClear] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [userId, setUserId] = useState(null);

//   // Get current user
//   useEffect(() => {
//     const fetchUser = async () => {
//       const { data, error } = await supabase.auth.getUser();
//       if (error || !data.user) {
//         navigate("/login");
//       } else {
//         setUserId(data.user.id);
//       }
//     };
//     fetchUser();
//   }, [navigate]);

//   // Clear health profiles and meal logs
//   const handleClearData = async () => {
//     if (!userId) return;
//     setLoading(true);
//     try {
//       await supabase.from("health_profiles").delete().eq("user_id", userId);
//       await supabase.from("meal_logs").delete().eq("user_id", userId);
//       alert("All your health profiles and meal logs have been cleared.");
//       setConfirmClear(false);
//     } catch (error) {
//       console.error(error);
//       alert("Failed to clear data. Make sure RLS policies allow deletion.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Delete account
//   const handleDeleteAccount = async () => {
//     if (!userId) return;
//     setLoading(true);
//     try {
//       const res = await fetch("/functions/v1/delete-user", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId }),
//       });
//       const data = await res.json();
//       if (res.ok && data.success) {
//         alert("Your account and all data have been deleted.");
//         await supabase.auth.signOut();
//         navigate("/login");
//       } else {
//         throw new Error(data.error || "Failed to delete account.");
//       }
//     } catch (error) {
//       console.error(error);
//       alert("Failed to delete account.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex items-center justify-center px-4 py-6">
//       <div className="bg-white w-[380px] h-[720px] rounded-3xl shadow-2xl overflow-auto flex flex-col border border-green-100">
//         {/* Header */}
//         <div className="bg-green-600 p-5 rounded-t-3xl text-white shadow-lg flex items-center justify-between">
//           <button
//             onClick={() => navigate("/settings")}
//             className="text-white text-lg p-1 hover:bg-green-500 rounded transition"
//           >
//             <FiArrowLeft />
//           </button>
//           <div className="font-bold text-lg">Account Management</div>
//           <div className="w-6"></div>
//         </div>

//         {/* Content */}
//         <div className="p-5 flex-1 overflow-auto flex flex-col justify-start space-y-6">
//           <div className="text-gray-700 text-sm">
//             Manage your account: delete account or clear your health profile
//             data and meal logs.
//           </div>

//           {/* Clear Data */}
//           <div className="bg-green-50 p-4 rounded-xl shadow-sm">
//             {confirmClear ? (
//               <div className="flex flex-col space-y-3">
//                 <div className="flex items-center gap-2 text-gray-700 text-sm">
//                   <FiDatabase className="text-green-600" /> Clear all health profiles and meal logs?
//                 </div>
//                 <div className="flex space-x-2">
//                   <button
//                     onClick={handleClearData}
//                     disabled={loading}
//                     className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
//                   >
//                     {loading ? "Clearing..." : <><FiDatabase /> Clear Data</>}
//                   </button>
//                   <button
//                     onClick={() => setConfirmClear(false)}
//                     className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition flex items-center justify-center gap-2"
//                   >
//                     <FiXCircle /> Cancel
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <button
//                 onClick={() => setConfirmClear(true)}
//                 className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition flex items-center justify-center gap-2"
//               >
//                 <FiDatabase /> Clear Health Profiles & Meal Logs
//               </button>
//             )}
//           </div>

//           {/* Delete Account */}
//           <div className="bg-red-50 p-4 rounded-xl shadow-sm">
//             {confirmDelete ? (
//               <div className="flex flex-col space-y-3">
//                 <div className="flex items-center gap-2 text-gray-700 text-sm">
//                   <FiTrash2 className="text-red-600" /> Delete your account permanently?
//                 </div>
//                 <div className="flex space-x-2">
//                   <button
//                     onClick={handleDeleteAccount}
//                     disabled={loading}
//                     className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
//                   >
//                     {loading ? "Deleting..." : <><FiTrash2 /> Delete Account</>}
//                   </button>
//                   <button
//                     onClick={() => setConfirmDelete(false)}
//                     className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition flex items-center justify-center gap-2"
//                   >
//                     <FiXCircle /> Cancel
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <button
//                 onClick={() => setConfirmDelete(true)}
//                 className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition flex items-center justify-center gap-2"
//               >
//                 <FiTrash2 /> Delete Account
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// =======================================================================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiArrowLeft, FiTrash2, FiDatabase, FiX, FiKey } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function AccountManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [hasHealthData, setHasHealthData] = useState(false);

  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigate("/login");
          return;
        }
        setUserId(data.user.id);
        await checkHealthData(data.user.id);
      } catch (err) {
        console.error(err);
        navigate("/login");
      }
    };
    fetchUser();
  }, [navigate]);

  const checkHealthData = async (uid) => {
    try {
      const { data: profiles } = await supabase
        .from("health_profiles")
        .select("id")
        .eq("user_id", uid);
      const { data: meals } = await supabase
        .from("meal_logs")
        .select("id")
        .eq("user_id", uid);
      setHasHealthData((profiles?.length || 0) > 0 || (meals?.length || 0) > 0);
    } catch {
      setHasHealthData(true);
    }
  };

  const handleClearData = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorText("");
    try {
      const { error: e1 } = await supabase
        .from("health_profiles")
        .delete()
        .eq("user_id", userId);
      const { error: e2 } = await supabase
        .from("meal_logs")
        .delete()
        .eq("user_id", userId);

      if (e1 || e2) throw new Error("Failed to clear some data.");

      setHasHealthData(false);
      setShowClearModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);
    } catch (err) {
      console.error(err);
      setErrorText(err.message || "Unexpected error while clearing data.");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId) return;
    setLoading(true);
    setErrorText("");

    try {
      // Get current session for access token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("You must be logged in to delete your account.");

      console.log("Attempting to delete user with ID:", userId);
      
      const response = await fetch(
        "https://exscmqdazkrtrfhstytk.supabase.co/functions/v1/delete-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Successfully deleted account
        setShowDeleteModal(false);
        alert("✅ Your account has been successfully deleted.");
        
        // Sign out and navigate to login
        await supabase.auth.signOut();
        navigate("/login");
      } else {
        throw new Error(data.error || "Failed to delete account.");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      setErrorText(error.message || "Failed to delete account. Please try again.");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorText("Please fill in all fields.");
      setShowErrorModal(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorText("Passwords do not match.");
      setShowErrorModal(true);
      return;
    }
    if (newPassword.length < 6) {
      setErrorText("Password must be at least 6 characters.");
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setShowChangePasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      alert("✅ Password updated successfully!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex items-center justify-center px-4 py-6">
        <div className="bg-white w-[380px] h-[720px] rounded-3xl shadow-2xl overflow-auto flex flex-col border border-green-100 relative">
          <div className="bg-green-600 p-5 rounded-t-3xl text-white shadow-lg flex items-center justify-between">
            <button
              onClick={() => navigate("/settings")}
              className="text-white text-lg p-1 hover:bg-green-500 rounded transition"
            >
              <FiArrowLeft />
            </button>
            <div className="font-bold text-lg">Account Management</div>
            <div className="w-6" />
          </div>

          <div className="p-5 flex-1 flex flex-col justify-start space-y-6">
            <p className="text-gray-700 text-sm">
              Manage your account. You must <b>clear your health data first</b>{" "}
              before permanently deleting your account.
            </p>

            <div className="bg-blue-50 p-4 rounded-xl shadow-sm">
              <button
                onClick={() => setShowChangePasswordModal(true)}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
              >
                <FiKey /> Change Password
              </button>
            </div>

            <div className="bg-green-50 p-4 rounded-xl shadow-sm">
              <button
                onClick={() => setShowClearModal(true)}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium"
              >
                <FiDatabase /> Clear Health Profiles & Meal Logs
              </button>
            </div>

            <div className="bg-red-50 p-4 rounded-xl shadow-sm">
              <button
                onClick={() => !hasHealthData && setShowDeleteModal(true)}
                disabled={hasHealthData || loading}
                className={`w-full py-2 rounded-xl text-white flex items-center justify-center gap-2 font-medium transition ${
                  hasHealthData
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                <FiTrash2 />{" "}
                {hasHealthData ? "Clear Data First" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showChangePasswordModal && (
          <motion.div
            key="change-password-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-6 text-center space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Change Password
              </h3>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 p-2 rounded-lg"
              />
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showClearModal && (
          <motion.div
            key="clear-data-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-6 text-center space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Clear Health Data?
              </h3>
              <p className="text-sm text-gray-600">
                This will permanently remove all your health profiles and meal
                logs.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? "Clearing..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteModal && (
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-6 text-center space-y-4"
            >
              <h3 className="text-lg font-semibold text-gray-800">
                Delete Account?
              </h3>
              <p className="text-sm text-gray-600">
                This action is permanent and cannot be undone.
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showErrorModal && (
          <motion.div
            key="error-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ y: 10 }}
              animate={{ y: 0 }}
              exit={{ y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-80 p-5 text-center"
            >
              <div className="flex justify-between items-start">
                <h4 className="text-md font-semibold text-red-600">Error</h4>
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="text-gray-400"
                >
                  <FiX />
                </button>
              </div>
              <p className="mt-3 text-sm text-gray-700">{errorText}</p>
              <div className="mt-4">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showSuccessToast && (
          <motion.div
            key="success-toast"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-center">
              ✅ Health data cleared successfully!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}