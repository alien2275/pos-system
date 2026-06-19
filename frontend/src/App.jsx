import { Link, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Checkout from "./pages/Checkout";
import Sales from "./pages/Sales";
import Events from "./pages/Events";
import Store from "./pages/Store";
import StoreProducts from "./pages/StoreProducts";

function AdminLayout() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <nav style={{ marginBottom: "2rem" }}>
        <Link to="/">Dashboard</Link>{" | "}
        <Link to="/products">Products</Link>{" | "}
        <Link to="/inventory">Inventory</Link>{" | "}
        <Link to="/checkout">Checkout</Link>{" | "}
        <Link to="/sales">Sales</Link>{" | "}
        <Link to="/events">Events</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/events" element={<Events />} />
      </Routes>
    </div>
  );
}

function StoreLayout() {
  return (
    <div className="public-store-shell">
      <nav className="public-store-nav">
        <Link to="/store">sammyinthesky</Link>
        <Link to="/store/products">Products</Link>
      </nav>

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
