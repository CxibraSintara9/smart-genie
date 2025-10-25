// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { supabase } from "../supabaseClient";

// export default function ContactUs() {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     message: "",
//   });
//   const [submitted, setSubmitted] = useState(false);
//   const [error, setError] = useState("");

//   // Handle input changes
//   const handleChange = (e) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   // Submit form safely
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");

//     try {
//       const response = await fetch(
//         "https://exscmqdazkrtrfhstytk.supabase.co/functions/v1/send-contact-email",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(formData),
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) throw new Error(data.error || "Failed");

//       alert("Function works!"); // just to test
//     } catch (err) {
//       console.error(err);
//       setError("Failed to call function.");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 flex items-center justify-center px-4 py-6">
//       <div className="bg-white w-[375px] h-[700px] rounded-2xl shadow-2xl overflow-auto flex flex-col">
//         {/* Header */}
//         <div className="bg-blue-400 p-4 rounded-t-2xl text-white shadow flex items-center">
//           <button
//             onClick={() => navigate("/settings")}
//             className="text-white text-sm"
//           >
//             Back
//           </button>
//           <div className="flex-1 text-center font-semibold text-white text-sm">
//             Contact Us
//           </div>
//           <div className="w-[40px]"></div>
//         </div>

//         {/* Form */}
//         <div className="p-4 flex-1 overflow-auto">
//           {submitted && (
//             <div className="bg-green-100 text-green-800 p-2 rounded mb-4 text-center">
//               Thank you! Your message has been sent.
//             </div>
//           )}
//           {error && (
//             <div className="bg-red-100 text-red-800 p-2 rounded mb-4 text-center">
//               {error}
//             </div>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label className="block text-gray-700 text-sm font-medium mb-1">
//                 Name
//               </label>
//               <input
//                 type="text"
//                 name="name"
//                 value={formData.name}
//                 onChange={handleChange}
//                 required
//                 className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
//                 placeholder="Your name"
//               />
//             </div>

//             <div>
//               <label className="block text-gray-700 text-sm font-medium mb-1">
//                 Email
//               </label>
//               <input
//                 type="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 required
//                 className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
//                 placeholder="you@example.com"
//               />
//             </div>

//             <div>
//               <label className="block text-gray-700 text-sm font-medium mb-1">
//                 Message
//               </label>
//               <textarea
//                 name="message"
//                 value={formData.message}
//                 onChange={handleChange}
//                 required
//                 className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
//                 rows={4}
//                 placeholder="Your message"
//               />
//             </div>

//             <button
//               type="submit"
//               className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
//             >
//               Send Message
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }

// ====================================================================================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSend } from "react-icons/fi";
import { supabase } from "../supabaseClient";

export default function ContactUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // ✅ Fetch logged-in user's email
  useEffect(() => {
    const fetchUserEmail = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user) {
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
        }));
      }
      if (error) console.error("Error fetching user:", error.message);
    };

    fetchUserEmail();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // ✅ Get current session (for access token)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) throw new Error("You must be logged in to send a message.");

      // ✅ Send the request with user's access token
      const response = await fetch(
        "https://exscmqdazkrtrfhstytk.supabase.co/functions/v1/send-contact-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`, // 🔥 important
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed");

      setSubmitted(true);
      setFormData({ name: "", email: formData.email, message: "" });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send message. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex items-center justify-center px-4 py-6">
      <div className="bg-white w-[380px] h-[720px] rounded-3xl shadow-2xl overflow-auto flex flex-col border border-green-100">
        {/* Header */}
        <div className="bg-green-600 p-5 rounded-t-3xl text-white shadow-lg flex items-center justify-between">
          <button
            onClick={() => navigate("/settings")}
            className="text-white text-lg p-1 hover:bg-green-500 rounded transition"
          >
            <FiArrowLeft />
          </button>
          <div className="font-bold text-lg">Contact Us</div>
          <div className="w-6"></div>
        </div>

        {/* Form */}
        <div className="p-5 flex-1 overflow-auto">
          {submitted && (
            <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-center shadow-sm">
              Thank you! Your message has been sent.
            </div>
          )}
          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4 text-center shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-green-900 text-sm font-medium mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border border-green-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm transition"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-green-900 text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full border border-green-200 bg-gray-50 text-gray-700 rounded-xl px-4 py-2 shadow-sm cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-green-900 text-sm font-medium mb-1">
                Message
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={5}
                className="w-full border border-green-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm resize-none transition"
                placeholder="Your message"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 flex items-center justify-center gap-2 transition shadow"
            >
              <FiSend /> Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
