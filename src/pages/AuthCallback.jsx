// src/pages/AuthCallback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // ✅ Redirect to last visited or fallback
        const savedPath =
          localStorage.getItem("redirect_after_oauth") || "/health-profile";
        localStorage.removeItem("redirect_after_oauth");
        navigate(savedPath, { replace: true });
      } else {
        // ❌ No session → go to login
        navigate("/login");
      }
    };

    handleSession();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-600">
      <div className="animate-pulse">Signing you in...</div>
    </div>
  );
}
