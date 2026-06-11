import { useEffect, useState } from "react";

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    fetch("http://100.85.171.19:8000/dashboard")
      .then((res) => res.json())
      .then((data) => setDashboard(data))
      .catch((err) => console.error(err));
  }, []);

  if (!dashboard) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <>
      <h1>POS Dashboard</h1>

      <h2>Products</h2>
      <p>Total Products: {dashboard.products.product_count}</p>
      <p>Low Stock: {dashboard.products.low_stock_count}</p>

      <h2>Sales Today</h2>
      <p>Transactions: {dashboard.sales.today_sale_count}</p>
      <p>Revenue: ${(dashboard.sales.today_revenue_cents / 100).toFixed(2)}</p>
    </>
  );
}

export default Dashboard;