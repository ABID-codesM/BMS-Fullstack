import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "./ManagerRentalRequests.css";

function ManagerRentalRequests() {
  const [requests, setRequests] = useState([]);
  const [buildings, setBuildings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("Approved");
  const [reviewNote, setReviewNote] = useState("");

  const fetchBuildings = async () => {
    try {
      const response = await axiosInstance.get("/manager/buildings");
      setBuildings(response.data.buildings || []);
    } catch (err) {
      console.error("Buildings loading error:", err);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (buildingFilter) {
        params.building_id = buildingFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await axiosInstance.get("/manager/rental-requests", {
        params,
      });

      setRequests(response.data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load rental requests.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [buildingFilter, statusFilter]);

  const openReviewModal = (request, status) => {
    setReviewingRequest(request);
    setReviewStatus(status);
    setReviewNote("");
    setError("");
    setSuccess("");
  };

  const handleReview = async (e) => {
    e.preventDefault();

    if (!reviewingRequest) return;

    try {
      setError("");
      setSuccess("");

      await axiosInstance.patch(
        `/manager/rental-requests/${reviewingRequest.request_id}`,
        {
          status: reviewStatus,
          review_note: reviewNote,
        },
      );

      setSuccess(`Rental request ${reviewStatus.toLowerCase()} successfully.`);

      setReviewingRequest(null);
      setSelectedRequest(null);

      await fetchRequests();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to review rental request.",
      );
    }
  };

  const filteredRequests = requests.filter((request) => {
    const searchText = search.toLowerCase();

    return (
      String(request.applicant_name || "")
        .toLowerCase()
        .includes(searchText) ||
      String(request.applicant_phone || "")
        .toLowerCase()
        .includes(searchText) ||
      String(request.services_no || "")
        .toLowerCase()
        .includes(searchText) ||
      String(request.building_name || "")
        .toLowerCase()
        .includes(searchText)
    );
  });

  const getStatusClass = (status) => {
    switch (status) {
      case "Pending":
        return "mrr-pending";
      case "Approved":
        return "mrr-approved";
      case "Rejected":
        return "mrr-rejected";
      default:
        return "";
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString();
  };

  return (
    <div className="mrr-page">
      <div className="mrr-header">
        <div>
          <h2>Rental Requests</h2>
          <p>Review rental applications in your assigned buildings.</p>
        </div>

        <div className="mrr-total">
          <span>Total Requests</span>
          <strong>{requests.length}</strong>
        </div>
      </div>

      {error && <div className="mrr-alert mrr-error">{error}</div>}

      {success && <div className="mrr-alert mrr-success">{success}</div>}

      <div className="mrr-stats">
        <div>
          <span>Pending</span>
          <strong>
            {requests.filter((r) => r.status === "Pending").length}
          </strong>
        </div>

        <div>
          <span>Approved</span>
          <strong>
            {requests.filter((r) => r.status === "Approved").length}
          </strong>
        </div>

        <div>
          <span>Rejected</span>
          <strong>
            {requests.filter((r) => r.status === "Rejected").length}
          </strong>
        </div>
      </div>

      <div className="mrr-filters">
        <input
          type="text"
          placeholder="Search applicant, phone, service..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
        >
          <option value="">All Buildings</option>

          {buildings.map((building) => (
            <option key={building.building_id} value={building.building_id}>
              {building.building_name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="mrr-message">Loading Rental Requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="mrr-message">No Rental Requests found.</div>
      ) : (
        <div className="mrr-table-wrapper">
          <table className="mrr-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Applicant</th>
                <th>Phone</th>
                <th>Building</th>
                <th>Service No.</th>
                <th>Monthly Rent</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRequests.map((request, index) => (
                <tr key={request.request_id}>
                  <td>{index + 1}</td>
                  <td>{request.applicant_name}</td>
                  <td>{request.applicant_phone}</td>
                  <td>{request.building_name}</td>
                  <td>{request.services_no}</td>
                  <td>{Number(request.rent || 0).toLocaleString()}</td>
                  <td>{formatDate(request.request_date)}</td>
                  <td>
                    <span
                      className={`mrr-status ${getStatusClass(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <div className="mrr-actions">
                      <button
                        className="mrr-view-btn"
                        onClick={() => setSelectedRequest(request)}
                      >
                        View
                      </button>

                      {request.status === "Pending" && (
                        <>
                          <button
                            className="mrr-approve-btn"
                            onClick={() => openReviewModal(request, "Approved")}
                          >
                            Approve
                          </button>

                          <button
                            className="mrr-reject-btn"
                            onClick={() => openReviewModal(request, "Rejected")}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Details Modal */}

      {selectedRequest && (
        <div
          className="mrr-modal-overlay"
          onClick={() => setSelectedRequest(null)}
        >
          <div className="mrr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mrr-modal-header">
              <h3>Rental Request Details</h3>
              <button onClick={() => setSelectedRequest(null)}>×</button>
            </div>

            <div className="mrr-details">
              <p>
                <strong>Request ID:</strong> {selectedRequest.request_id}
              </p>
              <p>
                <strong>Applicant:</strong> {selectedRequest.applicant_name}
              </p>
              <p>
                <strong>Phone:</strong> {selectedRequest.applicant_phone}
              </p>
              <p>
                <strong>Building:</strong> {selectedRequest.building_name}
              </p>
              <p>
                <strong>Service No:</strong> {selectedRequest.services_no}
              </p>
              <p>
                <strong>Monthly Rent:</strong>{" "}
                {Number(selectedRequest.rent || 0).toLocaleString()}
              </p>
              <p>
                <strong>Request Date:</strong>{" "}
                {formatDate(selectedRequest.request_date)}
              </p>
              <p>
                <strong>Status:</strong> {selectedRequest.status}
              </p>
              <p>
                <strong>Applicant Note:</strong> {selectedRequest.note || "-"}
              </p>
              <p>
                <strong>Review Note:</strong>{" "}
                {selectedRequest.review_note || "-"}
              </p>
              <p>
                <strong>Reviewed At:</strong>{" "}
                {formatDate(selectedRequest.reviewed_at)}
              </p>
            </div>

            <button
              className="mrr-close-btn"
              onClick={() => setSelectedRequest(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}

      {reviewingRequest && (
        <div className="mrr-modal-overlay">
          <div className="mrr-modal">
            <div className="mrr-modal-header">
              <h3>
                {reviewStatus === "Approved" ? "Approve" : "Reject"} Request
              </h3>

              <button onClick={() => setReviewingRequest(null)}>×</button>
            </div>

            <form onSubmit={handleReview}>
              <p>
                Are you sure you want to {reviewStatus.toLowerCase()} the
                request from <strong>{reviewingRequest.applicant_name}</strong>?
              </p>

              <label>Review Note (Optional)</label>

              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows="4"
                placeholder="Write a review note..."
              />

              <div className="mrr-form-actions">
                <button
                  type="button"
                  className="mrr-cancel-btn"
                  onClick={() => setReviewingRequest(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    reviewStatus === "Approved"
                      ? "mrr-approve-btn"
                      : "mrr-reject-btn"
                  }
                >
                  Confirm {reviewStatus}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerRentalRequests;
