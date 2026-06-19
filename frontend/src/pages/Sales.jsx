import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config";

function Sales() {
  const [salesData, setSalesData] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [searchField, setSearchField] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadSales(start, end) {
    const response = await fetch(
      `${API_URL}/sales/range?start_date=${start}&end_date=${end}`
    );

    const data = await response.json();

    setSalesData(data);
    setSelectedSale(null);
  }

  async function loadSaleDetails(saleId) {
    const response = await fetch(`${API_URL}/sales/${saleId}`);
    const data = await response.json();

    setSelectedSale(data);
  }

  useEffect(() => {
    loadSales(startDate, endDate);
  }, []);

  function searchRange(event) {
    event.preventDefault();
    loadSales(startDate, endDate);
  }

  async function searchOrders(event) {
    event.preventDefault();

    if (!searchQuery.trim()) {
      alert("Enter something to search for");
      return;
    }

    const response = await fetch(
      `${API_URL}/sales/search?field=${encodeURIComponent(
        searchField
      )}&query=${encodeURIComponent(searchQuery)}`
    );
    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Search failed");
      return;
    }

    setSalesData(data);
    setSelectedSale(null);
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Sales</h1>
          <p>Search transactions and review receipt details.</p>
        </div>
      </header>

      <section className="admin-panel">
        <h2>Find Order</h2>

        <form className="inline-form" onSubmit={searchOrders}>
          <label>
            Search By
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
            >
              <option value="all">All</option>
              <option value="order_number">Order Number</option>
              <option value="customer">Customer</option>
              <option value="tracking">Tracking</option>
              <option value="type">Type</option>
              <option value="product">Product</option>
            </select>
          </label>

          <label>
            Search
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Order code, name, tracking, product..."
            />
          </label>

          <button type="submit">Search</button>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Date Range</h2>

        <form className="inline-form" onSubmit={searchRange}>
          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <button type="submit">Search</button>
        </form>
      </section>

      {salesData && (
        <>
          <section className="metric-grid compact-metrics">
            <article className="metric-card">
              <span>Sales</span>
              <strong>{salesData.summary.sale_count}</strong>
              <p>Transactions in range</p>
            </article>

            <article className="metric-card">
              <span>Revenue</span>
              <strong>${(salesData.summary.total_cents / 100).toFixed(2)}</strong>
              <p>Total for selected dates</p>
            </article>
          </section>

          <section className="admin-panel">
            <h2>Transactions</h2>

            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {salesData.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.order_number || sale.id}</td>
                      <td>{sale.online_order_id ? "Online" : "POS"}</td>
                      <td>{sale.created_at}</td>
                      <td>${(sale.total_cents / 100).toFixed(2)}</td>
                      <td>
                        <button onClick={() => loadSaleDetails(sale.id)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {selectedSale && (
        <section className="admin-panel">
          <div className="section-heading">
            <h2>Order {selectedSale.sale.order_number || selectedSale.sale.id}</h2>
            <span>${(selectedSale.sale.total_cents / 100).toFixed(2)}</span>
          </div>

          <p>Date: {selectedSale.sale.created_at}</p>
          {selectedSale.sale.customer_name && (
            <p>Customer: {selectedSale.sale.customer_name}</p>
          )}

          {selectedSale.online_order && (
            <div className="selected-summary">
              <span>Online Order #{selectedSale.online_order.id}</span>
              <span>Status: {selectedSale.online_order.status}</span>
              <Link to={`/orders/${selectedSale.online_order.id}`}>
                Order Details
              </Link>
              {selectedSale.online_order.carrier &&
                selectedSale.online_order.tracking_id && (
                  <span>
                    {selectedSale.online_order.carrier}:{" "}
                    {selectedSale.online_order.tracking_id}
                  </span>
                )}
            </div>
          )}

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price Each</th>
                  <th>Line Total</th>
                </tr>
              </thead>

              <tbody>
                {selectedSale.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>${(item.price_cents / 100).toFixed(2)}</td>
                    <td>
                      ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="selected-summary">
            <span>
              Subtotal: $
              {((selectedSale.sale.subtotal_cents || selectedSale.sale.total_cents) / 100).toFixed(2)}
            </span>
            <span>
              Tax: ${((selectedSale.sale.tax_cents || 0) / 100).toFixed(2)}
            </span>
            <span>
              Total: ${(selectedSale.sale.total_cents / 100).toFixed(2)}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

export default Sales;
