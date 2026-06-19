import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://100.85.171.19:8000";

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
      setForm({
        title: data.title || "",
        location: data.location || "",
        description: data.description || "",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        image_url: data.image_url || "",
        is_public: data.is_public,
      });
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
        ...form,
        image_url: data.image_url || "",
      });
      setImageFile(null);
      loadEvents();
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    } finally {
      setIsUploadingImage(false);
    }
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

      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <input
          name="title"
          placeholder="Event Title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <input
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
        />

        <input
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
        />

        <label>
          Start Date{" "}
          <input
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          End Date{" "}
          <input
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
          />
        </label>

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
              alt={`${form.title || "Event"} preview`}
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                border: "1px solid #ccc",
              }}
            />
          </div>
        )}

        {editingEventId && (
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
          Show On Store
        </label>

        <button type="submit">
          {editingEventId ? "Save Changes" : "Add Event"}
        </button>

        {editingEventId && (
          <button type="button" onClick={cancelEdit}>
            Cancel Edit
          </button>
        )}
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
