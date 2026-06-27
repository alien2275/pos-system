import { Link } from "react-router-dom";
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

function formatEventDate(event) {
  if (!event.end_date || event.end_date === event.start_date) {
    return event.start_date;
  }

  return `${event.start_date} to ${event.end_date}`;
}

function Store() {
  const [events, setEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingPastEvents, setIsLoadingPastEvents] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/store/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingEvents(false));

    fetch(`${API_URL}/store/past-events`)
      .then((res) => res.json())
      .then(async (data) => {
        const eventsWithImages = await Promise.all(
          data.map(async (event) => {
            try {
              const response = await fetch(`${API_URL}/events/${event.id}/images`);
              const images = await response.json();
              return { ...event, images };
            } catch (err) {
              console.error(err);
              return { ...event, images: [] };
            }
          })
        );

        setPastEvents(eventsWithImages);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingPastEvents(false));
  }, []);

  return (
    <main className="store-page">
      <section className="store-landing">
        <h1>sammyinthesky</h1>
        <p>Handmade jewelry, stickers, 3D prints, and crafts.</p>
        <Link className="store-product-link" to="/products">
          View Products
        </Link>
        <div className="store-social-links">
          <a href="https://www.instagram.com/" rel="noreferrer" target="_blank">
            Instagram
          </a>
          <a href="https://www.facebook.com/" rel="noreferrer" target="_blank">
            Facebook
          </a>
          <a href="mailto:">Email</a>
        </div>
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

      <section className="store-events-section store-past-events-section">
        <h2>Past Events</h2>

        {isLoadingPastEvents && <p>Loading past events...</p>}

        {!isLoadingPastEvents && pastEvents.length === 0 && (
          <p>No past event photos are listed yet.</p>
        )}

        {!isLoadingPastEvents && pastEvents.length > 0 && (
          <div className="store-past-events">
            {pastEvents.map((event) => (
              <article className="store-past-event" key={event.id}>
                <div className="store-past-event-copy">
                  <p className="store-event-date">{formatEventDate(event)}</p>
                  <h3>{event.title}</h3>
                  {event.location && <p>{event.location}</p>}
                  {event.description && <p>{event.description}</p>}
                </div>

                {event.images.length > 0 && (
                  <div className="store-event-gallery">
                    {event.images.map((image) => (
                      <img
                        key={image.id}
                        src={getImageSrc(image.image_url)}
                        alt={`${event.title} photo`}
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Store;
