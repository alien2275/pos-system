import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../config";

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    apiFetch("/dashboard")
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

        <article className="metric-card">
          <span>Online Orders</span>
          <strong>{dashboard.online_orders?.pending_fulfillment_count || 0}</strong>
          <p>Need packaging or shipping</p>
        </article>
      </section>

      <section className="admin-panel">
        <div className="section-heading">
          <h2>Low Stock Actions</h2>
          <Link to="/inventory">Open Inventory</Link>
        </div>

        {!dashboard.low_stock_items || dashboard.low_stock_items.length === 0 ? (
          <p>No low stock items right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.low_stock_items.map((product) => (
                  <tr key={product.id}>
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.quantity_on_hand}</td>
                    <td>{product.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
