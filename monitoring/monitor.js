const axios = require("axios");

const BACKEND_URL = "http://backend:3001";

setInterval(async () => {
  try {
    await axios.get(`${BACKEND_URL}/`);
    console.log("✅ Backend healthy");
  } catch (err) {
    console.log("❌ Backend down detected!");
  }
}, 10000);
