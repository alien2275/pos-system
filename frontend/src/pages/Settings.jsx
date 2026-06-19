import { useEffect, useState } from "react";
import { API_URL } from "../config";

function Settings() {
  const [form, setForm] = useState({
    tax_state: "MD",
    tax_rate_percent: "6.00",
    flat_shipping: "6.00",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          tax_state: data.tax_state || "MD",
          tax_rate_percent: data.tax_rate_percent || "6.00",
          flat_shipping: ((data.flat_shipping_cents || 0) / 100).toFixed(2),
        });
      })
      .catch((err) => console.error(err));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm({
      ...form,
      [name]: value,
    });
  }

  async function saveSettings(event) {
    event.preventDefault();
    setMessage("");

    const response = await fetch(`${API_URL}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tax_state: form.tax_state,
        tax_rate_percent: Number(form.tax_rate_percent || 0),
        flat_shipping_cents: Math.round(Number(form.flat_shipping || 0) * 100),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Settings failed to save");
      return;
    }

    setForm({
      tax_state: data.tax_state,
      tax_rate_percent: data.tax_rate_percent,
      flat_shipping: (data.flat_shipping_cents / 100).toFixed(2),
    });
    setMessage("Settings saved.");
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
          </div>

          <div className="button-row">
            <button type="submit">Save Settings</button>
            {message && <p>{message}</p>}
          </div>
        </form>
      </section>
    </div>
  );
}

export default Settings;
