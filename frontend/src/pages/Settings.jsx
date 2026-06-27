import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "../config";

function Settings() {
  const [form, setForm] = useState({
    tax_enabled: true,
    tax_state: "MD",
    tax_rate_percent: "6.00",
    flat_shipping: "6.00",
    store_url: "https://sammyinthesky.art",
    pos_rounding_mode: "none",
  });
  function localDateInputValue(value = new Date()) {
    const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().split("T")[0];
  }

  const today = localDateInputValue();
  const [reportRange, setReportRange] = useState({
    start_date: today,
    end_date: today,
  });
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/settings")
      .then((res) => res.json())
      .then((data) => {
        setForm({
          tax_enabled: data.tax_enabled !== false,
          tax_state: data.tax_state || "MD",
          tax_rate_percent: data.tax_rate_percent || "6.00",
          flat_shipping: ((data.flat_shipping_cents || 0) / 100).toFixed(2),
          store_url: data.store_url || "https://sammyinthesky.art",
          pos_rounding_mode: data.pos_rounding_mode || "none",
        });
      })
      .catch((err) => console.error(err));
  }, []);

  function updateField(event) {
    const { checked, name, type, value } = event.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function saveSettings(event) {
    event.preventDefault();
    setMessage("");

    const response = await apiFetch("/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tax_enabled: form.tax_enabled,
        tax_state: form.tax_state,
        tax_rate_percent: Number(form.tax_rate_percent || 0),
        flat_shipping_cents: Math.round(Number(form.flat_shipping || 0) * 100),
        store_url: form.store_url,
        pos_rounding_mode: form.pos_rounding_mode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Settings failed to save");
      return;
    }

    setForm({
      tax_enabled: data.tax_enabled !== false,
      tax_state: data.tax_state,
      tax_rate_percent: data.tax_rate_percent,
      flat_shipping: (data.flat_shipping_cents / 100).toFixed(2),
      store_url: data.store_url,
      pos_rounding_mode: data.pos_rounding_mode,
    });
    setMessage("Settings saved.");
  }

  function updateReportRange(event) {
    const { name, value } = event.target;
    setReportRange({
      ...reportRange,
      [name]: value,
    });
  }

  function downloadTaxReport(event) {
    event.preventDefault();
    const params = new URLSearchParams(reportRange);
    window.location.href = `${API_URL}/reports/tax-summary.pdf?${params.toString()}`;
  }

  function downloadExport(path) {
    window.location.href = `${API_URL}${path}`;
  }

  async function restoreBackup(event) {
    event.preventDefault();

    if (!restoreFile) {
      alert("Choose a backup ZIP first");
      return;
    }

    if (restoreConfirm !== "RESTORE BACKUP") {
      alert('Type "RESTORE BACKUP" to confirm restore');
      return;
    }

    const restoreData = new FormData();
    restoreData.append("confirm", restoreConfirm);
    restoreData.append("file", restoreFile);
    setIsRestoring(true);

    try {
      const response = await apiFetch("/backups/restore", {
        method: "POST",
        body: restoreData,
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Restore failed");
        return;
      }

      setRestoreFile(null);
      setRestoreConfirm("");
      setMessage("Backup restored. Refresh the app to reload restored data.");
    } catch (err) {
      console.error(err);
      alert("Restore failed");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Settings</h1>
          <p>Adjust checkout tax and online shipping defaults.</p>
        </div>
      </header>

      <section className="admin-panel">
        <h2>Checkout Defaults</h2>

        <form className="admin-form settings-form" onSubmit={saveSettings}>
          <div className="form-grid">
            <label className="form-full checkbox-label">
              <input
                name="tax_enabled"
                type="checkbox"
                checked={form.tax_enabled}
                onChange={updateField}
              />
              Enable sales tax at checkout
            </label>

            <label>
              Tax State
              <input
                name="tax_state"
                value={form.tax_state}
                onChange={updateField}
                placeholder="MD"
              />
            </label>

            <label>
              Tax Rate %
              <input
                name="tax_rate_percent"
                type="number"
                step="0.01"
                min="0"
                value={form.tax_rate_percent}
                onChange={updateField}
              />
            </label>

            <label>
              Online Flat Shipping
              <input
                name="flat_shipping"
                type="number"
                step="0.01"
                min="0"
                value={form.flat_shipping}
                onChange={updateField}
              />
            </label>

            <label className="form-full">
              Store URL For Receipts
              <input
                name="store_url"
                value={form.store_url}
                onChange={updateField}
                placeholder="https://sammyinthesky.art"
              />
            </label>

            <label className="form-full">
              POS Checkout Rounding
              <select
                name="pos_rounding_mode"
                value={form.pos_rounding_mode}
                onChange={updateField}
              >
                <option value="none">No rounding</option>
                <option value="nearest_0_05">Round to nearest $0.05</option>
                <option value="nearest_0_10">Round to nearest $0.10</option>
                <option value="dollar_threshold_0_10">
                  Dollar convenience: down at $0.10 or less, otherwise up
                </option>
              </select>
            </label>
          </div>

          <div className="settings-qr-preview">
            <img
              src={`${API_URL}/settings/store-qr.png?url=${encodeURIComponent(
                form.store_url
              )}`}
              alt="Store QR preview"
            />
            <p>Receipts will point customers here for products and events.</p>
          </div>

          <div className="button-row">
            <button type="submit">Save Settings</button>
            {message && <p>{message}</p>}
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Tax Report PDF</h2>

        <form className="inline-form" onSubmit={downloadTaxReport}>
          <label>
            Start Date
            <input
              name="start_date"
              type="date"
              value={reportRange.start_date}
              onChange={updateReportRange}
              required
            />
          </label>

          <label>
            End Date
            <input
              name="end_date"
              type="date"
              value={reportRange.end_date}
              onChange={updateReportRange}
              required
            />
          </label>

          <button type="submit">Download Tax Summary</button>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Excel Exports</h2>

        <div className="button-row">
          <button type="button" onClick={() => downloadExport("/exports/products.xlsx")}>
            Export Products
          </button>
          <button type="button" onClick={() => downloadExport("/exports/sales.xlsx")}>
            Export Sales
          </button>
          <button type="button" onClick={() => downloadExport("/exports/orders.xlsx")}>
            Export Online Orders
          </button>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Full Backup</h2>
        <p>
          Downloads database records and uploaded product/event images in one ZIP.
        </p>

        <div className="button-row">
          <button type="button" onClick={() => downloadExport("/backups/full.zip")}>
            Download Backup ZIP
          </button>
        </div>

        <form className="admin-form" onSubmit={restoreBackup}>
          <div className="upload-panel">
            <div>
              <strong>Restore Backup ZIP</strong>
              <p>
                This replaces current database records and uploaded images with
                the backup contents.
              </p>
            </div>
            <input
              type="file"
              accept=".zip"
              onChange={(event) => setRestoreFile(event.target.files[0] || null)}
            />
          </div>

          <label>
            Confirmation
            <input
              value={restoreConfirm}
              onChange={(event) => setRestoreConfirm(event.target.value)}
              placeholder="RESTORE BACKUP"
            />
          </label>

          <div className="button-row">
            <button
              type="submit"
              disabled={!restoreFile || restoreConfirm !== "RESTORE BACKUP" || isRestoring}
            >
              {isRestoring ? "Restoring..." : "Restore Backup"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Settings;
