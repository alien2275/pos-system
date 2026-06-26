import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, apiFetch } from "../config";

function Sales() {
  const [salesData, setSalesData] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);

  function localDateInputValue(value = new Date()) {
    const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().split("T")[0];
  }

  const today = localDateInputValue();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [searchField, setSearchField] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  function formatSignedMoney(cents) {
    const sign = cents > 0 ? "+" : "-";
    return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
  }

  async function loadSales(start, end) {
    const response = await apiFetch(
      `/sales/range?start_date=${start}&end_date=${end}`
    );

    const data = await response.json();

    setSalesData(data);
    setSelectedSale(null);
  }

  async function loadSaleDetails(saleId) {
    const response = await apiFetch(`/sales/${saleId}`);
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

    const response = await apiFetch(
      `/sales/search?field=${encodeURIComponent(
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(cents) {
    return `$${(Number(cents || 0) / 100).toFixed(2)}`;
  }

  function saleTypeLabel(sale, onlineOrder = null) {
    if (sale.sale_type) {
      return sale.sale_type;
    }

    if (onlineOrder || sale.online_order_id) {
      return "Online";
    }

    return sale.sale_source === "mobile_pos" ? "Mobile POS" : "POS";
  }

  function printSaleReceipt(mode) {
    if (!selectedSale) {
      return;
    }

    const isThermal = mode === "thermal";
    const sale = selectedSale.sale;
    const onlineOrder = selectedSale.online_order;
    const orderNumber = sale.order_number || sale.id;
    const customerName =
      sale.customer_name || onlineOrder?.customer_name || "";
    const subtotalCents = sale.subtotal_cents || sale.total_cents;
    const paymentType = sale.payment_type || (onlineOrder ? "online" : "pos");
    const receiptTitle = `Order ${orderNumber}`;

    const itemRows = selectedSale.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.quantity)} x ${escapeHtml(item.name)}</td>
            <td>${formatMoney(item.price_cents)}</td>
            <td>${formatMoney(item.price_cents * item.quantity)}</td>
          </tr>
        `
      )
      .join("");

    const trackingLine =
      onlineOrder?.carrier && onlineOrder?.tracking_id
        ? `<p><strong>Tracking:</strong> ${escapeHtml(
            onlineOrder.carrier
          )} ${escapeHtml(onlineOrder.tracking_id)}</p>`
        : "";

    const roundingLine =
      Number(sale.rounding_adjustment_cents || 0) !== 0
        ? `<div><span>Rounding</span><strong>${formatSignedMoney(
            sale.rounding_adjustment_cents
          )}</strong></div>`
        : "";
    const taxLine =
      Number(sale.tax_cents || 0) > 0
        ? `<div><span>Tax</span><strong>${formatMoney(
            sale.tax_cents
          )}</strong></div>`
        : "";

    const printWindow = window.open("", "_blank", "width=520,height=760");

    if (!printWindow) {
      alert("Allow pop-ups to print the receipt.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(receiptTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #fff;
              color: #111;
              font-family: Arial, sans-serif;
              font-size: ${isThermal ? "10px" : "13px"};
              line-height: 1.35;
            }
            .receipt {
              width: ${isThermal ? "58mm" : "100%"};
              max-width: ${isThermal ? "58mm" : "760px"};
              margin: ${isThermal ? "0" : "24px auto"};
              padding: ${isThermal ? "2mm" : "28px"};
              border: ${isThermal ? "0" : "1px solid #ddd"};
            }
            h1, h2, p { margin: 0; }
            h1 {
              text-align: center;
              font-size: ${isThermal ? "16px" : "26px"};
              margin-bottom: 4px;
            }
            h2 {
              text-align: center;
              font-size: ${isThermal ? "12px" : "18px"};
              margin-bottom: 12px;
            }
            .tagline, .qr-copy {
              text-align: center;
              color: #333;
              margin-bottom: 10px;
            }
            .meta {
              border-top: 1px solid #999;
              border-bottom: 1px solid #999;
              padding: 8px 0;
              margin: 10px 0;
            }
            .meta p { margin: 2px 0; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            th {
              text-align: left;
              border-bottom: 1px solid #999;
              padding: 4px 0;
            }
            td {
              border-bottom: 1px solid #ddd;
              padding: 5px 0;
              vertical-align: top;
            }
            th:nth-child(2),
            th:nth-child(3),
            td:nth-child(2),
            td:nth-child(3) {
              text-align: right;
            }
            .totals {
              border-top: 1px solid #999;
              padding-top: 8px;
              margin-top: 8px;
            }
            .totals div {
              display: flex;
              justify-content: space-between;
              gap: 10px;
              margin: 3px 0;
            }
            .grand-total {
              font-size: ${isThermal ? "13px" : "18px"};
              border-top: 1px solid #999;
              padding-top: 6px;
              margin-top: 6px;
            }
            .qr {
              text-align: center;
              margin-top: 16px;
            }
            .qr img {
              width: ${isThermal ? "34mm" : "120px"};
              height: ${isThermal ? "34mm" : "120px"};
            }
            .qr small {
              display: block;
              overflow-wrap: anywhere;
              margin-top: 4px;
            }
            @page {
              size: ${isThermal ? "58mm auto" : "A4"};
              margin: ${isThermal ? "2mm" : "14mm"};
            }
            @media print {
              body { margin: 0; }
              .receipt {
                margin: 0 auto;
                border: 0;
              }
            }
          </style>
        </head>
        <body>
          <main class="receipt">
            <h1>sammyinthesky</h1>
            <p class="tagline">Handmade Jewelry & Crafts</p>
            <h2>${escapeHtml(receiptTitle)}</h2>

            <section class="meta">
              <p><strong>Date:</strong> ${escapeHtml(sale.created_at)}</p>
              ${
                customerName
                  ? `<p><strong>Customer:</strong> ${escapeHtml(
                      customerName
                    )}</p>`
                  : ""
              }
              <p><strong>Type:</strong> ${escapeHtml(
                saleTypeLabel(sale, onlineOrder)
              )}</p>
              <p><strong>Payment:</strong> ${escapeHtml(paymentType)}</p>
              ${trackingLine}
            </section>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Each</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <section class="totals">
              <div><span>Subtotal</span><strong>${formatMoney(
                subtotalCents
              )}</strong></div>
              ${taxLine}
              ${roundingLine}
              <div class="grand-total"><span>Total</span><strong>${formatMoney(
                sale.total_cents
              )}</strong></div>
            </section>

            <section class="qr">
              <img src="${API_URL}/settings/store-qr.png" alt="Store QR code" />
              <p class="qr-copy">Scan for upcoming events and online shopping.</p>
            </section>
          </main>
          <script>
            window.addEventListener("load", () => {
              window.focus();
              setTimeout(() => window.print(), 250);
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function encodeBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  function buildReceiptPayload() {
    const sale = selectedSale.sale;
    const onlineOrder = selectedSale.online_order;
    const orderNumber = sale.order_number || sale.id;
    const customerName =
      sale.customer_name || onlineOrder?.customer_name || "";
    const subtotalCents = sale.subtotal_cents || sale.total_cents;
    const paymentType = sale.payment_type || (onlineOrder ? "online" : "pos");
    const tracking =
      onlineOrder?.carrier && onlineOrder?.tracking_id
        ? `${onlineOrder.carrier} ${onlineOrder.tracking_id}`
        : "";

    return {
      storeName: "sammyinthesky",
      tagline: "Handmade Jewelry & Crafts",
      orderNumber: String(orderNumber),
      createdAt: sale.created_at,
      customerName,
      type: saleTypeLabel(sale, onlineOrder),
      paymentType,
      tracking,
      subtotalCents,
      taxCents: sale.tax_cents || 0,
      roundingAdjustmentCents: sale.rounding_adjustment_cents || 0,
      totalCents: sale.total_cents,
      items: selectedSale.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        priceCents: item.price_cents,
      })),
      footer: "Thank you!",
    };
  }

  function printAndroidReceipt() {
    if (!selectedSale) {
      return;
    }

    const payload = encodeBase64Url(JSON.stringify(buildReceiptPayload()));
    const callback = encodeURIComponent(window.location.href.split("#")[0]);
    window.location.href = `posprint://receipt?payload=${payload}&callback=${callback}`;
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
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {salesData.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.order_number || sale.id}</td>
                      <td>{saleTypeLabel(sale)}</td>
                      <td>{sale.display_customer_name || sale.customer_name || "-"}</td>
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
            <p className="sale-customer-line">
              Customer: {selectedSale.sale.customer_name}
            </p>
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

          <div className="button-row">
            <button onClick={() => printSaleReceipt("a4")}>
              Print A4 Receipt
            </button>
            <button onClick={() => printSaleReceipt("thermal")}>
              Browser Thermal Receipt
            </button>
            <button onClick={printAndroidReceipt}>
              Android Bluetooth Receipt
            </button>
          </div>

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
            {Number(selectedSale.sale.tax_cents || 0) > 0 && (
              <span>
                Tax: ${((selectedSale.sale.tax_cents || 0) / 100).toFixed(2)}
              </span>
            )}
            {Number(selectedSale.sale.rounding_adjustment_cents || 0) !== 0 && (
              <span>
                Rounding:{" "}
                {formatSignedMoney(selectedSale.sale.rounding_adjustment_cents)}
              </span>
            )}
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
