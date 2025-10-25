// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { supabase } from "../supabaseClient";

// export default function Signup() {
//   const navigate = useNavigate();
//   const [email, setEmail] = useState("");
//   const [name, setName] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");

//   // Password validation checks
//   const rules = {
//     length: password.length >= 8,
//     uppercase: /[A-Z]/.test(password),
//     lowercase: /[a-z]/.test(password),
//     number: /\d/.test(password),
//     special: /[@$!%*?&]/.test(password),
//   };

//   const handleSignup = async (e) => {
//     e.preventDefault();

//     if (password !== confirmPassword) {
//       setErrorMsg("Passwords do not match!");
//       return;
//     }

//     // Ensure all rules pass
//     if (!Object.values(rules).every(Boolean)) {
//       setErrorMsg("Password does not meet all requirements.");
//       return;
//     }

//     setLoading(true);
//     setErrorMsg("");

//     const { data, error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: { full_name: name },
//         emailRedirectTo: `${window.location.origin}/health-profile`,
//       },
//     });

//     setLoading(false);

//     if (error) {
//       if (error.message.includes("already registered")) {
//         setErrorMsg("This email is already in use.");
//       } else {
//         setErrorMsg("Something wrong!Check your internet connection");
//       }
//     } else {
//       setErrorMsg(
//         "Signup successful! Please check your email to confirm your account."
//       );
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-green-100 flex items-center justify-center px-4 py-12">
//       <div className="bg-white w-[400px] max-w-md h-auto rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
//         <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2 text-center">
//           Create Account ✨
//         </h2>
//         <p className="text-center text-gray-500 mb-6 text-sm sm:text-base px-2 sm:px-0">
//           Start your journey with{" "}
//           <span className="font-semibold text-green-600">SmartGenie</span>
//         </p>

//         {errorMsg && (
//           <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-center text-sm sm:text-base mb-4 w-full">
//             {errorMsg}
//           </div>
//         )}

//         <form
//           onSubmit={handleSignup}
//           className="w-full space-y-4 sm:space-y-6 px-2 sm:px-0"
//         >
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Full Name
//             </label>
//             <input
//               type="text"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               placeholder="John Doe"
//               required
//               className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Email
//             </label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="you@example.com"
//               required
//               className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
//             />
//           </div>

//           {/* Password */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Password
//             </label>
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder="••••••••"
//               required
//               className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
//             />

//             {/* Password Rules */}
//             <ul className="mt-2 text-xs text-gray-600 space-y-1">
//               <li className={rules.length ? "text-green-600" : "text-red-500"}>
//                 {rules.length ? "✅" : "❌"} At least 8 characters
//               </li>
//               <li
//                 className={rules.uppercase ? "text-green-600" : "text-red-500"}
//               >
//                 {rules.uppercase ? "✅" : "❌"} One uppercase letter
//               </li>
//               <li
//                 className={rules.lowercase ? "text-green-600" : "text-red-500"}
//               >
//                 {rules.lowercase ? "✅" : "❌"} One lowercase letter
//               </li>
//               <li className={rules.number ? "text-green-600" : "text-red-500"}>
//                 {rules.number ? "✅" : "❌"} One number
//               </li>
//               <li className={rules.special ? "text-green-600" : "text-red-500"}>
//                 {rules.special ? "✅" : "❌"} One special character (@$!%*?&)
//               </li>
//             </ul>
//           </div>

//           {/* Confirm Password */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Confirm Password
//             </label>
//             <input
//               type="password"
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               placeholder="••••••••"
//               required
//               className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
//             />
//           </div>

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 sm:py-3 rounded-xl shadow-lg transition duration-300 text-sm sm:text-base"
//           >
//             {loading ? "Signing Up..." : "Sign Up"}
//           </button>
//         </form>

//         <div className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-600 space-y-1 sm:space-y-2">
//           Already have an account?{" "}
//           <span
//             onClick={() => navigate("/login")}
//             className="text-green-600 hover:underline cursor-pointer"
//           >
//             Sign In
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// ===============================================================================================

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Password validation
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  // ✅ Signup with email/password
  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match!");
      return;
    }

    if (!Object.values(rules).every(Boolean)) {
      setErrorMsg("Password does not meet all requirements.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/health-profile`,
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        setErrorMsg("This email is already in use.");
      } else {
        setErrorMsg("Something went wrong! Please check your connection.");
      }
    } else {
      setErrorMsg(
        "Signup successful! Please check your email to confirm your account."
      );
    }
  };

  // ✅ Save current route before OAuth redirect
  const saveRedirectPath = () => {
    localStorage.setItem("redirect_after_oauth", window.location.pathname);
  };

  // ✅ Google Signup
  const handleGoogleSignup = async () => {
    try {
      saveRedirectPath();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google signup error:", error);
      setErrorMsg("Failed to sign up with Google.");
    }
  };

  // ✅ Facebook Signup
  const handleFacebookSignup = async () => {
    try {
      saveRedirectPath();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Facebook signup error:", error);
      setErrorMsg("Failed to sign up with Facebook.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-green-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white w-[400px] max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2 text-center">
          Create Account
        </h2>
        <p className="text-center text-gray-500 mb-6 text-sm sm:text-base">
          Start your journey with{" "}
          <span className="font-semibold text-green-600">SmartGenie</span>
        </p>

        {errorMsg && (
          <div className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-center text-sm mb-4 w-full">
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="w-full space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-green-600"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>

            {/* Password Rules */}
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li className={rules.length ? "text-green-600" : "text-red-500"}>
                {rules.length ? "✅" : "❌"} At least 8 characters
              </li>
              <li
                className={rules.uppercase ? "text-green-600" : "text-red-500"}
              >
                {rules.uppercase ? "✅" : "❌"} One uppercase letter
              </li>
              <li
                className={rules.lowercase ? "text-green-600" : "text-red-500"}
              >
                {rules.lowercase ? "✅" : "❌"} One lowercase letter
              </li>
              <li className={rules.number ? "text-green-600" : "text-red-500"}>
                {rules.number ? "✅" : "❌"} One number
              </li>
              <li className={rules.special ? "text-green-600" : "text-red-500"}>
                {rules.special ? "✅" : "❌"} One special character (@$!%*?&)
              </li>
            </ul>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-green-600"
              >
                {showConfirmPassword ? (
                  <FiEyeOff size={20} />
                ) : (
                  <FiEye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow-lg transition duration-300"
          >
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center w-full my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-3 text-gray-400 text-sm">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Signup */}
        <button
          onClick={handleGoogleSignup}
          className="w-full border border-gray-300 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-gray-50 transition duration-300"
        >
          <FcGoogle size={22} />
          <span className="text-gray-700 font-medium">
            Continue with Google
          </span>
        </button>

        {/* Facebook Signup */}
        <button
          onClick={handleFacebookSignup}
          className="w-full mt-3 border border-gray-300 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-gray-50 transition duration-300"
        >
          <FaFacebook size={22} className="text-blue-600" />
          <span className="text-gray-700 font-medium">
            Continue with Facebook
          </span>
        </button>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-green-600 hover:underline cursor-pointer"
          >
            Sign In
          </span>
        </div>
      </div>
    </div>
  );
}
