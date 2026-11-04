import { useEffect, useState } from "react";
import axios from "../api/axiosInstance";
import "./PublicRental.css";

const API_URL = "http://localhost:5000/api/public-rentals";

function PublicRental() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    rental_services_id: "",
    applicant_name: "",
    applicant_phone: "",
    note: "",
  });

  // Load available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API_URL}/rooms`);
        setRooms(response.data.rooms);
      } catch (err) {
        setError("Failed to load available rooms. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Handle form changes
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Submit rental request
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.rental_services_id) {
      setError("Please select a room or shop.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/requests`, {
        ...form,
        rental_services_id: Number(form.rental_services_id),
      });

      setSuccess(
        `Request submitted successfully! Your request ID is ${response.data.request.request_id}.`,
      );

      setForm({
        rental_services_id: "",
        applicant_name: "",
        applicant_phone: "",
        note: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit your request. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-rental-page">
      <header className="public-rental-header">
        <h1>Municipal Rental Portal</h1>
        <p>Find an available room or shop and submit your rental request.</p>
      </header>

      <main className="public-rental-container">
        <section className="available-rooms">
          <h2>Available Rooms & Shops</h2>

          {loading && <p>Loading available rooms...</p>}

          {!loading && !error && rooms.length === 0 && (
            <p>No rooms or shops are currently available.</p>
          )}

          <div className="rooms-grid">
            {rooms.map((room) => (
              <article className="room-card" key={room.rental_services_id}>
                <h3>{room.building_name}</h3>

                <p>
                  <strong>Room/Shop:</strong> {room.services_no}
                </p>
                <p>
                  <strong>Location:</strong> {room.location}
                </p>
                <p>
                  <strong>Floor:</strong> {room.floor}
                </p>
                <p>
                  <strong>Monthly Rent:</strong> {room.rent}
                </p>

                {room.description && (
                  <p>
                    <strong>Details:</strong> {room.description}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      rental_services_id: String(room.rental_services_id),
                    })
                  }
                >
                  Select This Room
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="rental-request-section">
          <h2>Submit a Rental Request</h2>

          {error && <p className="rental-message error">{error}</p>}
          {success && <p className="rental-message success">{success}</p>}

          <form onSubmit={handleSubmit}>
            <label htmlFor="rental_services_id">Selected Room/Shop</label>

            <select
              id="rental_services_id"
              name="rental_services_id"
              value={form.rental_services_id}
              onChange={handleChange}
              required
            >
              <option value="">Select a room or shop</option>

              {rooms.map((room) => (
                <option
                  key={room.rental_services_id}
                  value={room.rental_services_id}
                >
                  {room.building_name} — {room.services_no} — {room.rent}
                </option>
              ))}
            </select>

            <label htmlFor="applicant_name">Full Name</label>
            <input
              id="applicant_name"
              type="text"
              name="applicant_name"
              value={form.applicant_name}
              onChange={handleChange}
              maxLength={100}
              required
            />

            <label htmlFor="applicant_phone">Phone Number</label>
            <input
              id="applicant_phone"
              type="tel"
              name="applicant_phone"
              value={form.applicant_phone}
              onChange={handleChange}
              maxLength={30}
              required
            />

            <label htmlFor="note">Additional Note (Optional)</label>
            <textarea
              id="note"
              name="note"
              value={form.note}
              onChange={handleChange}
              maxLength={500}
              rows={4}
            />

            <button type="submit" disabled={submitting || loading}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default PublicRental;
