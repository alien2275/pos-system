import { useEffect, useRef, useState } from "react";
import { API_URL } from "../config";

const CART_STORAGE_KEY = "pos-store-cart";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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
  const [cartNotice, setCartNotice] = useState("");
  const [lastAddedProductId, setLastAddedProductId] = useState(null);
  const [galleryModal, setGalleryModal] = useState(null);
  const [settings, setSettings] = useState({
    tax_state: "MD",
    tax_rate_percent: "6.00",
    flat_shipping_cents: 0,
  });
  const cartRef = useRef(null);

  useEffect(() => {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!savedCart) {
      return;
    }

    try {
      setCart(JSON.parse(savedCart));
    } catch (err) {
      console.error(err);
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

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

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (products.length === 0 || cart.length === 0) {
      return;
    }

    const nextCart = cart
      .map((item) => {
        const product = products.find((entry) => entry.id === item.id);
        if (!product || product.quantity_on_hand <= 0) {
          return null;
        }

        return {
          ...product,
          quantity: Math.min(item.quantity, product.quantity_on_hand),
        };
      })
      .filter(Boolean);

    if (JSON.stringify(nextCart) !== JSON.stringify(cart)) {
      setCart(nextCart);
    }
  }, [products]);

  function addToCart(product) {
    if (product.quantity_on_hand <= 0) {
      alert("This item is sold out");
      return;
    }

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
      showCartNotice(product);
      return;
    }

    setCart([...cart, { ...product, quantity: 1 }]);
    showCartNotice(product);
  }

  function showCartNotice(product) {
    setCartNotice(`${product.name} added to cart.`);
    setLastAddedProductId(product.id);

    window.setTimeout(() => {
      setCartNotice("");
      setLastAddedProductId(null);
    }, 2200);
  }

  function updateQuantity(productId, quantity) {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      setCart(cart.filter((item) => item.id !== productId));
      return;
    }

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

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const taxRate = Number(settings.tax_rate_percent || 0);
  const shippingCents = cart.length > 0 ? settings.flat_shipping_cents : 0;
  const taxCents = Math.round(cartSubtotal * (taxRate / 100));
  const cartTotal = cartSubtotal + taxCents + shippingCents;

  function scrollToCart() {
    cartRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function getProductImages(product) {
    const images = [];

    if (product.image_url) {
      images.push({ id: "main", image_url: product.image_url });
    }

    return [...images, ...(product.images || [])];
  }

  function openGallery(product) {
    const images = getProductImages(product);
    if (images.length === 0) {
      return;
    }

    setGalleryModal({
      product,
      images,
      index: 0,
    });
  }

  function moveGallery(direction) {
    if (!galleryModal) {
      return;
    }

    setGalleryModal({
      ...galleryModal,
      index:
        (galleryModal.index + direction + galleryModal.images.length) %
        galleryModal.images.length,
    });
  }

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
      window.localStorage.removeItem(CART_STORAGE_KEY);
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
      setOrderMessage(
        `Order ${data.order.order_number || data.order.id} placed for testing.`
      );
    } catch (err) {
      console.error(err);
      alert("Order failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const categories = Array.from(
    new Set(products.map((product) => product.category || "Uncategorized"))
  );

  const visibleProducts = products.filter((product) => {
    const category = product.category || "Uncategorized";
    const matchesCategory =
      selectedCategory === "all" || category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      (product.public_description || "").toLowerCase().includes(query) ||
      category.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  const productsByCategory = visibleProducts.reduce((groups, product) => {
    const category = product.category || "Uncategorized";
    groups[category] = [...(groups[category] || []), product];
    return groups;
  }, {});

  return (
    <main className="store-page">
      <header className="store-header">
        <h1>Products</h1>
        <p>Available handmade goods from sammyinthesky.</p>
      </header>

      {cartNotice && <div className="store-cart-notice">{cartNotice}</div>}

      {cartItemCount > 0 && (
        <button className="store-cart-jump" type="button" onClick={scrollToCart}>
          Cart ({cartItemCount})
        </button>
      )}

      {galleryModal && (
        <div className="store-image-modal" role="dialog" aria-modal="true">
          <div className="store-image-modal-panel">
            <button
              className="store-image-modal-close"
              type="button"
              onClick={() => setGalleryModal(null)}
            >
              Close
            </button>

            <img
              src={getImageSrc(galleryModal.images[galleryModal.index].image_url)}
              alt={galleryModal.product.name}
            />

            <div className="section-heading">
              <div>
                <h2>{galleryModal.product.name}</h2>
                <p>
                  Image {galleryModal.index + 1} of {galleryModal.images.length}
                </p>
              </div>
              {galleryModal.images.length > 1 && (
                <div className="button-row compact">
                  <button type="button" onClick={() => moveGallery(-1)}>
                    Previous
                  </button>
                  <button type="button" onClick={() => moveGallery(1)}>
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading && <p>Loading products...</p>}
      {error && <p>{error}</p>}
      {orderMessage && <p className="store-order-message">{orderMessage}</p>}

      {!isLoading && !error && products.length === 0 && (
        <p>No products are available right now.</p>
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="store-shop-layout">
          <section className="store-products-section">
            <div className="store-product-tools">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products"
              />

              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {visibleProducts.length === 0 ? (
              <p>No products match that search.</p>
            ) : (
              Object.entries(productsByCategory).map(([category, items]) => (
                <div className="store-category-group" key={category}>
                  <div className="section-heading">
                    <h2>{category}</h2>
                    <span>{items.length} items</span>
                  </div>

                  <div className="store-grid">
                    {items.map((product) => {
                      const isSoldOut = product.quantity_on_hand <= 0;

                      return (
                        <article
                          className={`store-product ${
                            isSoldOut ? "is-sold-out" : ""
                          }`}
                          key={product.id}
                        >
                          <button
                            className="store-product-image image-button"
                            type="button"
                            onClick={() => openGallery(product)}
                            disabled={!product.image_url && !(product.images || []).length}
                          >
                            {product.image_url ? (
                              <img
                                src={getImageSrc(product.image_url)}
                                alt={product.name}
                              />
                            ) : (
                              <span>No Image</span>
                            )}
                            {isSoldOut && (
                              <span className="sold-out-badge">Sold Out</span>
                            )}
                          </button>

                          <div className="store-product-body">
                            <p className="store-product-category">{category}</p>
                            <h2>{product.name}</h2>
                            <p className="store-product-description">
                              {product.public_description ||
                                "Handmade item available now."}
                            </p>
                            <div className="store-product-footer">
                              <strong>
                                ${(product.price_cents / 100).toFixed(2)}
                              </strong>
                              <span>
                                {isSoldOut
                                  ? "Sold out"
                                  : `${product.quantity_on_hand} available`}
                              </span>
                            </div>
                            <button
                              onClick={() => addToCart(product)}
                              disabled={isSoldOut}
                            >
                              {isSoldOut
                                ? "Sold Out"
                                : lastAddedProductId === product.id
                                ? "Added"
                                : "Add To Cart"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>

          <aside className="store-cart" ref={cartRef}>
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
              <span>Subtotal</span>
              <strong>${(cartSubtotal / 100).toFixed(2)}</strong>
            </div>

            <div className="store-cart-total">
              <span>Tax ({settings.tax_state})</span>
              <strong>${(taxCents / 100).toFixed(2)}</strong>
            </div>

            <div className="store-cart-total">
              <span>Shipping</span>
              <strong>${(shippingCents / 100).toFixed(2)}</strong>
            </div>

            <div className="store-cart-total final-total">
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
