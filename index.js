import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

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

// Get value
app.get("/value", async (req, res) => {
  const row = await db.get("SELECT value FROM counter WHERE id = 1");
  res.send(row.value.toString());
});

// Increment
app.get("/increment", async (req, res) => {
  const amount = isNaN(parseInt(req.query.amount)) ? 1 : parseInt(req.query.amount);
  await db.run("UPDATE counter SET value = value + ? WHERE id = 1", [amount]);
  const row = await db.get("SELECT value FROM counter WHERE id = 1");
  res.send(row.value.toString());
});

// Decrement
app.get("/decrement", async (req, res) => {
  const amount = isNaN(parseInt(req.query.amount)) ? 1 : parseInt(req.query.amount);
  await db.run("UPDATE counter SET value = value - ? WHERE id = 1", [amount]);
  const row = await db.get("SELECT value FROM counter WHERE id = 1");
  res.send(row.value.toString());
});

// Reset
app.get("/reset", async (req, res) => {
  await db.run("UPDATE counter SET value = 0 WHERE id = 1");
  res.send('0');
});

// Ping
app.get("/ping", async (req, res) => {
  res.send("pong");
});

app.listen(port, () => {
  console.log(`Counter API running at http://localhost:${port}`);
});
