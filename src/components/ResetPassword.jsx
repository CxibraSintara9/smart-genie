import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const accessToken = searchParams.get("access_token");

  useEffect(() => {
    if (!accessToken) {
      setMessage({ text: "Reset link expired or invalid.", type: "error" });
    }
  }, [accessToken]);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!password || !confirmPassword) {
      setMessage({ text: "Please fill in all fields.", type: "error" });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMessage({
        text: "Password must be at least 6 characters.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser(
        { password },
        { accessToken }
      );

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "✅ Password successfully updated! Redirecting...",
          type: "success",
        });
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch {
      setMessage({ text: "Something went wrong. Try again.", type: "error" });
    }

    setLoading(false);
  };

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Reset Your Password</h2>

        {message.text && (
          <div
            style={{
              ...messageBox,
              backgroundColor:
                message.type === "success" ? "#e6ffed" : "#ffe6e6",
              color: message.type === "success" ? "#2e7d32" : "#d32f2f",
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleReset} style={form}>
          {/* New Password */}
          <div style={inputContainer}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={input}
            />
            <span
              onClick={() => setShowPassword((prev) => !prev)}
              style={eyeIcon}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          {/* Confirm Password */}
          <div style={inputContainer}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={input}
            />
            <span
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              style={eyeIcon}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          <button type="submit" style={button} disabled={loading}>
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>

        <p style={backToLogin} onClick={() => navigate("/login")}>
          ← Back to Login
        </p>
      </div>
    </div>
  );
}

// ✅ Styles
const container = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  padding: "20px",
};

const card = {
  backgroundColor: "#fff",
  borderRadius: "16px",
  boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
  padding: "40px 30px",
  width: "100%",
  maxWidth: "400px",
  textAlign: "center",
};

const title = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#333",
  marginBottom: "25px",
};

const messageBox = {
  padding: "12px",
  borderRadius: "8px",
  fontWeight: "500",
  marginBottom: "15px",
};

const form = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const inputContainer = {
  position: "relative",
};

const input = {
  width: "100%",
  padding: "12px 40px 12px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "15px",
};

const eyeIcon = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  cursor: "pointer",
  color: "#555",
  fontSize: "18px",
};

const button = {
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(90deg, #4CAF50, #2E7D32)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "all 0.3s ease",
};

const backToLogin = {
  marginTop: "15px",
  fontSize: "14px",
  color: "#1976d2",
  cursor: "pointer",
  textDecoration: "underline",
};
