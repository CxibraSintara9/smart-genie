import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import LandingPage from "./pages/Landing";
import ScanPage from "./pages/ScanPage";
import AnalyzePage from "./components/AnalyzePage";
import ResultPage from "./pages/ResultPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import HealthProfile from "./pages/HealthProfile";
import PersonalDash from "./pages/PersonalDash";
import EditProfile from "./pages/EditProfile";
import NutritionProtocol from "./components/NutritionProtocol.jsx";
import Profile from "./pages/Profile.jsx";
import Navbar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import Journal from "./pages/Journal.jsx";
import Settings from "./pages/Setting.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import FAQ from "./pages/FAQ.jsx";
import ContactUs from "./pages/ContactUs.jsx";
import Terms from "./pages/Terms.jsx";
import Disclaimer from "./pages/Disclaimer.jsx";
import AccountManagement from "./pages/Account.jsx";
import NotFound from "./pages/NotFound.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import MealPlan from "./pages/Mealplan.jsx";
import Workout from "./pages/Workout.jsx";

function App() {
  useEffect(() => {
    if (window.location.hash === "#") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/health-profile" element={<HealthProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/account" element={<AccountManagement />} />
        <Route path="/notfound" element={<NotFound />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/mealplan" element={<MealPlan />} />
        <Route path="/workout" element={<Workout />} />

        {/* Protected Routes */}
        <Route
          path="/personaldashboard"
          element={
            <ProtectedRoute>
              <PersonalDash />
            </ProtectedRoute>
          }
        />
        <Route
          path="/journal"
          element={
            <ProtectedRoute>
              <Journal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nutrition-protocol"
          element={
            <ProtectedRoute>
              <NutritionProtocol />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/navbar"
          element={
            <ProtectedRoute>
              <Navbar />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
