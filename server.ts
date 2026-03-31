import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Simple in-memory state for the investigation
  let currentState: any = null;

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("New client connected");

    // Send the current state to the new client if it exists
    if (currentState) {
      ws.send(JSON.stringify({ type: "SYNC_STATE", payload: currentState }));
    }

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "UPDATE_STATE") {
          currentState = data.payload;
          // Broadcast the update to all other clients
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "UPDATE_STATE", payload: currentState }));
            }
          });
        }
      } catch (e) {
        console.error("Failed to process message:", e);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
