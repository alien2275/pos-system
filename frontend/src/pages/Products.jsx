import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "../config";

function Products() {
  const [products, setProducts] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [productGalleryImages, setProductGalleryImages] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [duplicateRows, setDuplicateRows] = useState([]);
  const [duplicateActions, setDuplicateActions] = useState({});
  const [bulkImages, setBulkImages] = useState([]);
  const [bulkImageIndex, setBulkImageIndex] = useState(0);
  const [bulkAssignments, setBulkAssignments] = useState({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkImageMessage, setBulkImageMessage] = useState("");

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
    apiFetch("/products")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }

  function loadProductGallery(productId) {
    if (!productId) {
      setProductGalleryImages([]);
      return;
    }

    apiFetch(`/products/${productId}/images`)
      .then((res) => res.json())
      .then((data) => setProductGalleryImages(data))
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
      const inactiveMatchRes = await apiFetch(
        `/products/inactive-match?sku=${encodeURIComponent(
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
          const reactivateUrl = `/products/${inactiveProduct.id}`;
          const reactivateRes = await apiFetch(reactivateUrl, {
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

          const reactivatedProduct = await reactivateRes.json();

          if (imageFile) {
            await uploadProductImage(reactivatedProduct.id);
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
      ? `/products/${editingProductId}`
      : "/products";

    apiFetch(saveUrl, {
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

        let savedProduct = data;

        if (imageFile) {
          const uploadedProduct = await uploadProductImage(data.id);
          savedProduct = uploadedProduct || data;
        }

        setForm(emptyForm);
        setEditingProductId(null);
        setImageFile(null);
        setProducts((currentProducts) => {
          const exists = currentProducts.some(
            (product) => product.id === savedProduct.id
          );

          if (!exists) {
            return [...currentProducts, savedProduct];
          }

          return currentProducts.map((product) =>
            product.id === savedProduct.id ? savedProduct : product
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
    setGalleryFiles([]);
    loadProductGallery(product.id);

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
    setGalleryFiles([]);
    setProductGalleryImages([]);
  }

  async function uploadProductImage(productId, fileToUpload = imageFile) {
    if (!productId || !fileToUpload) {
      return null;
    }

    const imageData = new FormData();
    imageData.append("file", fileToUpload);
    setIsUploadingImage(true);

    try {
      const uploadUrl = `/products/${productId}/image`;
      const response = await apiFetch(uploadUrl, {
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
      return data;
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function uploadImage() {
    if (!editingProductId || !imageFile) {
      alert("Choose an image first");
      return;
    }

    const data = await uploadProductImage(editingProductId);

    if (data) {
      setImageFile(null);
      loadProducts();
    }
  }

  async function uploadGalleryImages() {
    if (!editingProductId || galleryFiles.length === 0) {
      alert("Choose one or more gallery images first");
      return;
    }

    setIsUploadingGallery(true);

    try {
      for (const file of galleryFiles) {
        const imageData = new FormData();
        imageData.append("file", file);

        const response = await apiFetch(`/products/${editingProductId}/images`, {
          method: "POST",
          body: imageData,
        });
        const data = await response.json();

        if (!response.ok) {
          alert(data.detail || `Gallery upload failed for ${file.name}`);
          return;
        }
      }

      setGalleryFiles([]);
      loadProductGallery(editingProductId);
    } catch (err) {
      console.error(err);
      alert("Gallery upload failed");
    } finally {
      setIsUploadingGallery(false);
    }
  }

  async function deleteGalleryImage(imageId) {
    if (!confirm("Delete this gallery image?")) {
      return;
    }

    const response = await apiFetch(`/product-images/${imageId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Delete gallery image failed");
      return;
    }

    setProductGalleryImages(
      productGalleryImages.filter((image) => image.id !== imageId)
    );
  }

  function deleteProduct(id) {
    if (!confirm("Deactivate this product?")) {
      return;
    }

    apiFetch(`/products/${id}`, {
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

  async function importProducts(event) {
    event.preventDefault();

    if (!importFile) {
      alert("Choose an Excel file first");
      return;
    }

    const importData = new FormData();
    importData.append("file", importFile);
    setIsImporting(true);
    setImportResult(null);
    setDuplicateRows([]);
    setDuplicateActions({});

    try {
      const response = await apiFetch("/products/import", {
        method: "POST",
        body: importData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Product import failed");
        return;
      }

      setImportResult(data);
      setDuplicateRows(data.duplicates || []);
      setDuplicateActions(
        Object.fromEntries(
          (data.duplicates || []).map((duplicate) => [
            duplicate.row_number,
            "skip",
          ])
        )
      );
      setImportFile(null);
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Product import failed");
    } finally {
      setIsImporting(false);
    }
  }

  function downloadImportTemplate() {
    window.location.href = `${API_URL}/products/import-template`;
  }

  function updateDuplicateAction(rowNumber, action) {
    setDuplicateActions({
      ...duplicateActions,
      [rowNumber]: action,
    });
  }

  async function resolveDuplicates() {
    const decisions = duplicateRows.map((duplicate) => ({
      action: duplicateActions[duplicate.row_number] || "skip",
      product_data: duplicate.product_data,
      matched_product_id: duplicate.matched_product.id,
    }));

    setIsImporting(true);

    try {
      const response = await apiFetch("/products/import/resolve-duplicates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decisions }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Duplicate resolution failed");
        return;
      }

      setImportResult({
        imported: (importResult?.imported || 0) + data.imported,
        updated: (importResult?.updated || 0) + data.updated,
        skipped: (importResult?.skipped || 0) + data.skipped,
        generated_skus: [
          ...(importResult?.generated_skus || []),
          ...data.generated_skus,
        ],
        errors: [...(importResult?.errors || []), ...data.errors],
        duplicates: [],
      });
      setDuplicateRows([]);
      setDuplicateActions({});
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Duplicate resolution failed");
    } finally {
      setIsImporting(false);
    }
  }

  function handleBulkImageSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);

    bulkImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));

    const nextImages = selectedFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      file,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    const nextAssignments = {};
    nextImages.forEach((image) => {
      const fileBase = image.fileName.replace(/\.[^.]+$/, "").toUpperCase();
      const matchedProduct = products.find(
        (product) => (product.sku || "").toUpperCase() === fileBase
      );

      if (matchedProduct) {
        nextAssignments[image.id] = String(matchedProduct.id);
      }
    });

    setBulkImages(nextImages);
    setBulkAssignments(nextAssignments);
    setBulkImageIndex(0);
    setBulkImageMessage("");
    event.target.value = "";
  }

  function updateBulkAssignment(imageId, productId) {
    setBulkAssignments({
      ...bulkAssignments,
      [imageId]: productId,
    });
  }

  function skipBulkImage() {
    setBulkImageIndex((currentIndex) =>
      Math.min(currentIndex + 1, bulkImages.length - 1)
    );
  }

  async function uploadCurrentBulkImage() {
    const currentImage = bulkImages[bulkImageIndex];
    const productId = bulkAssignments[currentImage?.id];

    if (!currentImage || !productId) {
      alert("Choose a product for this image first");
      return;
    }

    setIsBulkUploading(true);
    setBulkImageMessage("");

    const uploadedProduct = await uploadProductImage(
      Number(productId),
      currentImage.file
    );

    setIsBulkUploading(false);

    if (!uploadedProduct) {
      return;
    }

    const product = products.find((item) => item.id === Number(productId));
    setBulkImageMessage(
      `${currentImage.fileName} assigned to ${product?.sku || product?.name}.`
    );

    setBulkImageIndex((currentIndex) =>
      Math.min(currentIndex + 1, bulkImages.length - 1)
    );
    loadProducts();
  }

  function clearBulkImages() {
    bulkImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setBulkImages([]);
    setBulkAssignments({});
    setBulkImageIndex(0);
    setBulkImageMessage("");
  }

  const currentBulkImage = bulkImages[bulkImageIndex];
  const currentBulkProductId = currentBulkImage
    ? bulkAssignments[currentBulkImage.id] || ""
    : "";

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Products</h1>
          <p>Add, edit, price, and publish catalog items.</p>
        </div>
      </header>

      <section className="admin-panel">
        <h2>{editingProductId ? "Edit Product" : "Add Product"}</h2>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              SKU
              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
              />
            </label>

            <label>
              Barcode
              <input
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
              />
            </label>

            <label>
              Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Category
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
              />
            </label>

            <label className="form-full">
              Description
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </label>

            <label className="form-full">
              Public Store Description
              <input
                name="public_description"
                value={form.public_description}
                onChange={handleChange}
              />
            </label>

            <label className="form-full">
              Image URL
              <input
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
              />
            </label>
          </div>

        {form.image_url && (
          <div className="form-image-preview">
            <img
              src={getImageSrc(form.image_url)}
              alt={`${form.name || "Product"} preview`}
            />
          </div>
        )}

        <div className="upload-panel">
          <div>
            <strong>Product Image</strong>
            <p>
              {editingProductId
                ? "Choose a file and upload it now."
                : "Choose a file now and it will upload after the product is added."}
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files[0] || null)}
          />

          {editingProductId && (
            <button
              type="button"
              onClick={uploadImage}
              disabled={!imageFile || isUploadingImage}
            >
              {isUploadingImage ? "Uploading..." : "Upload Image"}
            </button>
          )}
        </div>

        {imageFile && !editingProductId && (
          <div className="upload-panel">
            Selected image: {imageFile.name}
          </div>
        )}

        {editingProductId && (
          <div className="upload-panel">
            <div>
              <strong>Additional Product Photos</strong>
              <p>Upload extra images customers can browse on the store page.</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setGalleryFiles(Array.from(event.target.files || []))
              }
            />
            <button
              type="button"
              onClick={uploadGalleryImages}
              disabled={galleryFiles.length === 0 || isUploadingGallery}
            >
              {isUploadingGallery ? "Uploading..." : "Upload Gallery Photos"}
            </button>
          </div>
        )}

        {editingProductId && productGalleryImages.length > 0 && (
          <div className="gallery-thumb-grid">
            {productGalleryImages.map((image) => (
              <div className="gallery-thumb-card" key={image.id}>
                <img src={getImageSrc(image.image_url)} alt="Product gallery" />
                <button type="button" onClick={() => deleteGalleryImage(image.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

          <div className="form-grid">
            <label>
              Price
              <input
                name="price_dollars"
                type="number"
                step="0.01"
                min="0"
                value={form.price_dollars}
                onChange={handleChange}
              />
            </label>

            <label>
              Cost
              <input
                name="cost_dollars"
                type="number"
                step="0.01"
                min="0"
                value={form.cost_dollars}
                onChange={handleChange}
              />
            </label>

            <label>
              Quantity
              <input
                name="quantity_on_hand"
                type="number"
                value={form.quantity_on_hand}
                onChange={handleChange}
              />
            </label>

            <label>
              Reorder Level
              <input
                name="reorder_level"
                type="number"
                value={form.reorder_level}
                onChange={handleChange}
              />
            </label>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              name="is_public"
              checked={form.is_public}
              onChange={handleChange}
            />
            Show In Store
          </label>

          <div className="button-row">
            <button type="submit">
              {editingProductId ? "Save Changes" : "Add Product"}
            </button>

            {editingProductId && (
              <button type="button" onClick={cancelEdit}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <h2>Bulk Import</h2>
        <form className="admin-form" onSubmit={importProducts}>
          <div className="upload-panel">
            <div>
              <strong>Excel Product Import</strong>
              <p>
                Headers: sku, barcode, name, category, description, public store
                description, price, cost, quantity, reorder level
              </p>
            </div>
            <input
              type="file"
              accept=".xlsx"
              onChange={(event) => setImportFile(event.target.files[0] || null)}
            />
            <button type="button" onClick={downloadImportTemplate}>
              Download Template
            </button>
          </div>

          <div className="button-row">
            <button type="submit" disabled={!importFile || isImporting}>
              {isImporting ? "Importing..." : "Import Products"}
            </button>
          </div>

          {importResult && (
            <div className="selected-summary">
              <span>{importResult.imported} products imported</span>
              <span>{importResult.updated} products updated</span>
              <span>{importResult.skipped} duplicates skipped</span>
              <span>{duplicateRows.length} duplicates need review</span>
              <span>{importResult.errors.length} row errors</span>
            </div>
          )}

          {duplicateRows.length > 0 && (
            <div className="duplicate-review-list">
              <h3>Review Duplicates</h3>
              {duplicateRows.map((duplicate) => (
                <div className="duplicate-review-card" key={duplicate.row_number}>
                  <div>
                    <strong>Row {duplicate.row_number}: {duplicate.product_data.name}</strong>
                    <p>
                      Imported SKU: {duplicate.product_data.sku || "None"} | Barcode:{" "}
                      {duplicate.product_data.barcode || "None"}
                    </p>
                    <p>
                      Matches: {duplicate.matched_product.name} | SKU:{" "}
                      {duplicate.matched_product.sku || "None"} | Barcode:{" "}
                      {duplicate.matched_product.barcode || "None"}
                    </p>
                  </div>
                  <label>
                    Action
                    <select
                      value={duplicateActions[duplicate.row_number] || "skip"}
                      onChange={(event) =>
                        updateDuplicateAction(
                          duplicate.row_number,
                          event.target.value
                        )
                      }
                    >
                      <option value="skip">Skip this row</option>
                      <option value="update">Update matched product</option>
                      <option value="import_as_new">
                        Import as new with generated SKU
                      </option>
                    </select>
                  </label>
                </div>
              ))}
              <div className="button-row">
                <button type="button" onClick={resolveDuplicates} disabled={isImporting}>
                  Apply Duplicate Choices
                </button>
              </div>
            </div>
          )}

          {importResult?.generated_skus.length > 0 && (
            <div className="import-errors">
              {importResult.generated_skus.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          {importResult?.errors.length > 0 && (
            <div className="import-errors">
              {importResult.errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}
        </form>
      </section>

      <section className="admin-panel">
        <div className="section-heading">
          <h2>Bulk Product Images</h2>
          {bulkImages.length > 0 && (
            <span>
              {bulkImageIndex + 1} of {bulkImages.length}
            </span>
          )}
        </div>

        <div className="upload-panel">
          <div>
            <strong>Assign Images To Products</strong>
            <p>
              Select multiple images. Filenames matching a SKU are selected
              automatically, or you can choose the product manually.
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleBulkImageSelection}
          />
        </div>

        {currentBulkImage && (
          <div className="bulk-image-assignment">
            <div className="bulk-image-preview">
              <img src={currentBulkImage.previewUrl} alt={currentBulkImage.fileName} />
              <strong>{currentBulkImage.fileName}</strong>
            </div>

            <label>
              Assign To Product
              <select
                value={currentBulkProductId}
                onChange={(event) =>
                  updateBulkAssignment(currentBulkImage.id, event.target.value)
                }
              >
                <option value="">Choose product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku || "NO SKU"} - {product.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="button-row">
              <button
                type="button"
                disabled={bulkImageIndex === 0}
                onClick={() => setBulkImageIndex(bulkImageIndex - 1)}
              >
                Previous
              </button>
              <button type="button" onClick={skipBulkImage}>
                Skip
              </button>
              <button
                type="button"
                disabled={!currentBulkProductId || isBulkUploading}
                onClick={uploadCurrentBulkImage}
              >
                {isBulkUploading ? "Uploading..." : "Upload To Product"}
              </button>
              <button type="button" onClick={clearBulkImages}>
                Clear Images
              </button>
            </div>

            {bulkImageMessage && <p>{bulkImageMessage}</p>}
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Product List</h2>

        <div className="table-wrap">
          <table className="admin-table">
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
                <th>Reorder</th>
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
                    <div className="button-row compact">
                      <button onClick={() => startEdit(product)}>Edit</button>
                      <button onClick={() => deleteProduct(product.id)}>
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Products;
