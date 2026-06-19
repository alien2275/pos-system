import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://100.85.171.19:8000";

function Products() {
  const [products, setProducts] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const emptyForm = {
    sku: "",
    barcode: "",
    name: "",
    category: "",
    description: "",
    public_description: "",
    image_url: "",
    is_public: false,
    price_dollars: "",
    cost_dollars: "",
    quantity_on_hand: 0,
    reorder_level: 0,
  };

  const [form, setForm] = useState(emptyForm);

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

  function loadProducts() {
    fetch(`${API_URL}/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm({
      ...form,
      [name]:
        type === "checkbox"
          ? checked
          : ["quantity_on_hand", "reorder_level"].includes(name)
          ? Number(value)
          : value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!editingProductId) {
      const inactiveMatchRes = await fetch(
        `${API_URL}/products/inactive-match?sku=${encodeURIComponent(
          form.sku
        )}&barcode=${encodeURIComponent(form.barcode)}`
      );

      if (inactiveMatchRes.ok) {
        const inactiveProduct = await inactiveMatchRes.json();

        const shouldReactivate = confirm(
          `This product already exists but is inactive:\n\n` +
            `Name: ${inactiveProduct.name}\n` +
            `SKU: ${inactiveProduct.sku}\n` +
            `Barcode: ${inactiveProduct.barcode}\n` +
            `Category: ${inactiveProduct.category}\n\n` +
            `Reactivate this product?`
        );

        if (shouldReactivate) {
          const reactivateUrl = `${API_URL}/products/${inactiveProduct.id}`;
          const reactivateRes = await fetch(reactivateUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              is_active: true,
              name: form.name || inactiveProduct.name,
              category: form.category || inactiveProduct.category,
              description: form.description || inactiveProduct.description,
              public_description:
                form.public_description || inactiveProduct.public_description,
              image_url: form.image_url || inactiveProduct.image_url,
              is_public: form.is_public,
              price_cents: Math.round(Number(form.price_dollars) * 100),
              cost_cents: Math.round(Number(form.cost_dollars) * 100),
              quantity_on_hand: Number(form.quantity_on_hand),
              reorder_level: Number(form.reorder_level),
            }),
          });

          if (!reactivateRes.ok) {
            const error = await reactivateRes.json();
            alert(
              `Reactivate failed (${reactivateRes.status}) at ${reactivateUrl}: ` +
                (error.detail || "Unknown error")
            );
            return;
          }

          setForm(emptyForm);
          setEditingProductId(null);
          setImageFile(null);
          loadProducts();
          return;
        }
      }
    }

    const productToSend = {
      ...form,
      price_cents: Math.round(Number(form.price_dollars) * 100),
      cost_cents: Math.round(Number(form.cost_dollars) * 100),
    };

    delete productToSend.price_dollars;
    delete productToSend.cost_dollars;

    const saveUrl = editingProductId
      ? `${API_URL}/products/${editingProductId}`
      : `${API_URL}/products`;

    fetch(saveUrl, {
        method: editingProductId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productToSend),
      })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          alert(
            `Save product failed (${res.status}) at ${saveUrl}: ` +
              (data.detail || "Unknown error")
          );
          return;
        }

        setForm(emptyForm);
        setEditingProductId(null);
        setImageFile(null);
        setProducts((currentProducts) => {
          const exists = currentProducts.some((product) => product.id === data.id);

          if (!exists) {
            return [...currentProducts, data];
          }

          return currentProducts.map((product) =>
            product.id === data.id ? data : product
          );
        });
        loadProducts();
      })
      .catch((err) => {
        console.error(err);
        alert("Save product failed");
      });
  }

  function startEdit(product) {
    setEditingProductId(product.id);
    setImageFile(null);

    setForm({
      sku: product.sku || "",
      barcode: product.barcode || "",
      name: product.name || "",
      category: product.category || "",
      description: product.description || "",
      public_description: product.public_description || "",
      image_url: product.image_url || "",
      is_public: product.is_public || false,
      price_dollars: (product.price_cents / 100).toFixed(2),
      cost_dollars: (product.cost_cents / 100).toFixed(2),
      quantity_on_hand: product.quantity_on_hand,
      reorder_level: product.reorder_level,
    });
  }

  function cancelEdit() {
    setEditingProductId(null);
    setForm(emptyForm);
    setImageFile(null);
  }

  async function uploadImage() {
    if (!editingProductId || !imageFile) {
      alert("Select an image after saving the product first");
      return;
    }

    const imageData = new FormData();
    imageData.append("file", imageFile);
    setIsUploadingImage(true);

    try {
      const uploadUrl = `${API_URL}/products/${editingProductId}/image`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: imageData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.detail === "Not Found"
            ? "Image upload endpoint not found. Rebuild and restart the backend, then try again."
            : data.detail === "Product not found"
            ? `Product not found at ${uploadUrl}. Save the product first, refresh the Products page, then try uploading again.`
            : `Image upload failed (${response.status}) at ${uploadUrl}: ` +
              (data.detail || "Unknown error")
        );
        return;
      }

      setForm({
        ...form,
        image_url: data.image_url || "",
      });
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === data.id ? data : product
        )
      );
      setImageFile(null);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  }

  function deleteProduct(id) {
    if (!confirm("Deactivate this product?")) {
      return;
    }

    fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          alert(error.detail || "Deactivate failed");
          return;
        }

        loadProducts();
      })
      .catch((err) => {
        console.error(err);
        alert("Deactivate failed");
      });
  }

  return (
    <>
      <h1>Products</h1>

      <h2>{editingProductId ? "Edit Product" : "Add Product"}</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <input
          name="sku"
          placeholder="SKU"
          value={form.sku}
          onChange={handleChange}
        />

        <input
          name="barcode"
          placeholder="Barcode"
          value={form.barcode}
          onChange={handleChange}
        />

        <input
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          name="category"
          placeholder="Category"
          value={form.category}
          onChange={handleChange}
        />

        <input
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />

        <input
          name="public_description"
          placeholder="Public Store Description"
          value={form.public_description}
          onChange={handleChange}
        />

        <input
          name="image_url"
          placeholder="Image URL"
          value={form.image_url}
          onChange={handleChange}
        />

        {form.image_url && (
          <div style={{ margin: "0.5rem 0" }}>
            <img
              src={getImageSrc(form.image_url)}
              alt={`${form.name || "Product"} preview`}
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                border: "1px solid #ccc",
              }}
            />
          </div>
        )}

        {editingProductId && (
          <div style={{ margin: "0.5rem 0" }}>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files[0] || null)}
            />

            <button
              type="button"
              onClick={uploadImage}
              disabled={!imageFile || isUploadingImage}
            >
              {isUploadingImage ? "Uploading..." : "Upload Image"}
            </button>
          </div>
        )}

        <label>
          <input
            type="checkbox"
            name="is_public"
            checked={form.is_public}
            onChange={handleChange}
          />
          Show In Store
        </label>

        <input
          name="price_dollars"
          type="number"
          step="0.01"
          min="0"
          placeholder="Price $"
          value={form.price_dollars}
          onChange={handleChange}
        />

        <input
          name="cost_dollars"
          type="number"
          step="0.01"
          min="0"
          placeholder="Cost $"
          value={form.cost_dollars}
          onChange={handleChange}
        />

        <input
          name="quantity_on_hand"
          type="number"
          placeholder="Qty"
          value={form.quantity_on_hand}
          onChange={handleChange}
        />

        <input
          name="reorder_level"
          type="number"
          placeholder="Reorder Level"
          value={form.reorder_level}
          onChange={handleChange}
        />

        <button type="submit">
          {editingProductId ? "Save Changes" : "Add Product"}
        </button>

        {editingProductId && (
          <button type="button" onClick={cancelEdit}>
            Cancel Edit
          </button>
        )}
      </form>

      <h2>Product List</h2>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Image</th>
            <th>Barcode</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Cost</th>
            <th>Qty</th>
            <th>Reorder Level</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>
                {product.image_url ? (
                  <div className="product-image-preview" tabIndex="0">
                    <img
                      className="product-image-thumbnail"
                      src={getImageSrc(product.image_url)}
                      alt={product.name}
                    />
                    <img
                      className="product-image-large"
                      src={getImageSrc(product.image_url)}
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                ) : (
                  ""
                )}
              </td>
              <td>{product.barcode}</td>
              <td>{product.name}</td>
              <td>{product.category}</td>
              <td>${(product.price_cents / 100).toFixed(2)}</td>
              <td>${(product.cost_cents / 100).toFixed(2)}</td>
              <td>{product.quantity_on_hand}</td>
              <td>{product.reorder_level}</td>
              <td>
                <button onClick={() => startEdit(product)}>Edit</button>
                <button onClick={() => deleteProduct(product.id)}>
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default Products;
