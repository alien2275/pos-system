import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://100.85.171.19:8000";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <main className="store-page">
      <header className="store-header">
        <h1>Products</h1>
        <p>Available handmade goods from sammyinthesky.</p>
      </header>

      {isLoading && <p>Loading products...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && products.length === 0 && (
        <p>No products are available right now.</p>
      )}

      {!isLoading && !error && products.length > 0 && (
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
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default StoreProducts;
