import React, { useRef, useState } from "react";
import ReactDOM from "react-dom/client";

function MemeGameApp() {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInput = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert("Please select an image.");
    setSubmitting(true);
    setResult(null);
    const formData = new FormData();
    formData.append("image", image);
    formData.append("caption", caption);
    // Optionally: Telegram WebApp user info
    try {
      const res = await fetch("https://us-central1-sonic-red-dragon.cloudfunctions.net/telegramWebhook/submit-meme", {
        method: "POST",
        body: formData, 
      });
      const data = await res.json();
      setResult(data.success ? "Meme submitted!" : data.error || "Error");
      setPreviewUrl(data.previewUrl || previewUrl);
    } catch (err) {
      setResult("Error submitting meme.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Red Dragon Meme Game</h1>
      <form onSubmit={handleSubmit}>
        <label>Choose or upload an image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInput}
        />
        {previewUrl && <img src={previewUrl} alt="Preview" />}
        <label>Caption</label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add your meme caption here"
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Meme"}
        </button>
      </form>
      {result && <div style={{ marginTop: 20, color: result.includes("Error") ? "#ff5252" : "#ffb300" }}>{result}</div>}
      <div style={{ marginTop: 40, fontSize: "0.95em", color: "#aaa" }}>
        <b>How it works:</b> Upload a meme, add a caption, and submit! Your meme will appear in the Red Dragon bot and earn you points when used in chats.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MemeGameApp />);
