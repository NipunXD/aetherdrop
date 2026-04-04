// src/app.js
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173"
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("AetherDrop API running");
});

app.listen(3001, "0.0.0.0", () => {
  console.log("Server running on port 3001");
});

const fileRoutes = require("./routes/fileRoutes");
app.use("/api", fileRoutes);

require("./services/cleanup");

app.get("/crash", (req, res) => {
  console.log("Simulating crash...");
  process.exit(1);
});
