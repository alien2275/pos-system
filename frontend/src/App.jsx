import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";

function App() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <nav style={{ marginBottom: "2rem" }}>
        <Link to="/" style={{ marginRight: "1rem" }}>Dashboard</Link>
        <Link to="/products">Products</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
      </Routes>
    </div>
  );
}

export default App;