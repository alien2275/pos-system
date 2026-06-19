import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Checkout from "./pages/Checkout";
import Sales from "./pages/Sales";
import Store from "./pages/Store";


function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <nav style={{ marginBottom: "2rem" }}>
        <Link to="/">Dashboard</Link>{" | "}
        <Link to="/products">Products</Link>{" | "}
        <Link to="/inventory">Inventory</Link>{" | "}
        <Link to="/checkout">Checkout</Link>{" | "}
        <Link to="/sales">Sales</Link>{" | "}
        <Link to="/store">Store</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/store" element={<Store />} />
      </Routes>
    </div>
  );
}

export default App;
