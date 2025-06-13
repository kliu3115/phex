import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import History from "./History";
import Login from "./Login";
import PaintCalculator from "./PaintCalculator";
import Navbar from "./Navbar";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const Welcome = (
    <div className="text-center">
      <h1>Welcome to PHEX AI</h1>
      <h3>PHEX is an AI powered paint mixing tool that ensures you get the perfect color on the first go. </h3>
      {isLoggedIn ? (
        <p className="mt-2">
          Use the{" "}
          <Link to="/calculator" style={{color: "#2247cf", textDecoration: 'none'}}>
            Paint Calculator
          </Link>{" "}
          to begin mixing colors. View your past mixes in {" "}
          <Link to="/history" style={{color: "#2247cf", textDecoration: 'none'}}>
            History
          </Link>{""}
          .
        </p>
      ) : (
        <p className="mt-2">
          Use the{" "}
          <Link to="/calculator" style={{color: "#2247cf", textDecoration: 'none'}}>
            Paint Calculator
          </Link>{" "}
          tab to begin mixing colors. {" "}
          <Link to="/login" style={{color: "#2247cf", textDecoration: 'none'}}>
            Log in
          </Link>{" "}
          to save and view your history.
        </p>
      )}
      <br /> <br /> <h2> Why PHEX? </h2>
      <div className="three-boxes">
        <div className="box">
          <h3 style={{ color: "#2247cf" }}>AI Powered Feedback</h3>
          <p>Let AI handle the color science — get optimal mix formulas and smart insights on accuracy in seconds.</p>
        </div>
        <div className="box">
          <h3 style={{ color: "#2247cf" }}>Built For Efficiency</h3>
          <p>Track your past mixes effortlessly in a clean, high-speed interface designed for smooth, focused mixing.</p>
        </div>
        <div className="box">
          <h3 style={{ color: "#2247cf" }}>Skip the Guesswork</h3>
          <p>No more poopy browns and hours spent trying to mix the perfect purple, only to find out it's impossible.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Router>
        <header className="app-header">
          <Navbar onLogout={handleLogout} />
        </header>        
        <main className="container">
          <Routes>
            <Route path="/" element={Welcome} />
            <Route path="/calculator" element={<PaintCalculator />} />
            <Route path="/history" element={<History />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}
