// File: front-end/src/components/Navbar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

type NavbarProps = {
  onLogout: () => void;
};

export default function Navbar({ onLogout }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isActive = (path: string) => location.pathname === path ? "active" : "";

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
  }, [location]); 
  {/*const linkClasses = (path: string) =>
    `px-3 py-1 rounded-lg transition ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-blue-600 hover:bg-blue-100"
    }`;*/}

    const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (confirmed) {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      onLogout();
      navigate("/"); // redirect to login page after logout
    }
  };

  return (
    <header className="app-header">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">PHEX AI</Link>
        <div className="navbar-links">
          <Link className={isActive("/")} to="/">Home</Link>
          <Link className={isActive("/calculator")} to="/calculator">Pigment Mixer</Link>
          <Link className={isActive("/history")} to="/history">History</Link>
          {isLoggedIn ? (
            <button onClick={handleLogout} className="logout-button">Logout</button>
          ) : (
            <Link className={isActive("/login")} to="/login">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
