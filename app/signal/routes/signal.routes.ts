import { Router } from "express";
import {
  getCurrentSignal,
  getRecentRounds,
  generateNewSignal,
  getAccuracyMetrics,
  getTrendData,
} from "../services/signal.service";

const router = Router();

/** GET /api/signal/current — current pending prediction */
router.get("/api/signal/current", async (req, res) => {
  try {
    const signal = await getCurrentSignal();
    res.json({ success: true, data: signal });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

/** POST /api/signal/generate — generate a new prediction signal */
router.post("/api/signal/generate", async (req, res) => {
  try {
    const signal = await generateNewSignal();
    res.json({ success: true, data: signal });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

/** GET /api/signal/history — recent resolved rounds */
router.get("/api/signal/history", async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "20"), 10) || 20);
    const rounds = await getRecentRounds(limit);
    res.json({ success: true, data: rounds });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

/** GET /api/signal/accuracy — accuracy metrics */
router.get("/api/signal/accuracy", async (req, res) => {
  try {
    const metrics = await getAccuracyMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

/** GET /api/signal/trend — trend data for chart */
router.get("/api/signal/trend", async (req, res) => {
  try {
    const trend = await getTrendData();
    res.json({ success: true, data: trend });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err) });
  }
});

export default router;
