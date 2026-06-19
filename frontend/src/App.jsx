import { Link, Route, Routes, useLocation } from "react-router-dom";
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
    { to: "/", label: "Dashboard" },
    { to: "/products", label: "Products" },
    { to: "/inventory", label: "Inventory" },
    { to: "/checkout", label: "Checkout" },
    { to: "/sales", label: "Sales" },
    { to: "/orders", label: "Orders" },
    { to: "/events", label: "Events" },
    { to: "/settings", label: "Settings" },
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function StoreLayout() {
  return (
    <div className="public-store-shell">
      <Routes>
        <Route path="/store" element={<Store />} />
        <Route path="/store/products" element={<StoreProducts />} />
      </Routes>
    </div>
  );
}

function App() {
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith("/store")) {
      setIsCheckingAuth(false);
      return;
    }

    setIsCheckingAuth(true);
    apiFetch("/auth/status")
      .then((res) => res.json())
      .then((data) => setIsAuthenticated(data.authenticated))
      .catch((err) => console.error(err))
      .finally(() => setIsCheckingAuth(false));
  }, [location.pathname]);

  if (location.pathname.startsWith("/store")) {
    return <StoreLayout />;
  }

  if (isCheckingAuth) {
    return <p>Checking sign in...</p>;
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminLayout />;
}

export default App;
