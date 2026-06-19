import { Link } from "react-router-dom";
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

function formatEventDate(event) {
  if (!event.end_date || event.end_date === event.start_date) {
    return event.start_date;
  }

  return `${event.start_date} to ${event.end_date}`;
}

function Store() {
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/store/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingEvents(false));
  }, []);

  return (
    <main className="store-page">
      <section className="store-landing">
        <h1>sammyinthesky</h1>
        <p>Handmade jewelry, stickers, 3D prints, and crafts.</p>
        <Link className="store-product-link" to="/store/products">
          View Products
        </Link>
      </section>

      <section className="store-events-section">
        <h2>Upcoming Events</h2>

        {isLoadingEvents && <p>Loading events...</p>}

        {!isLoadingEvents && events.length === 0 && (
          <p>No upcoming events are listed right now.</p>
        )}

        {!isLoadingEvents && events.length > 0 && (
          <div className="store-events-grid">
            {events.map((event) => (
              <article className="store-event-card" key={event.id}>
                {event.image_url && (
                  <img src={getImageSrc(event.image_url)} alt={event.title} />
                )}
                <div>
                  <p className="store-event-date">{formatEventDate(event)}</p>
                  <h3>{event.title}</h3>
                  {event.location && <p>{event.location}</p>}
                  {event.description && <p>{event.description}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Store;
