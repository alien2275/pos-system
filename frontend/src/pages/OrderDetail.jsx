import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_URL } from "../config";

function formatStatus(status) {
  if (status === "pending_packaging") return "Needs Packaging";
  if (status === "packaged") return "Ready To Ship";
  if (status === "shipped") return "Shipped";
  return status;
}

function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState({
    carrier: "USPS",
    tracking_id: "",
  });
  const [error, setError] = useState("");

  function loadOrder() {
    fetch(`${API_URL}/online-orders/${orderId}`)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Order failed to load");
        }

        setOrder(data);
        setTracking({
          carrier: data.carrier || "USPS",
          tracking_id: data.tracking_id || "",
        });
      })
      .catch((err) => {
        console.error(err);
        setError("Order is unavailable right now.");
      });
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function markPackaged() {
    const response = await fetch(`${API_URL}/online-orders/${orderId}/packaged`, {
      method: "PUT",
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Could not mark order packaged");
      return;
    }

    loadOrder();
  }

  async function markShipped(event) {
    event.preventDefault();

    const response = await fetch(`${API_URL}/online-orders/${orderId}/ship`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tracking),
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Could not mark order shipped");
      return;
    }

    loadOrder();
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!order) {
    return <p>Loading order...</p>;
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header no-print">
        <div>
          <h1>Order {order.order_number || order.id}</h1>
          <p>Review, pack, print, and ship this online order.</p>
        </div>
        <Link to="/orders">Back To Orders</Link>
      </header>

      <section className="admin-panel no-print">
        <div className="section-heading">
          <h2>Workflow</h2>
          <span>{formatStatus(order.status)}</span>
        </div>

        <div className="order-timeline">
          <div className={order.created_at ? "active" : ""}>
            <strong>Placed</strong>
            <span>{order.created_at}</span>
          </div>
          <div className={order.packaged_at ? "active" : ""}>
            <strong>Packaged</strong>
            <span>{order.packaged_at || "Not packaged yet"}</span>
          </div>
          <div className={order.shipped_at ? "active" : ""}>
            <strong>Shipped</strong>
            <span>{order.shipped_at || "Not shipped yet"}</span>
          </div>
        </div>

        <div className="button-row">
          {order.status === "pending_packaging" && (
            <button onClick={markPackaged}>Mark Packaged</button>
          )}
          <button onClick={() => window.print()}>Print Packing Slip</button>
        </div>

        {order.status === "packaged" && (
          <form className="inline-form" onSubmit={markShipped}>
            <label>
              Carrier
              <select
                value={tracking.carrier}
                onChange={(event) =>
                  setTracking({ ...tracking, carrier: event.target.value })
                }
              >
                <option value="USPS">USPS</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Tracking ID
              <input
                value={tracking.tracking_id}
                onChange={(event) =>
                  setTracking({ ...tracking, tracking_id: event.target.value })
                }
                required
              />
            </label>

            <button type="submit">Mark Shipped</button>
          </form>
        )}
      </section>

      <section className="admin-panel packing-slip">
        <div className="section-heading">
          <h2>Packing Slip</h2>
          <span>{order.order_number || order.id}</span>
        </div>

        <div className="order-card-grid">
          <div>
            <strong>Customer</strong>
            <p>{order.customer_name}</p>
            <p>{order.customer_email}</p>
          </div>

          <div>
            <strong>Ship To</strong>
            <p>{order.shipping_name}</p>
            <p>{order.shipping_address_line1}</p>
            {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
            <p>
              {order.shipping_city}, {order.shipping_state}{" "}
              {order.shipping_postal_code}
            </p>
            <p>{order.shipping_country}</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
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

        <div className="section-heading">
          <p>Status: {formatStatus(order.status)}</p>
          <div className="order-total-stack">
            <span>
              Subtotal: ${((order.subtotal_cents || 0) / 100).toFixed(2)}
            </span>
            <span>Tax: ${((order.tax_cents || 0) / 100).toFixed(2)}</span>
            <span>
              Shipping: ${((order.shipping_cents || 0) / 100).toFixed(2)}
            </span>
            <strong>${(order.total_cents / 100).toFixed(2)}</strong>
          </div>
        </div>

        {order.carrier && order.tracking_id && (
          <p>
            Tracking: {order.carrier} {order.tracking_id}
          </p>
        )}
      </section>
    </div>
  );
}

export default OrderDetail;
