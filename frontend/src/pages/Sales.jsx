import { useEffect, useState } from "react";

const API_URL = "http://100.85.171.19:8000";

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
    <>
      <h1>Sales History</h1>

      <form onSubmit={searchRange}>
        <label>
          Start Date{" "}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        {" "}

        <label>
          End Date{" "}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        {" "}

        <button type="submit">Search</button>
      </form>

      {salesData && (
        <>
          <h2>Summary</h2>

          <p>Sales: {salesData.summary.sale_count}</p>

          <p>
            Revenue: $
            {(salesData.summary.total_cents / 100).toFixed(2)}
          </p>

          <h2>Transactions</h2>

          <table
            border="1"
            cellPadding="8"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th>Sale ID</th>
                <th>Date</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {salesData.sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
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
        </>
      )}

      {selectedSale && (
        <>
          <h2>Sale #{selectedSale.sale.id} Details</h2>

          <p>Date: {selectedSale.sale.created_at}</p>

          <p>
            Total: $
            {(selectedSale.sale.total_cents / 100).toFixed(2)}
          </p>

          <table
            border="1"
            cellPadding="8"
            style={{ borderCollapse: "collapse" }}
          >
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
                    $
                    {(
                      (item.price_cents * item.quantity) /
                      100
                    ).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

export default Sales;