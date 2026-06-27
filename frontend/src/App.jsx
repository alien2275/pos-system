import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch } from "./config";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Checkout from "./pages/Checkout";
import Sales from "./pages/Sales";
import Events from "./pages/Events";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Settings from "./pages/Settings";
import Store from "./pages/Store";
import StoreProducts from "./pages/StoreProducts";

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submitLogin(event) {
    event.preventDefault();
    setError("");

    const response = await apiFetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setError("Username or password was not accepted.");
      return;
    }

    onLogin();
  }

  return (
    <main className="admin-login-page">
      <form className="admin-panel admin-login-card" onSubmit={submitLogin}>
        <div>
          <h1>sammyinthesky POS</h1>
          <p>Sign in to manage products, sales, orders, and settings.</p>
        </div>

        <label>
          Admin Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
            required
          />
        </label>

        <label>
          Admin Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && <p>{error}</p>}

        <button type="submit">Sign In</button>
      </form>
    </main>
  );
}

function AdminLayout() {
  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/inventory", label: "Inventory" },
    { to: "/admin/checkout", label: "Checkout" },
    { to: "/admin/sales", label: "Sales" },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/events", label: "Events" },
    { to: "/admin/settings", label: "Settings" },
  ];

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-brand">sammyinthesky POS</div>
        <div className="admin-nav-links">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
          <button className="nav-button" onClick={logout}>
            Sign Out
          </button>
        </div>
      </nav>

      <main className="admin-main">
        <Routes>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/inventory" element={<Inventory />} />
          <Route path="/admin/checkout" element={<Checkout />} />
          <Route path="/admin/sales" element={<Sales />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/orders/:orderId" element={<OrderDetail />} />
          <Route path="/admin/events" element={<Events />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function StoreLayout() {
  return (
    <div className="public-store-shell">
      <Routes>
        <Route path="/" element={<Store />} />
        <Route path="/products" element={<StoreProducts />} />
        <Route path="/store" element={<Navigate to="/" replace />} />
        <Route path="/store/products" element={<Navigate to="/products" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdminRoute) {
      setIsCheckingAuth(false);
      return;
    }

    setIsCheckingAuth(true);
    apiFetch("/auth/status")
      .then((res) => res.json())
      .then((data) => setIsAuthenticated(data.authenticated))
      .catch((err) => console.error(err))
      .finally(() => setIsCheckingAuth(false));
  }, [isAdminRoute]);

  function handleLogin() {
    setIsAuthenticated(true);
    navigate("/admin/dashboard", { replace: true });
  }

  if (!isAdminRoute) {
    return <StoreLayout />;
  }

  if (isCheckingAuth) {
    return <p>Checking sign in...</p>;
  }

  if (!isAuthenticated) {
    if (location.pathname !== "/admin") {
      return <Navigate to="/admin" replace />;
    }

    return <AdminLogin onLogin={handleLogin} />;
  }

  if (location.pathname === "/admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <AdminLayout />;
}

export default App;
