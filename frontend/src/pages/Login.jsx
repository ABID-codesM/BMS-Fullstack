import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const LOGIN_API_URL = "http://localhost:5000/api/auth/login";
//const LOGIN_API_URL = "http://192.168.113.25:5000/api/auth/login";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (
        !data.token ||
        (data.user?.role !== "Admin" && data.user?.role !== "Building Manager")
      ) {
        throw new Error("Invalid server response.");
      }

      sessionStorage.setItem("bmsToken", data.token);
      sessionStorage.setItem("bmsUser", JSON.stringify(data.user));

      if (data.user.role === "Building Manager") {
        navigate("/manager", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
      //navigate("/");
    } catch (error) {
      setError(
        error.message === "Failed to fetch"
          ? "Unable to connect to the server. Please check the backend."
          : error.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">BMS</div>
          <h1>Building Management System</h1>
          <p>Admin Portal</p>
        </div>

        <div className="login-heading">
          <h2>Welcome Back</h2>
          <p>Sign in to access your dashboard.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer">Authorized administrators only.</p>
      </section>
    </main>
  );
}

export default Login;
