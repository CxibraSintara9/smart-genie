import React, { useState, useEffect } from "react";
import { FiMenu, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center fixed w-full z-50">
      {/* Logo */}
      <div
        className="text-2xl font-bold text-green-600 cursor-pointer"
        onClick={() => navigate(session ? "/personaldashboard" : "/")}
      >
        SmartGenie
      </div>

      {/* Desktop */}
      <div className="hidden md:flex space-x-4">
        {!session ? (
          <>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-4 py-2 border border-green-600 text-green-600 rounded hover:bg-green-50 transition"
            >
              Sign Up
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/personaldashboard")}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 transition"
            >
              Logout
            </button>
          </>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <button onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-16 right-6 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col p-4 space-y-2 md:hidden">
          {!session ? (
            <>
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-4 py-2 border border-green-600 text-green-600 rounded hover:bg-green-50 transition"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/personaldashboard")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
