import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { WebSocketServer } from "ws";
import { isEmpty } from "./util.js";
import path from "path";
import { fileURLToPath } from "url";

// Needed to replicate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

import fs from "fs";

const widgetPath = path.join(__dirname, "widget/dist");
console.log("Serving widget from:", widgetPath);
console.log("Exists?", fs.existsSync(widgetPath));

app.use(express.json());

// Serve React build static files
app.use("/widget", express.static(path.join(__dirname, "widget/dist")));

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
