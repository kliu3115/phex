import React, { useEffect, useState } from "react";

type ColorAmount = {
  color: string;
  amount: number;
};

type PaintMix = {
  id: number;
  targetColor: string;
  targetAmount: number | null;
  availableColors: ColorAmount[];
  recommendedMix: ColorAmount[] | null;
  createdAt: string;
  notes: string;
};

function getContrastColor(hex: string = "#000000") {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180 ? "#000" : "#fff";
}

function getBorderColor(hex: string = "#ffffff") {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  return brightness > 250
    ? `rgb(${Math.max(r - 60, 0)}, ${Math.max(g - 60, 0)}, ${Math.max(b - 60, 0)})`
    : "none";
}

const History: React.FC = () => {
  const [history, setHistory] = useState<PaintMix[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const isLoggedIn = !!token;

  function toCamelCase(item: any): PaintMix {
    return {
      id: item.id,
      targetColor: item.target_color,
      targetAmount: item.target_amount,
      availableColors:
        typeof item.available_colors === "string"
          ? JSON.parse(item.available_colors)
          : item.available_colors,
      recommendedMix: item.recommended_mix
        ? typeof item.recommended_mix === "string"
          ? JSON.parse(item.recommended_mix)
          : item.recommended_mix
        : null,
      createdAt: item.created_at,
      notes: item.notes || "",
    };
  }

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.map(toCamelCase));
    } catch (err: any) {
      setError(err.message || "Error fetching history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setHistory((h) => h.filter((entry) => entry.id !== id));
    } catch (err: any) {
      setError(err.message || "Error deleting item");
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchHistory();
    else setLoading(false);
  }, []);

  return (
    <div>
      <h1>Mix History</h1>
      <div>
        {error && <p className="text-red-500">{error}</p>}
        {!isLoggedIn ? (
          <p>Please
            <a href="/login" style={{color: "#2247cf", textDecoration: 'none'}}> log in </a> 
          to view your history.</p>
        ) : loading ? (
          <p>Loading history...</p>
        ) : history.length === 0 ? (
          <p>No history yet.</p>
        ) : (
          <ul className="history-container" style={{ listStyleType: "none", paddingLeft: 0 }}>
            {history.map(
              ({
                id,
                targetColor,
                targetAmount,
                availableColors,
                recommendedMix,
                notes,
                createdAt,
              }) => (
                <li key={id} className="mb-6 border p-4 rounded shadow-sm">
                  {/* Target */}
                  <div className="history-entry">
                    <span>
                    <strong>Target Color:</strong> {targetAmount} mL of{" "}
                    <span
                      className="color-box"
                      data-hex={targetColor}
                      style={{
                        backgroundColor: targetColor,
                        border: `1px solid ${getBorderColor(targetColor)}`,
                      }}
                    />
                  </span>
                    <button
                      onClick={() => handleDelete(id)}
                      className="deleteButton"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="24px" fill="#EA3323"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                    </button>
                  </div>
                  {/* Available */}
                  <p>
                    <strong>Available:</strong>{" "}
                    {availableColors.map((c, idx) => (
                      <span key={idx} className="mr-2">
                        {c.amount} mL of{" "}
                        <span
                        className="color-box"
                        data-hex={c.color}
                        style={{
                          backgroundColor: c.color,
                          border: `1px solid ${getBorderColor(c.color)}`,
                        }}
                        >
                        </span>
                          {Array.isArray(availableColors) && idx < availableColors.length - 1 && <strong>, </strong>}
                      </span>
                    ))}
                  </p>

                  {/* Recommended Mix & Summary */}
                  <p>
                    <strong>Recommended Mix:</strong>{" "}
                    {recommendedMix && recommendedMix.length > 0 ? (
                      <>
                        {recommendedMix.map((c, idx) => (
                          <span key={idx} className="mr-2">
                            {c.amount} mL of{" "}
                            <span
                            className="color-box"
                            data-hex={c.color}
                            style={{
                              backgroundColor: c.color,
                              border: `1px solid ${getBorderColor(c.color)}`,
                            }}
                            >
                            </span>
                            {idx < recommendedMix.length - 1 && <strong> + </strong>}
                          </span>
                        ))}
                        <span> ≈ {targetAmount} mL of </span>
                        <span
                          className="color-box"
                          data-hex={targetColor}
                          style={{
                            backgroundColor: targetColor,
                            border: `1px solid ${getBorderColor(targetColor)}`,
                          }}
                        />
                      </>
                    ) : (
                      "N/A"
                    )}
                  </p>

                  {/* Notes */}
                  <p>
                    <strong>Notes:</strong> {notes}
                  </p>

                  {/* Timestamp & Delete */}
                    <span className="text-sm text-gray-500">
                      Created: {new Date(createdAt).toLocaleString()}     
                    </span> <span>       </span>
                  <hr />
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default History;
