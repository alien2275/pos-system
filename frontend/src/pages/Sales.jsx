import { useEffect, useState } from "react";
import { API_URL } from "../config";

function Sales() {
  const [salesData, setSalesData] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

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

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Sales</h1>
          <p>Search transactions and review receipt details.</p>
        </div>
      </header>

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
                    <th>Sale ID</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {salesData.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.id}</td>
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
            <h2>Sale #{selectedSale.sale.id}</h2>
            <span>${(selectedSale.sale.total_cents / 100).toFixed(2)}</span>
          </div>

          <p>Date: {selectedSale.sale.created_at}</p>

          {selectedSale.online_order && (
            <div className="selected-summary">
              <span>Online Order #{selectedSale.online_order.id}</span>
              <span>Status: {selectedSale.online_order.status}</span>
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
        </section>
      )}
    </div>
  );
}

export default Sales;
