import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : undefined,
    credentials: allowedOrigins.length > 0,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({ message: "Trop de requêtes. Réessayez dans un instant." });
    return;
  }
  next();
}

const AUTH_RATE_LIMIT_MAX = 10;
function authRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `auth:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > AUTH_RATE_LIMIT_MAX) {
    res.status(429).json({ message: "Trop de tentatives de connexion. Réessayez plus tard." });
    return;
  }
  next();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.use("/api", rateLimit);
app.use("/api/auth/login", authRateLimit);
app.use("/api", (req, _res, next) => {
  (req as any).escapeHtml = escapeHtml;
  next();
});
app.use("/api", router);

// Servir l'application Web PWA statique si le dossier dist existe
const clientDistCandidates = [
  path.resolve(__dirname, "../../hinov-team-report/dist"),
  path.resolve(process.cwd(), "artifacts/hinov-team-report/dist"),
  path.resolve(process.cwd(), "dist"),
];

const foundDist = clientDistCandidates.find((dir) => fs.existsSync(dir));
if (foundDist) {
  logger.info({ distPath: foundDist }, "Serving static PWA frontend");
  app.use(express.static(foundDist));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (path.extname(req.path)) {
      return res.status(404).end();
    }
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(foundDist, "index.html"));
    }
    next();
  });

}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 60_000);

export default app;
