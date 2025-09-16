import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { WebSocketServer } from "ws";
import { isEmpty } from "./util.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let db;
(async () => {
  db = await open({
    filename: "./counter.db",
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS counter (
      id INTEGER PRIMARY KEY,
      value INTEGER
    )
  `);

  const row = await db.get("SELECT * FROM counter WHERE id = 1");
  if (!row) {
    await db.run("INSERT INTO counter (id, value) VALUES (1, 0)");
  }
})();

// Create a WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Helper to broadcast new counter value to all clients
function broadcast(value) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(value.toString());
  });
}

app.get("/widget", (req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Counter Widget</title>
<style>
  body {
    margin: 0;
    background: transparent;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
  }

  .roulette {
    width: 200px;
    height: 200px;
    border: 10px solid #222;
    border-radius: 50%;
    background: radial-gradient(circle at center, #fff 0%, #ff0000 60%, #000 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 20px rgba(0,0,0,0.7);
    position: relative;
  }

  .number {
    font-family: 'Arial', sans-serif;
    font-size: 72px;
    color: white;
    font-weight: bold;
    text-shadow: 0 0 10px #000;
    z-index: 1;
  }

  /* Optional decorative tick marks around the wheel */
  .roulette::before {
    content: "";
    position: absolute;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    border: 4px dashed rgba(255,255,255,0.4);
    box-sizing: border-box;
  }
</style>
</head>
<body>
  <div class="roulette">
    <div class="number" id="counter">0</div>
  </div>

  <script>
    const counterEl = document.getElementById("counter");
    const ws = new WebSocket("wss://nightbot-counter-api.onrender.com");

    ws.onmessage = (event) => {
      counterEl.textContent = event.data;
    };
  </script>
</body>
</html>
  `);
});

// Get value
app.get("/value", async (req, res) => {
  const row = await db.get("SELECT value FROM counter WHERE id = 1");
  res.send(row.value.toString());
});

// Increment
app.get("/increment", async (req, res) => {
  const amount = isEmpty(req?.query?.amount) || req.query.amount < 1 ? 1 : parseInt(req.query.amount);
  await db.run("UPDATE counter SET value = value + ? WHERE id = 1", [amount]);
  const row = await db.get("SELECT value FROM counter WHERE id = 1");
  broadcast(row.value); // <-- push new value to all WS clients
  res.send(row.value.toString());
});

// Decrement
app.get("/decrement", async (req, res) => {
  const amount = isEmpty(req?.query?.amount) || req.query.amount < 1 ? 1 : parseInt(req.query.amount);
  const row = await db.get("SELECT value FROM counter WHERE id = 1");
  // Clamp new value to 0
  const newValue = Math.max(0, row.value - amount);
  await db.run("UPDATE counter SET value = ? WHERE id = 1", [newValue]);
  broadcast(newValue); // <-- push new value to all WS clients
  res.send(newValue.toString());
});

// Reset
app.get("/reset", async (req, res) => {
  await db.run("UPDATE counter SET value = 0 WHERE id = 1");
  broadcast(0); // <-- push new value to all WS clients
  res.send('0');
});

// Ping
app.get("/ping", async (req, res) => {
  res.send("pong");
});

const server = app.listen(port, () => {
  console.log(`Counter API running at http://localhost:${port}`);
});

// Use the same server for WebSocket upgrades
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit("connection", ws, request);
  });
});
