import { useEffect, useState } from "react";
import { API_URL } from "../config";

function Events() {
  const emptyForm = {
    title: "",
    location: "",
    description: "",
    start_date: "",
    end_date: "",
    image_url: "",
    is_public: true,
  };

  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [galleryFile, setGalleryFile] = useState(null);
  const [eventImages, setEventImages] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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

  function loadEvents() {
    fetch(`${API_URL}/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error(err));
  }

  function loadEventImages(eventId) {
    if (!eventId) {
      setEventImages([]);
      return;
    }

    fetch(`${API_URL}/events/${eventId}/images`)
      .then((res) => res.json())
      .then((data) => setEventImages(data))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  function startEdit(event) {
    setEditingEventId(event.id);
    setImageFile(null);
    setGalleryFile(null);
    setStatusMessage("");
    loadEventImages(event.id);
    setForm({
      title: event.title || "",
      location: event.location || "",
      description: event.description || "",
      start_date: event.start_date || "",
      end_date: event.end_date || "",
      image_url: event.image_url || "",
      is_public: event.is_public,
    });
  }

  function cancelEdit() {
    setEditingEventId(null);
    setImageFile(null);
    setGalleryFile(null);
    setEventImages([]);
    setStatusMessage("");
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const eventToSend = {
      ...form,
      end_date: form.end_date || null,
    };

    const saveUrl = editingEventId
      ? `${API_URL}/events/${editingEventId}`
      : `${API_URL}/events`;

    try {
      const response = await fetch(saveUrl, {
        method: editingEventId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Save event failed");
        return;
      }

      setEvents((currentEvents) => {
        const exists = currentEvents.some((item) => item.id === data.id);

        if (!exists) {
          return [data, ...currentEvents];
        }

        return currentEvents.map((item) => (item.id === data.id ? data : item));
      });
      setEditingEventId(data.id);
      loadEventImages(data.id);
      setForm({
        title: data.title || "",
        location: data.location || "",
        description: data.description || "",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        image_url: data.image_url || "",
        is_public: data.is_public,
      });
      setStatusMessage(
        editingEventId
          ? "Event saved."
          : "Event added. You can upload photos now."
      );
      loadEvents();
    } catch (err) {
      console.error(err);
      alert("Save event failed");
    }
  }

  async function uploadImage() {
    if (!editingEventId || !imageFile) {
      alert("Save the event before uploading an image");
      return;
    }

    const imageData = new FormData();
    imageData.append("file", imageFile);
    setIsUploadingImage(true);

    try {
      const response = await fetch(`${API_URL}/events/${editingEventId}/image`, {
        method: "POST",
        body: imageData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Image upload failed");
        return;
      }

      setForm({
        title: data.title || "",
        location: data.location || "",
        description: data.description || "",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        image_url: data.image_url || "",
        is_public: data.is_public,
      });
      setEvents((currentEvents) =>
        currentEvents.map((item) => (item.id === data.id ? data : item))
      );
      setImageFile(null);
      setStatusMessage("Main event image uploaded.");
      loadEvents();
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function uploadGalleryImage() {
    if (!editingEventId || !galleryFile) {
      alert("Save the event before uploading gallery photos");
      return;
    }

    const imageData = new FormData();
    imageData.append("file", galleryFile);
    setIsUploadingGalleryImage(true);

    try {
      const response = await fetch(`${API_URL}/events/${editingEventId}/images`, {
        method: "POST",
        body: imageData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Gallery image upload failed");
        return;
      }

      setEventImages([data, ...eventImages]);
      setGalleryFile(null);
      setStatusMessage("Gallery photo uploaded.");
    } catch (err) {
      console.error(err);
      alert("Gallery image upload failed");
    } finally {
      setIsUploadingGalleryImage(false);
    }
  }

  async function deleteEventImage(imageId) {
    if (!confirm("Delete this event photo?")) {
      return;
    }

    const response = await fetch(`${API_URL}/event-images/${imageId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Delete event photo failed");
      return;
    }

    setEventImages(eventImages.filter((image) => image.id !== imageId));
    setStatusMessage("Gallery photo deleted.");
  }

  async function deleteEvent(eventId) {
    if (!confirm("Delete this event?")) {
      return;
    }

    const response = await fetch(`${API_URL}/events/${eventId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Delete event failed");
      return;
    }

    if (editingEventId === eventId) {
      cancelEdit();
    }

    loadEvents();
  }

  return (
    <>
      <h1>Events</h1>

      <h2>{editingEventId ? "Edit Event" : "Add Event"}</h2>

      <form className="event-admin-form" onSubmit={handleSubmit}>
        <div className="event-form-grid">
          <label>
            Event Title
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Location
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
            />
          </label>

          <label className="event-form-full">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
            />
          </label>

          <label>
            Start Date
            <input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            End Date
            <input
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={handleChange}
            />
          </label>
        </div>

        {form.image_url && (
          <div className="event-current-image">
            <img
              src={getImageSrc(form.image_url)}
              alt={`${form.title || "Event"} preview`}
            />
          </div>
        )}

        {editingEventId && (
          <div className="event-photo-panel">
            <h3>Main event image</h3>
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

        {editingEventId && (
          <div className="event-photo-panel">
            <h3>Event gallery photos</h3>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setGalleryFile(event.target.files[0] || null)}
            />
            <button
              type="button"
              onClick={uploadGalleryImage}
              disabled={!galleryFile || isUploadingGalleryImage}
            >
              {isUploadingGalleryImage ? "Uploading..." : "Upload Gallery Photo"}
            </button>

            {eventImages.length > 0 && (
              <div className="event-admin-gallery">
                {eventImages.map((image) => (
                  <div key={image.id}>
                    <img src={getImageSrc(image.image_url)} alt="" />
                    <button
                      type="button"
                      onClick={() => deleteEventImage(image.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!editingEventId && (
          <p className="event-admin-note">Save the event to add photos.</p>
        )}

        <label className="event-public-toggle">
          <input
            type="checkbox"
            name="is_public"
            checked={form.is_public}
            onChange={handleChange}
          />
          Show On Store
        </label>

        <div className="event-form-actions">
          <button type="submit">
            {editingEventId ? "Save Changes" : "Add Event"}
          </button>

          {editingEventId && (
            <button type="button" onClick={cancelEdit}>
              Done
            </button>
          )}
        </div>

        {statusMessage && <p className="event-status">{statusMessage}</p>}
      </form>

      <h2>Event List</h2>

      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Image</th>
            <th>Title</th>
            <th>Date</th>
            <th>Location</th>
            <th>Public</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                {event.image_url && (
                  <img
                    src={getImageSrc(event.image_url)}
                    alt={event.title}
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                    }}
                  />
                )}
              </td>
              <td>{event.title}</td>
              <td>
                {event.end_date && event.end_date !== event.start_date
                  ? `${event.start_date} to ${event.end_date}`
                  : event.start_date}
              </td>
              <td>{event.location}</td>
              <td>{event.is_public ? "Yes" : "No"}</td>
              <td>
                <button onClick={() => startEdit(event)}>Edit</button>
                <button onClick={() => deleteEvent(event.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default Events;
