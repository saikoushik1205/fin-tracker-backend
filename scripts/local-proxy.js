const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;
const TARGET = "https://fin-tracker-backend.vercel.app";

app.use(cors({ origin: "*" }));
app.use(express.raw({ type: "*/*", limit: "50mb" }));

app.use(async (req, res) => {
  const targetUrl = TARGET + req.originalUrl;
  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];
    delete headers["accept-encoding"];

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.body && req.body.length > 0) {
      fetchOptions.body = req.body;
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "transfer-encoding" && lowerKey !== "content-encoding" && lowerKey !== "content-length") {
        res.setHeader(key, value);
      }
    });

    const data = await response.arrayBuffer();
    res.send(Buffer.from(data));
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(502).json({ success: false, message: "Proxy error", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📡 Local backend running on port ${PORT} -> connected to live Atlas`);
});
