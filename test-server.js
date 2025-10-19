import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Simple test server
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Simple test server is working!", 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get("/test", (req, res) => {
  res.json({ message: "Test endpoint working!" });
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
