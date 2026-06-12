import { useState } from "react";

const API_URL = "http://100.85.171.19:8000";

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
    <>
      <h1>Checkout</h1>

      {lastSale && (
        <div
          Classname="receipt"
          style={{
            border: "1px solid #ccc",
            padding: "1rem",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ textAlign: "center" }}>
            sammyinthesky
          </h3>

          <p style={{ textAlign: "center" }}>
            Handmade Jewlery & Crafts
          </p>

          <hr />
          <p>Sale #{lastSale.id}</p>

<div
  style={{
    textAlign: "left",
    maxWidth: "250px",
    margin: "0 auto",
    fontFamily: "monospace",
  }}
>
{lastSale.items.map((item) => (
  <div
    key={item.id}
    style={{
      display: "flex",
      justifyContent: "space-between",
    }}
  >
    <span>
      {item.quantity} x {item.name}
    </span>

    <span>
      ${((item.price_cents * item.quantity) / 100).toFixed(2)}
    </span>
  </div>
))}

  <hr />

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "bold",
  }}
>
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
      )}

      {!lastSale && (
        <>
          <form onSubmit={addBarcode}>
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode"
              autoFocus
            />

            <button type="submit">Add</button>
          </form>

          <h2>Cart</h2>

          <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
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
                    <button onClick={() => decreaseQuantity(item.id)}>-</button>
                    <button onClick={() => increaseQuantity(item.id)}>+</button>
                    <button onClick={() => removeItem(item.id)}>X</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Total: ${(total / 100).toFixed(2)}</h2>

          <h2>Payment</h2>

          <label>
            Payment Type{" "}
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card / PayPal / Other</option>
            </select>
          </label>

          {paymentType === "cash" && (
            <div style={{ marginTop: "1rem" }}>
              <label>
                Cash Received ($){" "}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="20.00"
                />
              </label>

              <h3>Change Due: ${changeDue.toFixed(2)}</h3>
            </div>
          )}

          <button onClick={completeSale}>Complete Sale</button>
        </>
      )}
    </>
  );
}

export default Checkout;