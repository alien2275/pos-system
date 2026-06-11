import { useEffect, useState } from "react";

const API_URL = "http://100.85.171.19:8000";

function Inventory() {
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [history, setHistory] = useState([]);
  const [adjustment, setAdjustment] = useState({
    quantity_change: 0,
    reason: "Adjustment",
    notes: "",
  });

  function loadProducts() {
    fetch(`${API_URL}/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }

  function loadLowStock() {
    fetch(`${API_URL}/inventory/low-stock`)
      .then((res) => res.json())
      .then((data) => setLowStock(data))
      .catch((err) => console.error(err));
  }

  function loadHistory(productId) {
    if (!productId) return;

    fetch(`${API_URL}/inventory/history/${productId}`)
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    loadProducts();
    loadLowStock();
  }, []);

  function handleProductChange(event) {
    const productId = event.target.value;
    setSelectedProductId(productId);
    loadHistory(productId);
  }

  function handleAdjustmentChange(event) {
    const { name, value } = event.target;

    setAdjustment({
      ...adjustment,
      [name]: name === "quantity_change" ? Number(value) : value,
    });
  }

  function submitAdjustment(event) {
    event.preventDefault();

    if (!selectedProductId) {
      alert("Select a product first");
      return;
    }

    fetch(`${API_URL}/inventory/adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: Number(selectedProductId),
        quantity_change: adjustment.quantity_change,
        reason: adjustment.reason,
        notes: adjustment.notes,
      }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          alert(data.detail || "Inventory adjustment failed");
          return;
        }

        setAdjustment({
          quantity_change: 0,
          reason: "Adjustment",
          notes: "",
        });

        loadProducts();
        loadLowStock();
        loadHistory(selectedProductId);
      })
      .catch((err) => {
        console.error(err);
        alert("Inventory adjustment failed");
      });
  }

  const selectedProduct = products.find(
    (product) => product.id === Number(selectedProductId)
  );

  return (
    <>
      <h1>Inventory</h1>

      <h2>Low Stock</h2>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Qty</th>
            <th>Reorder Level</th>
          </tr>
        </thead>
        <tbody>
          {lowStock.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.quantity_on_hand}</td>
              <td>{product.reorder_level}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Adjust Inventory</h2>

      <form onSubmit={submitAdjustment}>
        <select value={selectedProductId} onChange={handleProductChange}>
          <option value="">Select Product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} — Qty: {product.quantity_on_hand}
            </option>
          ))}
        </select>

        {selectedProduct && (
          <p>
            Current Qty: {selectedProduct.quantity_on_hand} | Reorder Level:{" "}
            {selectedProduct.reorder_level}
          </p>
        )}

        <input
          name="quantity_change"
          type="number"
          value={adjustment.quantity_change}
          onChange={handleAdjustmentChange}
          placeholder="Quantity Change"
        />

        <select
          name="reason"
          value={adjustment.reason}
          onChange={handleAdjustmentChange}
        >
          <option value="Shipment">Shipment</option>
          <option value="Return">Return</option>
          <option value="Damage">Damage</option>
          <option value="Adjustment">Adjustment</option>
          <option value="Transfer">Transfer</option>
        </select>

        <input
          name="notes"
          placeholder="Notes"
          value={adjustment.notes}
          onChange={handleAdjustmentChange}
        />

        <button type="submit">Apply Adjustment</button>
      </form>

      <h2>Inventory History</h2>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Change</th>
            <th>Reason</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.created_at}</td>
              <td>{entry.quantity_change}</td>
              <td>{entry.reason}</td>
              <td>{entry.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default Inventory;