import { useState } from "react";
import { API_URL } from "../config";

function Checkout() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [lastSale, setLastSale] = useState(null);

  async function addBarcode(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${API_URL}/products/barcode/${barcode}`);

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

  const total = cart.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0
  );

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

    const response = await fetch(`${API_URL}/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
      total_cents: data.total_cents,
      items: [...cart],
      paymentType,
      cashReceived,
      changeDue,
    });

    setCart([]);
    setBarcode("");
    setCashReceived("");
    setPaymentType("cash");
  }

  function emailReceipt() {
    if (!lastSale) {
      return;
    }

    const subject = encodeURIComponent(`Receipt for Sale #${lastSale.id}`);

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
        `Sale #${lastSale.id}\n\n` +
        itemLines +
        `\n\nTotal: $${(lastSale.total_cents / 100).toFixed(2)}\n` +
        `Payment: ${
          lastSale.paymentType === "cash" ? "Cash" : "Card / Other"
        }\n` +
        (lastSale.paymentType === "cash"
          ? `Cash Received: $${Number(lastSale.cashReceived || 0).toFixed(
              2
            )}\nChange Due: $${lastSale.changeDue.toFixed(2)}\n`
          : "")
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="admin-page checkout-page">
      <header className="admin-page-header">
        <div>
          <h1>Checkout</h1>
          <p>Scan items, take payment, and generate a receipt.</p>
        </div>
      </header>

      {lastSale && (
        <section className="admin-panel receipt">
          <h2>Receipt</h2>
          <h3>sammyinthesky</h3>

          <p>Handmade Jewelry & Crafts</p>

          <hr />
          <p>Sale #{lastSale.id}</p>

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

          <div className="button-row">
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
        </section>
      )}

      {!lastSale && (
        <div className="checkout-layout">
          <section className="admin-panel">
            <h2>Add Item</h2>
            <form className="inline-form" onSubmit={addBarcode}>
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
                        <div className="button-row compact">
                          <button onClick={() => decreaseQuantity(item.id)}>-</button>
                          <button onClick={() => increaseQuantity(item.id)}>+</button>
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
            <span>Total</span>
            <strong>${(total / 100).toFixed(2)}</strong>

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

            <button onClick={completeSale}>Complete Sale</button>
          </aside>
        </div>
      )}
    </div>
  );
}

export default Checkout;
