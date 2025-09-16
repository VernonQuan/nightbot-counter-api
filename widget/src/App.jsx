import { useEffect, useState } from "react";
import "./CounterWidget.css";

export default function CounterWidget() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Dynamically pick ws or wss depending on page protocol
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host; // includes domain + port
    const ws = new WebSocket(`${protocol}://${host}`);

    ws.onmessage = (event) => setCount(event.data);
    ws.onerror = (err) => console.error("WebSocket error:", err);

    return () => ws.close();
  }, []);

  return (
    <div className="pill">
      <div className="label">Spins</div>
      <div className="number">{count}</div>
    </div>
  );
}
