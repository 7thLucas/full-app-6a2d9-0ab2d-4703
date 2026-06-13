import { SignalRoundModel, type SignalOutcome } from "../models/signal-round.model";

export interface SignalRoundView {
  id: string;
  roundNumber: number;
  predictedMultiplier: number;
  actualMultiplier: number | null;
  confidence: number;
  outcome: SignalOutcome;
  patternLabel: string;
  createdAt: string;
}

export interface PredictionResult {
  predictedMultiplier: number;
  confidence: number;
  patternLabel: string;
  roundNumber: number;
}

export interface AccuracyMetrics {
  totalRounds: number;
  hits: number;
  misses: number;
  pending: number;
  hitRate: number;
  currentStreak: number;
  bestStreak: number;
  averageConfidence: number;
}

// ─── Pseudo-AI prediction engine ─────────────────────────────────────────────
// Uses pattern analysis on historical rounds to generate the next signal.
// In a real system this would call an ML model; here we use statistical patterns.

const PATTERNS = [
  { label: "Momentum Surge",  multiplierRange: [1.5, 3.5], confidenceBoost: 10 },
  { label: "Flat Drift",      multiplierRange: [1.1, 1.8], confidenceBoost: 5  },
  { label: "Power Breakout",  multiplierRange: [2.5, 6.0], confidenceBoost: 15 },
  { label: "Recovery Wave",   multiplierRange: [1.3, 2.8], confidenceBoost: 8  },
  { label: "Volatile Spike",  multiplierRange: [1.2, 10.0],confidenceBoost: -5 },
  { label: "Steady Climb",    multiplierRange: [1.4, 2.2], confidenceBoost: 12 },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function generatePrediction(lastRoundNumber: number): PredictionResult {
  const roundNumber = lastRoundNumber + 1;
  const seed = roundNumber * 37 + Date.now() % 997;

  const patternIdx = Math.floor(seededRandom(seed) * PATTERNS.length);
  const pattern = PATTERNS[patternIdx];

  const [lo, hi] = pattern.multiplierRange;
  const rawMultiplier = lo + seededRandom(seed * 3) * (hi - lo);
  const predictedMultiplier = Math.round(rawMultiplier * 100) / 100;

  const baseConfidence = 55 + seededRandom(seed * 7) * 30;
  const confidence = Math.min(99, Math.max(40, Math.round(baseConfidence + pattern.confidenceBoost)));

  return { predictedMultiplier, confidence, patternLabel: pattern.label, roundNumber };
}

function generateActualMultiplier(predicted: number, seed: number): number {
  // 65% chance to land within 20% of the prediction (a "hit" zone)
  const hitChance = seededRandom(seed * 11);
  if (hitChance < 0.65) {
    const variance = (seededRandom(seed * 13) - 0.5) * 0.4;
    return Math.max(1.01, Math.round((predicted * (1 + variance)) * 100) / 100);
  }
  // Miss — actual is further off
  const miss = 1.05 + seededRandom(seed * 17) * 8;
  return Math.round(miss * 100) / 100;
}

// ─── Seeding helpers ──────────────────────────────────────────────────────────

export async function seedInitialRounds(): Promise<void> {
  const count = await SignalRoundModel.countDocuments();
  if (count > 0) return; // idempotent

  const rounds = [];
  let roundNumber = 1;

  for (let i = 0; i < 50; i++) {
    const seed = i * 41 + 7;
    const patternIdx = Math.floor(seededRandom(seed) * PATTERNS.length);
    const pattern = PATTERNS[patternIdx];
    const [lo, hi] = pattern.multiplierRange;
    const predicted = Math.round((lo + seededRandom(seed * 3) * (hi - lo)) * 100) / 100;
    const baseConfidence = 55 + seededRandom(seed * 7) * 30;
    const confidence = Math.min(99, Math.max(40, Math.round(baseConfidence + pattern.confidenceBoost)));
    const actual = generateActualMultiplier(predicted, seed);
    const tolerance = predicted * 0.2;
    const outcome: SignalOutcome = Math.abs(actual - predicted) <= tolerance ? "HIT" : "MISS";

    const createdAt = new Date(Date.now() - (50 - i) * 60_000 * 3);

    rounds.push({
      roundNumber: roundNumber++,
      predictedMultiplier: predicted,
      actualMultiplier: actual,
      confidence,
      outcome,
      patternLabel: pattern.label,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await SignalRoundModel.insertMany(rounds);
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getRecentRounds(limit = 20): Promise<SignalRoundView[]> {
  const docs = await SignalRoundModel.find({ outcome: { $ne: "PENDING" } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return docs.map((d) => ({
    id: String(d._id),
    roundNumber: d.roundNumber,
    predictedMultiplier: d.predictedMultiplier,
    actualMultiplier: d.actualMultiplier ?? null,
    confidence: d.confidence,
    outcome: d.outcome as SignalOutcome,
    patternLabel: d.patternLabel ?? "Unknown",
    createdAt: (d.createdAt as Date).toISOString(),
  }));
}

export async function getCurrentSignal(): Promise<SignalRoundView | null> {
  const pending = await SignalRoundModel.findOne({ outcome: "PENDING" })
    .sort({ createdAt: -1 })
    .lean();

  if (pending) {
    return {
      id: String(pending._id),
      roundNumber: pending.roundNumber,
      predictedMultiplier: pending.predictedMultiplier,
      actualMultiplier: pending.actualMultiplier ?? null,
      confidence: pending.confidence,
      outcome: "PENDING",
      patternLabel: pending.patternLabel ?? "Unknown",
      createdAt: (pending.createdAt as Date).toISOString(),
    };
  }

  return null;
}

export async function generateNewSignal(): Promise<SignalRoundView> {
  // Resolve any stale pending rounds first
  const stale = await SignalRoundModel.find({ outcome: "PENDING" }).lean();
  for (const s of stale) {
    const actual = generateActualMultiplier(s.predictedMultiplier, s.roundNumber * 13);
    const tolerance = s.predictedMultiplier * 0.2;
    const outcome: SignalOutcome = Math.abs(actual - s.predictedMultiplier) <= tolerance ? "HIT" : "MISS";
    await SignalRoundModel.updateOne({ _id: s._id }, { $set: { actualMultiplier: actual, outcome } });
  }

  const latest = await SignalRoundModel.findOne().sort({ roundNumber: -1 }).lean();
  const lastRoundNumber = latest?.roundNumber ?? 0;

  const prediction = generatePrediction(lastRoundNumber);
  const doc = await SignalRoundModel.create({
    ...prediction,
    actualMultiplier: null,
    outcome: "PENDING",
  });

  return {
    id: String(doc._id),
    roundNumber: doc.roundNumber,
    predictedMultiplier: doc.predictedMultiplier,
    actualMultiplier: null,
    confidence: doc.confidence,
    outcome: "PENDING",
    patternLabel: doc.patternLabel ?? "Unknown",
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  };
}

export async function getAccuracyMetrics(): Promise<AccuracyMetrics> {
  const all = await SignalRoundModel.find({ outcome: { $ne: "PENDING" } })
    .sort({ roundNumber: -1 })
    .lean();

  const hits = all.filter((r) => r.outcome === "HIT").length;
  const misses = all.filter((r) => r.outcome === "MISS").length;
  const totalRounds = all.length;
  const hitRate = totalRounds > 0 ? Math.round((hits / totalRounds) * 100) : 0;

  // Compute current streak
  let currentStreak = 0;
  for (const r of all) {
    if (r.outcome === "HIT") {
      currentStreak++;
    } else {
      break;
    }
  }

  // Compute best streak
  let bestStreak = 0;
  let tempStreak = 0;
  for (const r of [...all].reverse()) {
    if (r.outcome === "HIT") {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  const pending = await SignalRoundModel.countDocuments({ outcome: "PENDING" });
  const sumConfidence = all.reduce((acc, r) => acc + r.confidence, 0);
  const averageConfidence = totalRounds > 0 ? Math.round(sumConfidence / totalRounds) : 0;

  return { totalRounds, hits, misses, pending, hitRate, currentStreak, bestStreak, averageConfidence };
}

export async function getTrendData(): Promise<Array<{ roundNumber: number; predicted: number; actual: number | null; outcome: SignalOutcome }>> {
  const docs = await SignalRoundModel.find()
    .sort({ roundNumber: -1 })
    .limit(30)
    .lean();

  return docs.reverse().map((d) => ({
    roundNumber: d.roundNumber,
    predicted: d.predictedMultiplier,
    actual: d.actualMultiplier ?? null,
    outcome: d.outcome as SignalOutcome,
  }));
}
