import { useEffect, useState } from "react";
import axios from "axios";

interface PaintColor {
  hex: string;
  amount: string;
}

interface PaintMix {
  result: string;
  availableColors: PaintColor[];
  desiredColor: PaintColor;
  timestamp?: string;
  recommendedMix?: PaintColor[];
}

{/*function getContrastColor(hex: string = "#000000") {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#") || hex.length !== 7) {
    hex = "#000000"; // fallback to black
  }

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 250 ? "#000" : "#fff"; // black text for light colors
}*/}

function getBorderColor(hex: string = "#ffffff") {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#") || hex.length !== 7) {
    return "#ccc";
  }

  const r = Math.max(parseInt(hex.slice(1, 3), 16), 0);
  const g = Math.max(parseInt(hex.slice(3, 5), 16), 0);
  const b = Math.max(parseInt(hex.slice(5, 7), 16), 0);

  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

  return brightness > 250 ? `rgb(${r - 60}, ${g - 60}, ${b - 60})` : 'none';
}

export default function PaintCalculator() {
  const [recommendedMix, setRecommendedMix] = useState<PaintColor[] | null>(null);
  const [resultTarget, setResultTarget] = useState<{ hex: string; amount: string } | null>(null);
  const [availableColors, setAvailableColors] = useState<PaintColor[]>([
    { hex: "#ffffff", amount: "" },
  ]);
  const [desiredColor, setDesiredColors] = useState<PaintColor>({
    hex: "#ffffff",
    amount: "",
  });
  const [results, setResults] = useState<string | null>(null);
  const [history, setHistory] = useState<PaintMix[]>(() => {
    const stored = localStorage.getItem("paintMixHistory");
    return stored ? JSON.parse(stored) : [];
  });
  //const [hasCalculated, setHasCalculated] = useState(false);

  useEffect(() => {
    localStorage.setItem("paintMixHistory", JSON.stringify(history));
  }, [history]);

  async function syncMixToServer(mix: PaintMix) {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
    await axios.post(
      "/api/history/index",
      {
        target_color: mix.desiredColor.hex,
        target_amount: parseFloat(mix.desiredColor.amount) || 0,
        available_colors: mix.availableColors.map(c => ({
          color: c.hex,
          amount: parseFloat(c.amount) || 0,
        })),
        recommended_mix:(mix.recommendedMix || []).map(c => ({
          color: c.hex,
          amount: parseFloat(c.amount ?? "0") || 0,
        })),
        notes: mix.result,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    } catch (error) {
      console.error("Failed to sync mix to server:", error);
    }
  }

  const addToHistory = (entry: PaintMix) => {
    const timestamp = new Date().toISOString();
    const entryWithTimestamp = { ...entry, timestamp };
    setHistory((prev) => [entryWithTimestamp, ...prev]);
    syncMixToServer(entryWithTimestamp);
  };

  //const clearHistory = () => setHistory([]);

const handleCalculate = async () => {
  //setHasCalculated(true);

  if (availableColors.length === 0) {
    setResults("No available colors to mix.");
    return;
  }

  const totalAmount = availableColors.reduce((sum, c) => {
    const parsed = parseFloat(c.amount);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  if (totalAmount === 0) {
    setResults("Total amount of paint must be greater than zero.");
    return;
  }

  try {
    setResults("Calculating...");
    setRecommendedMix([]);
    const token = localStorage.getItem("token");

    const aiResponse = await axios.post(
      "/api/calculate",
      {
        target_color: desiredColor.hex,
        target_amount: desiredColor.amount,
        available_colors: availableColors.map((c) => ({
          color: c.hex,
          amount: parseFloat(c.amount),
        })),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("AI Response:", aiResponse.data); // 🔍 Debug the response

    const rawRecommendedMix = aiResponse.data?.recommended_mix ?? [];
    const recommended_mix: PaintColor[] = rawRecommendedMix.map(
      (c: { hex: string; amount: number }) => ({
        hex: c.hex,
        amount: c.amount.toString(),
      })
    );
    const targetColor = aiResponse.data?.target?.color ?? desiredColor.hex;
    const targetAmount = aiResponse.data?.target?.amount ?? desiredColor.amount;
    const notes = aiResponse.data?.notes ?? "";

    {/*const mixDescription = recommended_mix.length
      ? recommended_mix.map(
          (c: { amount: number; color: string }) =>
            `${c.amount} mL of ${c.color}`
        ).join(" + ")
      : "No recommended mix provided";*/}

    const resultSummary = `${notes}`;

    const entry: PaintMix = {
      desiredColor,
      availableColors,
      recommendedMix: recommended_mix,
      result: resultSummary,
    };
    addToHistory(entry);
    setResults(resultSummary);
    setRecommendedMix(recommended_mix.length > 0 ? recommended_mix : null);
    setResultTarget({ hex: targetColor, amount: targetAmount.toString() });
  } catch (err) {
    console.error("Error during calculation:", err);
if (axios.isAxiosError(err) && err.response?.status === 429) {
      setResults("Please slow down your calls — you’re hitting the rate limit.");
    } else {
      setResults("An error occurred while calculating or saving the result.");
    }
  }
};


  return (
    <div className="paint-calculator">
      <h1>Paint Calculator</h1>
      {/* Available Colors Input */}
      <div className="mb-4">
        <label>Available Colors:</label> 
        {availableColors.map((color, index) => (
          <div key={index} className="color-input-group">
            <input
              type="color"
              value={color.hex}
              onChange={(e) => {
                const newColors = [...availableColors];
                newColors[index].hex = e.target.value;
                setAvailableColors(newColors);
              }}
              className="mr-2"
            />
            <div className="amount-group"> 
              <input
              type="text"
              placeholder="Amount (ml)"
              value={color.amount}
              onChange={(e) => {
                const newColors = [...availableColors];
                newColors[index].amount = e.target.value;
                setAvailableColors(newColors);
              }}
              className="border px-2 py-1"
            />
            </div>
            <button
              onClick={() =>
                setAvailableColors((prev) =>
                  prev.filter((_, i) => i !== index)
                )
              }
              className="ml-2 text-red-600 hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="24px" fill="#EA3323"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setAvailableColors([...availableColors, { hex: "#ffffff", amount: "" }])
          }
          className="add-color-button"
        >
          + Add Color
        </button>
        {/* Desired Color Input */}
        <div className="desired-color-section">
          <label className="block mb-1 font-semibold">Desired Color:</label> 
          <div className="color-input-group">
          <input
            type="color"
            value={desiredColor.hex}
            onChange={(e) =>
              setDesiredColors((prev) => ({ ...prev, hex: e.target.value }))
            }
            className="mr-2"
          />
          <div className="amount-group"> 
            <input
              type="text"
              placeholder="Amount (ml)"
              value={desiredColor.amount}
              onChange={(e) =>
                setDesiredColors((prev) => ({ ...prev, amount: e.target.value }))
              }
              className="border px-2 py-1"
            />
          </div>
          <button style={{border: 'none', padding:"5px 15px"}}> </button>
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        className="calculate-button"
      >
        Calculate Mix
      </button>

      {/* Results */}
      {results && (
        <div className="mt-4 p-4 bg-gray-100 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Results:</h3>
          {recommendedMix && recommendedMix.length > 0 && (
            <p>
              <strong>Recommended Mix:</strong>{" "}
              {recommendedMix.map((c, index) => (
                <span key={index} style={{ marginRight: "8px" }}>
                  {c.amount ?? "?"} mL of{" "}
                  <span
                      className="color-box"
                      data-hex={c.hex}
                      style={{
                        backgroundColor: c.hex,
                        border: `1px solid ${getBorderColor(c.hex)}`,
                      }}
                    />
                  {index < recommendedMix.length - 1 && <strong> +</strong>}
                </span>
              ))}
              <span>≈ {resultTarget?.amount} mL of </span> 
              <span
                className="color-box"
                data-hex={resultTarget?.hex}
                style={{
                  backgroundColor: resultTarget?.hex,
                  border: `1px solid ${getBorderColor(resultTarget?.hex)}`,
                }}
              />
              <h3></h3> <strong>Notes: </strong> <br /> 
            </p>
          )}
          <p className="mb-2">{results}</p>
        </div>
      )}

      {/* History Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Mix History</h2>
        {/*<button
          onClick={clearHistory}
          className="mb-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
        >
          Clear History
        </button>*/}

        {history.length === 0 ? (
          <p>No history yet.</p>
        ) : (
        <div className="history-container">
          <ul style={{ listStyleType: "none", paddingLeft: 10 }}>
          {history.map((entry, i) => (
            <li key={i}>
              <div className="history-entry">
              <span>
                <strong>Target Color:</strong>{" "}
                {entry.desiredColor.amount} mL of {" "}
                <span
                  className="color-box"
                  data-hex={entry.desiredColor.hex}
                  style={{
                    backgroundColor: entry.desiredColor.hex,
                    border: `1px solid ${getBorderColor(entry.desiredColor.hex)}`,
                  }}
                />
              </span>
              <button
                onClick={() => setHistory((prev) => prev.filter((_, index) => index !== i))}
                className="deleteButton"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="24px" fill="#EA3323"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
              </button> </div>
              <p>
                <strong>Available:</strong>{" "}
                {entry.availableColors.map((c, index) => (
                  <span key={index}>
                    {c.amount} mL of{" "}
                    <span
                      className="color-box"
                      data-hex={c.hex}
                      style={{
                        backgroundColor: c.hex,
                        border: `1px solid ${getBorderColor(c.hex)}`,
                      }}
                    />
                    {Array.isArray(entry.availableColors) && index < entry.availableColors.length - 1 && <strong>, </strong>}
                  </span>
                ))}
              </p>
              <p>
                <strong>Recommended Mix:</strong>{" "}
                {Array.isArray(entry.recommendedMix) && entry.recommendedMix.length > 0 ? (
                  <>
                    {entry.recommendedMix.map((c, index) => (
                      <span key={index} style={{ marginRight: "8px" }}>
                        {c.amount ?? "?"} mL of{" "}
                        <span
                          className="color-box"
                          data-hex={c.hex}
                          style={{
                            backgroundColor: c.hex,
                            border: `1px solid ${getBorderColor(c.hex)}`,
                          }}
                        />
                        {Array.isArray(entry.recommendedMix) && index < entry.recommendedMix.length - 1 && <strong> +</strong>}
                      </span>
                    ))}
                    <span>≈ {entry.desiredColor?.amount ?? "?"} mL of </span>
                    <span
                      className="color-box"
                      data-hex={entry.desiredColor?.hex}
                      style={{
                        backgroundColor: entry.desiredColor?.hex,
                        border: `1px solid ${getBorderColor(entry.desiredColor?.hex)}`,
                      }}
                    />
                  </>
                ) : (
                  "N/A"
                )}
              </p>
              <p>
                <strong>Notes:</strong> {entry.result}
              </p>
              <hr />
            </li>
          ))}
        </ul>
      </div>
        )}
      </div>
    </div>
  );
}
