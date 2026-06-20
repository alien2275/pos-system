import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "../config";

function calculateRoundingAdjustment(totalCents, roundingMode) {
  if (roundingMode === "nearest_0_05") {
    return calculateNearestIncrementAdjustment(totalCents, 5);
  }

  if (roundingMode === "nearest_0_10") {
    return calculateNearestIncrementAdjustment(totalCents, 10);
  }

  if (roundingMode === "dollar_threshold_0_10") {
    const cents = totalCents % 100;
    if (cents === 0) return 0;
    return cents <= 10 ? -cents : 100 - cents;
  }

  return 0;
}

function calculateNearestIncrementAdjustment(totalCents, increment) {
  const remainder = totalCents % increment;
  if (remainder === 0) return 0;
  return remainder < increment / 2 ? -remainder : increment - remainder;
}

function formatSignedMoney(cents) {
  const sign = cents > 0 ? "+" : "-";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function Checkout() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [lastSale, setLastSale] = useState(null);
  const [settings, setSettings] = useState({
    tax_state: "MD",
    tax_rate_percent: "6.00",
    flat_shipping_cents: 0,
    store_url: "http://100.85.171.19:5173/store",
    pos_rounding_mode: "none",
  });

  useEffect(() => {
    apiFetch("/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error(err));
  }, []);

  async function addBarcode(event) {
    event.preventDefault();

    try {
      const response = await apiFetch(`/products/barcode/${barcode}`);

      if (!response.ok) {
        alert("Product not found");
        return;
      }

      const product = await response.json();
      const existing = cart.find((item) => item.id === product.id);

      if (existing) {
        setCart(
          cart.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        setCart([...cart, { ...product, quantity: 1 }]);
      }

      setBarcode("");
    } catch (error) {
      console.error(error);
      alert("Could not add product");
    }
  }

  function increaseQuantity(productId) {
    setCart(
      cart.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQuantity(productId) {
    setCart(
      cart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId) {
    setCart(cart.filter((item) => item.id !== productId));
  }

  function cancelSale() {
    if (cart.length > 0 && !confirm("Cancel this sale and clear the cart?")) {
      return;
    }

    setCart([]);
    setCustomerName("");
    setCashReceived("");
    setPaymentType("cash");
    setBarcode("");
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0
  );
  const taxRate = Number(settings.tax_rate_percent || 0);
  const tax = Math.round(subtotal * (taxRate / 100));
  const unroundedTotal = subtotal + tax;
  const roundingAdjustment = calculateRoundingAdjustment(
    unroundedTotal,
    settings.pos_rounding_mode
  );
  const total = unroundedTotal + roundingAdjustment;

  const changeDue =
    paymentType === "cash"
      ? Math.max(Number(cashReceived || 0) - total / 100, 0)
      : 0;

  async function completeSale() {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (paymentType === "cash") {
      const cashReceivedCents = Math.round(Number(cashReceived) * 100);

      if (cashReceivedCents < total) {
        alert("Cash received is less than the total");
        return;
      }
    }

    const response = await apiFetch("/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_name: customerName || null,
        payment_type: paymentType,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Sale failed");
      return;
    }

    setLastSale({
      id: data.id,
      order_number: data.order_number,
      customer_name: data.customer_name,
      subtotal_cents: data.subtotal_cents,
      tax_cents: data.tax_cents,
      tax_rate_percent: data.tax_rate_percent,
      rounding_adjustment_cents: data.rounding_adjustment_cents,
      total_cents: data.total_cents,
      items: [...cart],
      paymentType,
      cashReceived,
      changeDue,
    });

    setCart([]);
    setBarcode("");
    setCustomerName("");
    setCashReceived("");
    setPaymentType("cash");
  }

  function emailReceipt() {
    if (!lastSale) {
      return;
    }

    const subject = encodeURIComponent(
      `Receipt for Order ${lastSale.order_number || lastSale.id}`
    );

    const itemLines = lastSale.items
      .map(
        (item) =>
          `${item.quantity}x ${item.name} - $${(
            (item.price_cents * item.quantity) /
            100
          ).toFixed(2)}`
      )
      .join("\n");

    const body = encodeURIComponent(
      `Thank you for your purchase!\n\n` +
        `Order ${lastSale.order_number || lastSale.id}\n\n` +
        itemLines +
        `\n\nSubtotal: $${(lastSale.subtotal_cents / 100).toFixed(2)}\n` +
        `Tax: $${(lastSale.tax_cents / 100).toFixed(2)}\n` +
        (Number(lastSale.rounding_adjustment_cents || 0) !== 0
          ? `Rounding: ${formatSignedMoney(
              lastSale.rounding_adjustment_cents
            )}\n`
          : "") +
        `Total: $${(lastSale.total_cents / 100).toFixed(2)}\n` +
        `Payment: ${
          lastSale.paymentType === "cash" ? "Cash" : "Card / Other"
        }\n` +
        (lastSale.paymentType === "cash"
          ? `Cash Received: $${Number(lastSale.cashReceived || 0).toFixed(
              2
            )}\nChange Due: $${lastSale.changeDue.toFixed(2)}\n`
          : "") +
        `\nSee upcoming events and shop online:\n${settings.store_url}\n`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="admin-page checkout-page">
      {!lastSale && (
        <header className="admin-page-header">
          <div>
            <h1>Checkout</h1>
            <p>Scan items, take payment, and generate a receipt.</p>
          </div>
        </header>
      )}

      {lastSale && (
        <section className="admin-panel receipt">
          <h2 className="no-print">Receipt</h2>

          <div className="button-row receipt-actions no-print">
            <button onClick={() => window.print()}>Print Receipt</button>
            <button onClick={emailReceipt}>Email Receipt</button>

            <button
              onClick={() => {
                setLastSale(null);
                setBarcode("");
              }}
            >
              New Sale
            </button>
          </div>

          <h3>sammyinthesky</h3>

          <p className="receipt-tagline">Handmade Jewelry & Crafts</p>

          <hr />
          <div className="receipt-meta">
            <p>Order {lastSale.order_number || lastSale.id}</p>
            {lastSale.customer_name && <p>Customer: {lastSale.customer_name}</p>}
          </div>

          <div className="receipt-lines">
            {lastSale.items.map((item) => (
              <div key={item.id}>
                <span>
                  {item.quantity} x {item.name}
                </span>

                <span>
                  ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}

            <hr />

            <div>
              <span>Subtotal</span>
              <span>${(lastSale.subtotal_cents / 100).toFixed(2)}</span>
            </div>

            <div>
              <span>Tax</span>
              <span>${(lastSale.tax_cents / 100).toFixed(2)}</span>
            </div>

            {Number(lastSale.rounding_adjustment_cents || 0) !== 0 && (
              <div>
                <span>Rounding</span>
                <span>
                  {formatSignedMoney(lastSale.rounding_adjustment_cents)}
                </span>
              </div>
            )}

            <div className="receipt-total">
              <span>TOTAL</span>

              <span>
                ${(lastSale.total_cents / 100).toFixed(2)}
              </span>
            </div>

            <hr />
          </div>

          <p>
            Payment: {lastSale.paymentType === "cash" ? "Cash" : "Card / Other"}
          </p>

          {lastSale.paymentType === "cash" && (
            <>
              <p>
                Cash Received: ${Number(lastSale.cashReceived || 0).toFixed(2)}
              </p>
              <p>Change Due: ${lastSale.changeDue.toFixed(2)}</p>
            </>
          )}

          {settings.store_url && (
            <div className="receipt-qr">
              <img
                src={`${API_URL}/settings/store-qr.png?v=${encodeURIComponent(
                  settings.store_url
                )}`}
                alt="Store QR code"
              />
              <p>Scan for upcoming events and online shopping.</p>
              <small>{settings.store_url}</small>
            </div>
          )}

        </section>
      )}

      {!lastSale && (
        <div className="checkout-layout">
          <section className="admin-panel">
            <h2>Add Item</h2>
            <form className="inline-form checkout-scan-form" onSubmit={addBarcode}>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                autoFocus
              />

              <button type="submit">Add</button>
            </form>

            <h2>Cart</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Qty</th>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id}>
                      <td>{item.quantity}</td>
                      <td>{item.name}</td>
                      <td>${(item.price_cents / 100).toFixed(2)}</td>
                      <td>${((item.price_cents * item.quantity) / 100).toFixed(2)}</td>
                      <td>
                        <div className="button-row compact checkout-item-actions">
                          <button
                            onClick={() => decreaseQuantity(item.id)}
                            aria-label={`Decrease ${item.name}`}
                          >
                            -
                          </button>
                          <button
                            onClick={() => increaseQuantity(item.id)}
                            aria-label={`Increase ${item.name}`}
                          >
                            +
                          </button>
                          <button onClick={() => removeItem(item.id)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="admin-panel checkout-summary">
            <label>
              Customer Name
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
              />
            </label>

            <span>Total</span>
            <strong>${(total / 100).toFixed(2)}</strong>
            <p>Subtotal: ${(subtotal / 100).toFixed(2)}</p>
            <p>
              Tax ({settings.tax_state} {taxRate.toFixed(2)}%): ${(tax / 100).toFixed(2)}
            </p>
            {roundingAdjustment !== 0 && (
              <p>Rounding: {formatSignedMoney(roundingAdjustment)}</p>
            )}

            <label>
              Payment Type
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card / PayPal / Other</option>
              </select>
            </label>

            {paymentType === "cash" && (
              <>
                <label>
                  Cash Received
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="20.00"
                  />
                </label>

                <p>Change Due: ${changeDue.toFixed(2)}</p>
              </>
            )}

            <button className="checkout-complete-button" onClick={completeSale}>
              Complete Sale
            </button>
            <button type="button" onClick={cancelSale}>
              Cancel Sale
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

export default Checkout;
