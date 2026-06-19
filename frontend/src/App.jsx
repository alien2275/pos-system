import { Link, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Checkout from "./pages/Checkout";
import Sales from "./pages/Sales";
import Events from "./pages/Events";
import Orders from "./pages/Orders";
import Store from "./pages/Store";
import StoreProducts from "./pages/StoreProducts";

function AdminLayout() {
  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/products", label: "Products" },
    { to: "/inventory", label: "Inventory" },
    { to: "/checkout", label: "Checkout" },
    { to: "/sales", label: "Sales" },
    { to: "/orders", label: "Orders" },
    { to: "/events", label: "Events" },
  ];

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
          <Route path="/events" element={<Events />} />
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

  if (location.pathname.startsWith("/store")) {
    return <StoreLayout />;
  }

  return <AdminLayout />;
}

export default App;
