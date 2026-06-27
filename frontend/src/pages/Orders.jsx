import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../config";

function formatStatus(status) {
  if (status === "pending_packaging") return "Needs Packaging";
  if (status === "packaged") return "Packaged";
  if (status === "shipped") return "Shipped";
  return status;
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [trackingForms, setTrackingForms] = useState({});
  const [error, setError] = useState("");

  function loadOrders() {
    apiFetch("/online-orders")
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Orders failed to load");
        }

        setOrders(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Online orders are unavailable right now.");
      });
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function markPackaged(orderId) {
    const response = await apiFetch(`/online-orders/${orderId}/packaged`, {
      method: "PUT",
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Could not mark order packaged");
      return;
    }

    loadOrders();
  }

  function updateTrackingForm(orderId, field, value) {
    setTrackingForms({
      ...trackingForms,
      [orderId]: {
        carrier: "USPS",
        tracking_id: "",
        ...trackingForms[orderId],
        [field]: value,
      },
    });
  }

  async function markShipped(event, orderId) {
    event.preventDefault();

    const form = {
      carrier: "USPS",
      tracking_id: "",
      ...trackingForms[orderId],
    };

    const response = await apiFetch(`/online-orders/${orderId}/ship`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Could not mark order shipped");
      return;
    }

    setTrackingForms({
      ...trackingForms,
      [orderId]: { carrier: "USPS", tracking_id: "" },
    });
    loadOrders();
  }

  async function archiveOrder(orderId) {
    if (!confirm("Archive this shipped order? It will remain visible in Sales.")) {
      return;
    }

    const response = await apiFetch(`/online-orders/${orderId}/archive`, {
      method: "PUT",
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Could not archive order");
      return;
    }

    loadOrders();
  }

  const packagingOrders = orders.filter(
    (order) => order.status === "pending_packaging"
  );
  const shippingOrders = orders.filter((order) => order.status === "packaged");
  const shippedOrders = orders.filter((order) => order.status === "shipped");

  function renderOrder(order) {
    const trackingForm = {
      carrier: "USPS",
      tracking_id: "",
      ...trackingForms[order.id],
    };

    return (
      <article className="order-card" key={order.id}>
        <div className="section-heading">
          <div>
            <h3>Order {order.order_number || order.id}</h3>
            <p>{order.customer_name} - {order.customer_email}</p>
          </div>
          <span>{formatStatus(order.status)}</span>
        </div>

        <div className="order-card-grid">
          <div>
            <strong>Ship To</strong>
            <p>{order.shipping_name}</p>
            <p>{order.shipping_address_line1}</p>
            {order.shipping_address_line2 && (
              <p>{order.shipping_address_line2}</p>
            )}
            <p>
              {order.shipping_city}, {order.shipping_state}{" "}
              {order.shipping_postal_code}
            </p>
            <p>{order.shipping_country}</p>
          </div>

          <div>
            <strong>Items</strong>
            {order.items.map((item) => (
              <p key={item.id}>
                {item.quantity} x {item.product_name} - $
                {((item.price_cents * item.quantity) / 100).toFixed(2)}
              </p>
            ))}
            <p>Subtotal: ${((order.subtotal_cents || 0) / 100).toFixed(2)}</p>
            <p>Tax: ${((order.tax_cents || 0) / 100).toFixed(2)}</p>
            <p>Shipping: ${((order.shipping_cents || 0) / 100).toFixed(2)}</p>
            <p>
              <strong>Total: ${(order.total_cents / 100).toFixed(2)}</strong>
            </p>
          </div>
        </div>

        {order.status === "pending_packaging" && (
          <div className="button-row">
            <Link to={`/admin/orders/${order.id}`}>Details</Link>
            <button onClick={() => markPackaged(order.id)}>
              Mark Packaged
            </button>
          </div>
        )}

        {order.status === "packaged" && (
          <form
            className="inline-form"
            onSubmit={(event) => markShipped(event, order.id)}
          >
            <label>
              Carrier
              <select
                value={trackingForm.carrier}
                onChange={(event) =>
                  updateTrackingForm(order.id, "carrier", event.target.value)
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
                value={trackingForm.tracking_id}
                onChange={(event) =>
                  updateTrackingForm(order.id, "tracking_id", event.target.value)
                }
                required
              />
            </label>

            <button type="submit">Mark Shipped</button>
            <Link to={`/admin/orders/${order.id}`}>Details</Link>
          </form>
        )}

        {order.status === "shipped" && (
          <div className="button-row">
            <p>
              {order.carrier}: {order.tracking_id}
            </p>
            <button onClick={() => archiveOrder(order.id)}>
              Archive
            </button>
            <Link to={`/admin/orders/${order.id}`}>Details</Link>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Orders</h1>
          <p>Package online orders, then add tracking when they ship.</p>
        </div>
      </header>

      {error && <p>{error}</p>}

      <section className="admin-panel">
        <div className="section-heading">
          <h2>Needs Packaging</h2>
          <span>{packagingOrders.length} orders</span>
        </div>
        {packagingOrders.length === 0 ? (
          <p>No orders need packaging.</p>
        ) : (
          packagingOrders.map(renderOrder)
        )}
      </section>

      <section className="admin-panel">
        <div className="section-heading">
          <h2>Ready To Ship</h2>
          <span>{shippingOrders.length} orders</span>
        </div>
        {shippingOrders.length === 0 ? (
          <p>No packaged orders are waiting for tracking.</p>
        ) : (
          shippingOrders.map(renderOrder)
        )}
      </section>

      <section className="admin-panel">
        <div className="section-heading">
          <h2>Shipped</h2>
          <span>{shippedOrders.length} orders</span>
        </div>
        {shippedOrders.length === 0 ? (
          <p>No shipped orders yet.</p>
        ) : (
          shippedOrders.map(renderOrder)
        )}
      </section>
    </div>
  );
}

export default Orders;
