import { useEffect, useState } from "react";
import "./CounterWidget.css";

export default function CounterWidget() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const ws = new WebSocket("wss://nightbot-counter-api.onrender.com");

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
