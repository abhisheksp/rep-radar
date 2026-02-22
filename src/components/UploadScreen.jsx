import { useState, useCallback, useRef } from "react";
import { ADAPTERS } from "../adapters/index.js";

const COLORS = {
  bg: "#0a0e17",
  card: "#111827",
  cardBorder: "#1e293b",
  cardBorderHover: "#2d3f55",
  accent: "#f59e0b",
  accentDim: "rgba(245, 158, 11, 0.12)",
  accentBorder: "rgba(245, 158, 11, 0.35)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#475569",
  green: "#10b981",
  red: "#ef4444",
  redDim: "rgba(239, 68, 68, 0.12)",
  orange: "#f97316",
};

export default function UploadScreen({ onParsed }) {
  const [selectedAdapterId, setSelectedAdapterId] = useState(ADAPTERS[0]?.meta.id || "");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const selectedAdapter = ADAPTERS.find((a) => a.meta.id === selectedAdapterId);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.name.endsWith(".csv")) {
        setError("Please upload a .csv file.");
        return;
      }
      if (!selectedAdapter) {
        setError("Please select a workout source.");
        return;
      }

      setError(null);
      setLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvString = e.target.result;
          const entries = selectedAdapter.parse(csvString);
          if (!entries || entries.length === 0) {
            setError(
              "No barbell lift data found in this file. Make sure you selected the correct source and exported the right CSV."
            );
            setLoading(false);
            return;
          }
          onParsed(entries);
        } catch (err) {
          setError(`Failed to parse file: ${err.message}`);
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Could not read file.");
        setLoading(false);
      };
      reader.readAsText(file);
    },
    [selectedAdapter, onParsed]
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);

  const onFileInputChange = (e) => {
    handleFile(e.target.files[0]);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "'Outfit', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.orange})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              flexShrink: 0,
            }}
          >
            🏋️
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                background: `linear-gradient(135deg, ${COLORS.text}, ${COLORS.accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Rep Radar
            </h1>
            <p
              style={{
                margin: 0,
                color: COLORS.textMuted,
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Lift progression · Rep-max normalization
            </p>
          </div>
        </div>

        {/* Step 1: Select source */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              color: COLORS.textMuted,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 8,
            }}
          >
            Step 1 — Your workout app
          </label>
          <select
            value={selectedAdapterId}
            onChange={(e) => {
              setSelectedAdapterId(e.target.value);
              setError(null);
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${COLORS.cardBorder}`,
              background: COLORS.card,
              color: COLORS.text,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 16px center",
              outline: "none",
            }}
          >
            {ADAPTERS.map((a) => (
              <option key={a.meta.id} value={a.meta.id}>
                {a.meta.name}
              </option>
            ))}
          </select>
          {selectedAdapter && (
            <p
              style={{
                margin: "8px 0 0",
                color: COLORS.textDim,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {selectedAdapter.meta.description}
            </p>
          )}
        </div>

        {/* Export instructions */}
        {selectedAdapter && selectedAdapter.meta.exportInstructions && (
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                color: COLORS.textMuted,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 10,
              }}
            >
              How to export from {selectedAdapter.meta.name}
            </div>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {selectedAdapter.meta.exportInstructions.map((step, i) => (
                <li
                  key={i}
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 13,
                    marginBottom: i < selectedAdapter.meta.exportInstructions.length - 1 ? 6 : 0,
                    lineHeight: 1.5,
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Step 2: Upload */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              color: COLORS.textMuted,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 8,
            }}
          >
            Step 2 — Upload your CSV
          </label>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !loading && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${
                isDragging ? COLORS.accent : COLORS.cardBorder
              }`,
              borderRadius: 16,
              padding: "40px 24px",
              textAlign: "center",
              cursor: loading ? "default" : "pointer",
              background: isDragging ? COLORS.accentDim : COLORS.card,
              transition: "all 0.2s",
            }}
          >
            {loading ? (
              <div>
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 12,
                    animation: "spin 1s linear infinite",
                  }}
                >
                  ⏳
                </div>
                <p
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 14,
                    margin: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Parsing your data…
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 36, marginBottom: 12 }}>
                  {isDragging ? "📂" : "📁"}
                </div>
                <p
                  style={{
                    color: isDragging ? COLORS.accent : COLORS.text,
                    fontSize: 15,
                    fontWeight: 600,
                    margin: "0 0 6px",
                  }}
                >
                  {isDragging ? "Drop it!" : "Tap to upload or drag & drop"}
                </p>
                <p
                  style={{
                    color: COLORS.textDim,
                    fontSize: 12,
                    margin: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  .csv files only
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={onFileInputChange}
          />
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: COLORS.redDim,
              border: `1px solid ${COLORS.red}`,
              borderRadius: 10,
              padding: "12px 16px",
              color: COLORS.red,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.5,
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Footer */}
        <p
          style={{
            marginTop: 32,
            textAlign: "center",
            color: COLORS.textDim,
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          All processing happens locally — your data never leaves your device.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
