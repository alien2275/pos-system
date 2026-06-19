import { useEffect, useState } from "react";
import { API_URL } from "../config";

function getImageSrc(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `${API_URL}${imageUrl}`;
  }

  return imageUrl;
}

function StoreProducts() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [shipping, setShipping] = useState({
    customer_name: "",
    customer_email: "",
    shipping_name: "",
    shipping_address_line1: "",
    shipping_address_line2: "",
    shipping_city: "",
    shipping_state: "",
    shipping_postal_code: "",
    shipping_country: "US",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orderMessage, setOrderMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/store/products`)
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || "Store products failed to load");
        }

        setProducts(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Store products are unavailable right now.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  function addToCart(product) {
    setOrderMessage("");
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      if (existing.quantity >= product.quantity_on_hand) {
        alert("No more stock is available for this item");
        return;
      }

      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
      return;
    }

    setCart([...cart, { ...product, quantity: 1 }]);
  }

  function updateQuantity(productId, quantity) {
    const product = products.find((item) => item.id === productId);
    const nextQuantity = Math.max(0, Math.min(quantity, product.quantity_on_hand));

    if (nextQuantity === 0) {
      setCart(cart.filter((item) => item.id !== productId));
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity: nextQuantity } : item
      )
    );
  }

  function handleShippingChange(event) {
    const { name, value } = event.target;
    setShipping({
      ...shipping,
      [name]: value,
    });
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0
  );

  async function placeOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
      alert("Add at least one item to the cart");
      return;
    }

    setIsSubmitting(true);
    setOrderMessage("");

    try {
      const response = await fetch(`${API_URL}/store/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...shipping,
          payment_provider: "placeholder",
          payment_reference: `TEST-${Date.now()}`,
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Order failed");
        return;
      }

      setCart([]);
      setShipping({
        customer_name: "",
        customer_email: "",
        shipping_name: "",
        shipping_address_line1: "",
        shipping_address_line2: "",
        shipping_city: "",
        shipping_state: "",
        shipping_postal_code: "",
        shipping_country: "US",
      });
      setOrderMessage(`Order #${data.order.id} placed for testing.`);
    } catch (err) {
      console.error(err);
      alert("Order failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="store-page">
      <header className="store-header">
        <h1>Products</h1>
        <p>Available handmade goods from sammyinthesky.</p>
      </header>

      {isLoading && <p>Loading products...</p>}
      {error && <p>{error}</p>}
      {orderMessage && <p className="store-order-message">{orderMessage}</p>}

      {!isLoading && !error && products.length === 0 && (
        <p>No products are available right now.</p>
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="store-shop-layout">
          <section className="store-grid">
            {products.map((product) => (
              <article className="store-product" key={product.id}>
                <div className="store-product-image">
                  {product.image_url ? (
                    <img src={getImageSrc(product.image_url)} alt={product.name} />
                  ) : (
                    <span>No Image</span>
                  )}
                </div>

                <div className="store-product-body">
                  <p className="store-product-category">{product.category}</p>
                  <h2>{product.name}</h2>
                  <p className="store-product-description">
                    {product.public_description || "Handmade item available now."}
                  </p>
                  <div className="store-product-footer">
                    <strong>${(product.price_cents / 100).toFixed(2)}</strong>
                    <span>{product.quantity_on_hand} available</span>
                  </div>
                  <button onClick={() => addToCart(product)}>Add To Cart</button>
                </div>
              </article>
            ))}
          </section>

          <aside className="store-cart">
            <h2>Cart</h2>

            {cart.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              <div className="store-cart-items">
                {cart.map((item) => (
                  <div className="store-cart-item" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>${(item.price_cents / 100).toFixed(2)} each</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity_on_hand}
                      value={item.quantity}
                      onChange={(event) =>
                        updateQuantity(item.id, Number(event.target.value))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="store-cart-total">
              <span>Total</span>
              <strong>${(cartTotal / 100).toFixed(2)}</strong>
            </div>

            <form className="store-checkout-form" onSubmit={placeOrder}>
              <h2>Shipping</h2>
              <input
                name="customer_name"
                placeholder="Your name"
                value={shipping.customer_name}
                onChange={handleShippingChange}
                required
              />
              <input
                name="customer_email"
                type="email"
                placeholder="Email"
                value={shipping.customer_email}
                onChange={handleShippingChange}
                required
              />
              <input
                name="shipping_name"
                placeholder="Ship to name"
                value={shipping.shipping_name}
                onChange={handleShippingChange}
                required
              />
              <input
                name="shipping_address_line1"
                placeholder="Address"
                value={shipping.shipping_address_line1}
                onChange={handleShippingChange}
                required
              />
              <input
                name="shipping_address_line2"
                placeholder="Apartment, suite, etc."
                value={shipping.shipping_address_line2}
                onChange={handleShippingChange}
              />
              <input
                name="shipping_city"
                placeholder="City"
                value={shipping.shipping_city}
                onChange={handleShippingChange}
                required
              />
              <input
                name="shipping_state"
                placeholder="State"
                value={shipping.shipping_state}
                onChange={handleShippingChange}
                required
              />
              <input
                name="shipping_postal_code"
                placeholder="ZIP"
                value={shipping.shipping_postal_code}
                onChange={handleShippingChange}
                required
              />
              <input
                name="shipping_country"
                placeholder="Country"
                value={shipping.shipping_country}
                onChange={handleShippingChange}
                required
              />

              <div className="store-payment-placeholder">
                PayPal / Stripe placeholder
              </div>

              <button type="submit" disabled={isSubmitting || cart.length === 0}>
                {isSubmitting ? "Placing Order..." : "Place Test Order"}
              </button>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}

export default StoreProducts;
