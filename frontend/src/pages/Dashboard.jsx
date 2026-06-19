import { useEffect, useState } from "react";
import { API_URL } from "../config";

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then((res) => res.json())
      .then((data) => setDashboard(data))
      .catch((err) => console.error(err));
  }, []);

  if (!dashboard) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Today at a glance.</p>
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Products</span>
          <strong>{dashboard.products.product_count}</strong>
          <p>Total active catalog items</p>
        </article>

        <article className="metric-card">
          <span>Low Stock</span>
          <strong>{dashboard.products.low_stock_count}</strong>
          <p>Items at or below reorder level</p>
        </article>

        <article className="metric-card">
          <span>Transactions</span>
          <strong>{dashboard.sales.today_sale_count}</strong>
          <p>Sales completed today</p>
        </article>

        <article className="metric-card">
          <span>Revenue</span>
          <strong>${(dashboard.sales.today_revenue_cents / 100).toFixed(2)}</strong>
          <p>Total sales today</p>
        </article>
      </section>
    </div>
  );
}

export default Dashboard;
