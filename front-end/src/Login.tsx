// File: front-end/src/components/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import axios from "axios";

type LoginProps = {
  onLogin: () => void;
};

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");

  // Send local history to backend after login success
  const syncHistoryToServer = async (token: string) => {
    try {
      const localHistory = localStorage.getItem("paintMixHistory");
      if (localHistory) {
        await axios.post(
          "/api/history/index",
          { history: JSON.parse(localHistory) },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error("Failed to sync history:", error);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/login", { email, password });
      localStorage.setItem("token", res.data.token);
      setMessage("Login successful! Your history is syncing...");
      await syncHistoryToServer(res.data.token);
      onLogin();
      navigate("/");
    } catch (err: any) {
      console.error("Login error:", err.response?.data);
      const backendError = err.response?.data;
      if (typeof backendError === "string") {
        setMessage(backendError);
      } else if (backendError?.error) {
        setMessage(backendError.error);
      } else if (backendError?.message) {
        setMessage(backendError.message);
      } else {
        setMessage("Login failed.");
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("/api/register", {
        email: registerEmail,
        password: registerPassword,
      });
      setRegisterMessage("Registration successful! You can now log in.");
      setIsRegistering(false);
      setRegisterEmail("");
      setRegisterPassword("");
    } catch (err: any) {
      console.error("Registration error:", err.response?.data);

      const backendError = err.response?.data;

      if (typeof backendError === "string") {
        setRegisterMessage(backendError);
      } else if (backendError?.error) {
        setRegisterMessage(backendError.error);
      } else if (backendError?.message) {
        setRegisterMessage(backendError.message);
      } else {
        setRegisterMessage("Registration failed.");
      }
    }
  };

  return (
    <div className="form-section">
      {isRegistering ? (
        <>
          <h2 className="text-xl font-semibold mb-2">Register</h2>
          <form onSubmit={handleRegisterSubmit} className="space-y-4 max-w-sm">
            <span> Username: </span><input
              type="email"
              placeholder="Username"
              required
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className="form-input"
            /> <br /> <br /> 
            <span> Password: </span><input
              type="password"
              placeholder="Password"
              required
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="form-input"
            /> <br /> <br />
            <button
              type="submit"
              className="form-button"
            >
              Register
            </button>
          </form>
          {registerMessage && <p className="mt-2">{registerMessage}</p>}
          <p className="mt-4">
            Already have an account?{" "}
            <button
              type = "button"
              onClick={() => {
                setIsRegistering(false);
                setRegisterMessage("");
              }}
              className="form-button"
              style={{border: 'none'}}
            >
              Log In
            </button>
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-2">Login</h2>
          <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-sm">
            <span> Username: </span><input
              type="email"
              placeholder="Username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            /> <br /> <br />
            <span> Password: </span><input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            /> <br /> <br />
            <button
              type="submit"
              className="form-button"
            >
              Log In
            </button>
          </form>
          {message && <p className="mt-2">{message}</p>}
          <p className="mt-4">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setMessage("");
              }}
              className="form-button"
              style={{border: 'none'}}
            >
              Register here
            </button>
          </p>
        </>
      )}
    </div>
  );
}
