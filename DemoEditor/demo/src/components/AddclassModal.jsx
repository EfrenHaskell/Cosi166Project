import React, { useEffect, useState } from "react";

function AddclassModal({ onClose }) {
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:8000/api";

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      const data = await res.json();
      if (data && data.classes) {
        setClasses(data.classes);
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const body = { name: name.trim(), section: section.trim(), description: description.trim() };
      const res = await fetch(`${API_BASE}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data && data.status === "success") {
        // Refresh classes
        await fetchClasses();
        // clear inputs
        setName("");
        setSection("");
        setDescription("");
      } else {
        alert(`Failed to create class: ${data?.message || "unknown"}`);
      }
    } catch (err) {
      console.error("Error creating class:", err);
      alert("Could not create class");
    }
  };

  const handleDelete = async (class_id) => {
    if (!window.confirm("Delete this class section?")) return;
    try {
      const res = await fetch(`${API_BASE}/classes/${class_id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      const data = await res.json();
      if (data && data.status === "success") {
        setClasses((prev) => prev.filter((c) => c.class_id !== class_id));
      }
    } catch (err) {
      console.error("Error deleting class:", err);
      alert("Could not delete class");
    }
  };

  return (
    <div className="Addclass-Modal">
      <div className="classModal-header">
        <h2 className="classModal-title">Class Sessions</h2>
        <button className="classModal-closeButton" onClick={onClose}>
          X
        </button>
      </div>

      <div className="classModal-content">
        <form onSubmit={handleCreate} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
          <input
            className="teacherInput"
            placeholder="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="teacherInput"
            placeholder="Section (optional)"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
          <input
            className="teacherInput"
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button style={{ backgroundColor: "#007bff", color: "white", border: "none", borderRadius: 4, padding: "8px 12px" }} type="submit">
            Add
          </button>
        </form>

        <div style={{ maxHeight: "60%", overflowY: "auto" }}>
          {loading ? (
            <div>Loading classes...</div>
          ) : classes.length === 0 ? (
            <div style={{ color: "#999", fontStyle: "italic" }}>No class sections yet.</div>
          ) : (
            <ul className="classModal-list" style={{ listStyle: "none", padding: 0 }}>
              {classes.map((c) => (
                <li key={c.class_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #eee" }}>
                  <div>
                    <strong>{c.name}</strong>
                    {c.section ? <div style={{ color: "#666", fontSize: "0.9rem" }}>Section: {c.section}</div> : null}
                    {c.description ? <div style={{ color: "#666", fontSize: "0.9rem" }}>{c.description}</div> : null}
                    {c.join_code ? (
                      <div style={{ color: "#007bff", fontSize: "0.85rem", fontWeight: "600", marginTop: "4px" }}>
                        Join Code: <span style={{ backgroundColor: "#e7f3ff", padding: "2px 6px", borderRadius: "3px" }}>{c.join_code}</span>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <button onClick={() => handleDelete(c.class_id)} style={{ backgroundColor: "#ff4d4f", color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px" }}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddclassModal;
