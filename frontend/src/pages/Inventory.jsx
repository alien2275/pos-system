import { useEffect, useState } from "react";
import { apiFetch } from "../config";

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
    apiFetch("/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }

  function loadLowStock() {
    apiFetch("/inventory/low-stock")
      .then((res) => res.json())
      .then((data) => setLowStock(data))
      .catch((err) => console.error(err));
  }

  function loadHistory(productId) {
    if (!productId) return;

    apiFetch(`/inventory/history/${productId}`)
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

    apiFetch("/inventory/adjust", {
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
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Inventory</h1>
          <p>Review low stock, adjust counts, and inspect item history.</p>
        </div>
      </header>

      <section className="admin-panel">
        <div className="section-heading">
          <h2>Low Stock</h2>
          <span>{lowStock.length} items</span>
        </div>

        {lowStock.length === 0 ? (
          <p>No low stock items right now.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
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
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Adjust Inventory</h2>

        <form className="admin-form" onSubmit={submitAdjustment}>
          <div className="form-grid">
            <label className="form-full">
              Product
              <select value={selectedProductId} onChange={handleProductChange}>
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - Qty: {product.quantity_on_hand}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantity Change
              <input
                name="quantity_change"
                type="number"
                value={adjustment.quantity_change}
                onChange={handleAdjustmentChange}
              />
            </label>

            <label>
              Reason
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
            </label>

            <label className="form-full">
              Notes
              <input
                name="notes"
                value={adjustment.notes}
                onChange={handleAdjustmentChange}
              />
            </label>
          </div>

          {selectedProduct && (
            <div className="selected-summary">
              <span>Current Qty: {selectedProduct.quantity_on_hand}</span>
              <span>Reorder Level: {selectedProduct.reorder_level}</span>
            </div>
          )}

          <div className="button-row">
            <button type="submit">Apply Adjustment</button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Inventory History</h2>

        <div className="table-wrap">
          <table className="admin-table">
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
        </div>
      </section>
    </div>
  );
}

export default Inventory;
