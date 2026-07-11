// MITAOE watsonx Orchestrate Proxy Server
// Run: node server.js  →  open http://localhost:3000

// Load .env file manually (no npm needed)
const fs    = require("fs");
try {
  const env = fs.readFileSync(".env", "utf8");
  env.split("\n").forEach(line => {
    const [key, ...val] = line.trim().split("=");
    if (key && val.length) process.env[key.trim()] = val.join("=").trim();
  });
} catch(e) { /* .env not found — use existing env vars */ }

const http  = require("http");
const https = require("https");

const PORT           = process.env.PORT           || 3000;
const HTML_FILE      = process.env.HTML_FILE       || "C:\\websites\\mit-academy-of-engineering-official-website.html";
const WATSON_BASE    = process.env.WATSON_BASE     || "https://api.au-syd.watson-orchestrate.cloud.ibm.com/instances/dc850faa-1c4c-4447-989e-fdd9845d45f8";
const WATSON_API_KEY = process.env.WATSON_API_KEY  || "YOUR_API_KEY_HERE";
const IAM_TOKEN_URL  = "https://iam.cloud.ibm.com/identity/token";

// Known watsonx Orchestrate chat endpoint paths to try (in order)
// /v1/conversations confirmed reachable (403 = auth issue, not wrong path)
const WATSON_PATHS = [
  "/v1/conversations",
  "/v1/chat/messages",
  "/v1/chat",
  "/v1/message"
];

let cachedToken  = null;
let tokenExpiry  = 0;
let workingPath  = null;   // caches the first path that succeeds

// ── IAM Token ─────────────────────────────────────────────
function getIAMToken(cb) {
  if (cachedToken && Date.now() < tokenExpiry) return cb(null, cachedToken);
  console.log("[IAM] Fetching new token...");
  const body = "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=" + WATSON_API_KEY;
  const req = https.request(IAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body)
    }
  }, (res) => {
    let d = "";
    res.on("data", c => d += c);
    res.on("end", () => {
      try {
        const json = JSON.parse(d);
        if (!json.access_token) throw new Error("No token in response: " + d);
        cachedToken = json.access_token;
        tokenExpiry = Date.now() + (json.expires_in - 60) * 1000;
        console.log("[IAM] Token obtained. Expires in", json.expires_in, "s");
        cb(null, cachedToken);
      } catch (e) {
        console.error("[IAM] Parse error:", e.message, "| Raw:", d.slice(0, 200));
        cb("IAM error: " + e.message);
      }
    });
  });
  req.on("error", e => { console.error("[IAM] Request error:", e.message); cb(e.message); });
  req.write(body);
  req.end();
}

// ── Forward request to one watsonx path ───────────────────
function tryWatsonPath(token, pathIndex, body, finalCb) {
  if (pathIndex >= WATSON_PATHS.length) {
    return finalCb(404, JSON.stringify({ error: "No working watsonx endpoint found. Tried: " + WATSON_PATHS.join(", ") }));
  }

  const watsonPath = WATSON_PATHS[pathIndex];
  const target = new URL(WATSON_BASE + watsonPath);
  console.log("[WATSON] Trying path:", watsonPath);

  const wr = https.request({
    hostname: target.hostname,
    path:     target.pathname,
    method:   "POST",
    headers: {
      "Content-Type":   "application/json",
      "Authorization":  "Bearer " + token,
      "Content-Length": Buffer.byteLength(body)
    }
  }, (wres) => {
    let d = "";
    wres.on("data", c => d += c);
    wres.on("end", () => {
      console.log("[WATSON] Path:", watsonPath, "→ Status:", wres.statusCode);
      console.log("[WATSON] Response headers:", JSON.stringify(wres.headers));
      if (wres.statusCode === 200 || wres.statusCode === 201) {
        workingPath = watsonPath;
        console.log("[WATSON] Success! Working path saved:", workingPath);
        finalCb(wres.statusCode, d);
      } else if (wres.statusCode === 404 || wres.statusCode === 405) {
        // Try next path
        tryWatsonPath(token, pathIndex + 1, body, finalCb);
      } else {
        // Other error (401, 400, 403, 500) — log full body and return
        console.error("[WATSON] Error body:", d);
        finalCb(wres.statusCode, d);
      }
    });
  });

  wr.on("error", e => {
    console.error("[WATSON] Network error on", watsonPath, ":", e.message);
    tryWatsonPath(token, pathIndex + 1, body, finalCb);
  });
  wr.write(body);
  wr.end();
}

// ── CORS ──────────────────────────────────────────────────
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ── HTTP Server ───────────────────────────────────────────
http.createServer((req, res) => {
  setCORS(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // ── POST /api/chat ── proxy to watsonx ──
  if (req.method === "POST" && req.url === "/api/chat") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      console.log("[REQ] Incoming chat message");
      getIAMToken((err, token) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "IAM token error: " + err }));
        }

        // Use cached working path or start from index 0
        const startIndex = workingPath ? WATSON_PATHS.indexOf(workingPath) : 0;

        tryWatsonPath(token, startIndex, body, (statusCode, data) => {
          res.writeHead(statusCode, { "Content-Type": "application/json" });
          res.end(data);
        });
      });
    });
    return;
  }

  // ── GET / ── serve the HTML file ──
  fs.readFile(HTML_FILE, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end("HTML file not found: " + HTML_FILE);
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  });

}).listen(PORT, () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  MITAOE Website + watsonx Proxy Server   ║");
  console.log("║  Open → http://localhost:3000             ║");
  console.log("╚══════════════════════════════════════════╝");
});
