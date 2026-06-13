import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useConfigurables } from "~/modules/configurables";
import { invokeLLM } from "@qb/agentic";
import { Card, Badge, Button, Spinner, SectionTitle, LiveDot } from "~/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignalRound {
  id: string;
  roundNumber: number;
  predictedMultiplier: number;
  actualMultiplier: number | null;
  confidence: number;
  outcome: "HIT" | "MISS" | "PENDING";
  patternLabel: string;
  createdAt: string;
}

interface AccuracyMetrics {
  totalRounds: number;
  hits: number;
  misses: number;
  pending: number;
  hitRate: number;
  currentStreak: number;
  bestStreak: number;
  averageConfidence: number;
}

interface TrendPoint {
  roundNumber: number;
  predicted: number;
  actual: number | null;
  outcome: "HIT" | "MISS" | "PENDING";
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "API error");
  return json.data as T;
}

async function apiPost<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "API error");
  return json.data as T;
}

// ─── Hero Signal Card ─────────────────────────────────────────────────────────

function HeroSignalCard({
  signal,
  onGenerate,
  generating,
  ctaLabel,
}: {
  signal: SignalRound | null;
  onGenerate: () => void;
  generating: boolean;
  ctaLabel: string;
}) {
  const confidenceColor =
    !signal ? "#94A3B8"
    : signal.confidence >= 80 ? "#22C55E"
    : signal.confidence >= 60 ? "#F59E0B"
    : "#EF4444";

  const outcomeGlow =
    !signal ? "none"
    : signal.outcome === "PENDING" ? "cyan"
    : signal.outcome === "HIT" ? "green"
    : "red";

  return (
    <Card glow={outcomeGlow} className="relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LiveDot />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">
              Live Signal
            </span>
          </div>
          {signal && (
            <Badge variant="muted" className="font-mono text-[10px]">
              Round #{signal.roundNumber}
            </Badge>
          )}
        </div>

        {/* Main multiplier display */}
        <div className="flex flex-col items-center py-4 space-y-2">
          {signal ? (
            <>
              <div className="text-[56px] font-bold font-mono text-[#00D4FF] leading-none count-animate glow-cyan">
                {signal.predictedMultiplier.toFixed(2)}
                <span className="text-2xl text-[#94A3B8] ml-1">x</span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest">
                Predicted Multiplier
              </p>
            </>
          ) : (
            <>
              <div className="text-[48px] font-bold font-mono text-[#2D3F55] leading-none">
                ---.--
                <span className="text-2xl text-[#2D3F55] ml-1">x</span>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest">
                No Active Signal
              </p>
            </>
          )}
        </div>

        {/* Confidence meter */}
        {signal && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider">
                Confidence
              </span>
              <span
                className="text-sm font-bold font-mono"
                style={{ color: confidenceColor }}
              >
                {signal.confidence}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#0A1628] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${signal.confidence}%`,
                  background: `linear-gradient(90deg, ${confidenceColor}80, ${confidenceColor})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Pattern label */}
        {signal && (
          <div className="flex items-center gap-2 justify-between">
            <span className="text-xs text-[#94A3B8]">Pattern</span>
            <Badge variant="cyan" className="text-[10px]">
              {signal.patternLabel}
            </Badge>
          </div>
        )}

        {/* Outcome badge */}
        {signal && signal.outcome !== "PENDING" && (
          <div className="flex items-center justify-center">
            <Badge
              variant={signal.outcome === "HIT" ? "green" : "red"}
              className="text-sm px-4 py-1"
            >
              {signal.outcome === "HIT" ? "SIGNAL HIT" : "SIGNAL MISS"}
            </Badge>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={onGenerate}
          loading={generating}
          className="w-full"
          size="lg"
        >
          {generating ? "Analyzing..." : ctaLabel}
        </Button>
      </div>
    </Card>
  );
}

// ─── Accuracy Gauge ───────────────────────────────────────────────────────────

function AccuracyGauge({ metrics }: { metrics: AccuracyMetrics | null }) {
  if (!metrics) {
    return (
      <Card className="flex items-center justify-center h-40">
        <Spinner />
      </Card>
    );
  }

  const gaugeAngle = (metrics.hitRate / 100) * 180 - 90; // -90 to +90 degrees
  const hitRateColor =
    metrics.hitRate >= 70 ? "#22C55E"
    : metrics.hitRate >= 50 ? "#F59E0B"
    : "#EF4444";

  return (
    <Card>
      <SectionTitle className="mb-4">Accuracy Gauge</SectionTitle>
      <div className="flex flex-col items-center space-y-3">
        {/* SVG Gauge */}
        <svg viewBox="0 0 120 70" className="w-36 h-auto">
          {/* Track */}
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke="#2D3F55"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke={hitRateColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(metrics.hitRate / 100) * 157} 157`}
            style={{ filter: `drop-shadow(0 0 4px ${hitRateColor})` }}
          />
          {/* Needle */}
          <line
            x1="60"
            y1="65"
            x2={60 + 35 * Math.cos(((gaugeAngle - 90) * Math.PI) / 180)}
            y2={65 + 35 * Math.sin(((gaugeAngle - 90) * Math.PI) / 180)}
            stroke="#F8FAFC"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="60" cy="65" r="4" fill="#F8FAFC" />
          {/* Labels */}
          <text x="7" y="72" fill="#94A3B8" fontSize="8" textAnchor="middle">0</text>
          <text x="60" y="16" fill="#94A3B8" fontSize="8" textAnchor="middle">50</text>
          <text x="113" y="72" fill="#94A3B8" fontSize="8" textAnchor="middle">100</text>
        </svg>

        <div
          className="text-3xl font-bold font-mono count-animate"
          style={{ color: hitRateColor }}
        >
          {metrics.hitRate}%
        </div>
        <p className="text-xs text-[#94A3B8] uppercase tracking-widest">Hit Rate</p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <StatMini label="Hits" value={metrics.hits} color="#22C55E" />
          <StatMini label="Misses" value={metrics.misses} color="#EF4444" />
          <StatMini label="Streak" value={`${metrics.currentStreak}x`} color="#00D4FF" />
          <StatMini label="Best" value={`${metrics.bestStreak}x`} color="#F59E0B" />
        </div>
      </div>
    </Card>
  );
}

function StatMini({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center bg-[#0A1628] rounded-lg p-2">
      <span className="text-lg font-bold font-mono" style={{ color }}>{value}</span>
      <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Team Stats Bar ───────────────────────────────────────────────────────────

function TeamStatsBar({
  metrics,
  teamName,
}: {
  metrics: AccuracyMetrics | null;
  teamName: string;
}) {
  if (!metrics) return null;

  const stats = [
    { label: "Total Rounds", value: metrics.totalRounds, color: "#00D4FF" },
    { label: "Avg Confidence", value: `${metrics.averageConfidence}%`, color: "#F59E0B" },
    { label: "Current Streak", value: `${metrics.currentStreak}`, color: "#22C55E" },
    { label: "Best Streak", value: `${metrics.bestStreak}`, color: "#8B5CF6" },
  ];

  return (
    <Card className="py-3">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>Team Stats</SectionTitle>
        <span className="text-xs text-[#94A3B8]">{teamName}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center bg-[#0A1628] rounded-lg p-2.5">
            <span className="text-xl font-bold font-mono count-animate" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="text-[10px] text-[#94A3B8] mt-0.5 uppercase tracking-wider text-center">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.length) {
    return (
      <Card className="flex items-center justify-center h-48">
        <Spinner />
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    round: `R${d.roundNumber}`,
    predicted: d.predicted,
    actual: d.actual,
  }));

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Trend Chart</SectionTitle>
        <Badge variant="muted">Last 30 rounds</Badge>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2D3F55" vertical={false} />
          <XAxis
            dataKey="round"
            tick={{ fill: "#94A3B8", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fill: "#94A3B8", fontSize: 9, fontFamily: "JetBrains Mono" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}x`}
          />
          <Tooltip
            contentStyle={{
              background: "#1E293B",
              border: "1px solid #2D3F55",
              borderRadius: "8px",
              fontSize: "11px",
              fontFamily: "JetBrains Mono",
            }}
            labelStyle={{ color: "#94A3B8" }}
            itemStyle={{ color: "#F8FAFC" }}
            formatter={(value) => typeof value === "number" ? [`${value.toFixed(2)}x`] : [String(value)]}
          />
          <ReferenceLine y={2} stroke="#F59E0B" strokeDasharray="4 4" strokeOpacity={0.4} />
          <Area
            type="monotone"
            dataKey="predicted"
            stroke="#00D4FF"
            strokeWidth={2}
            fill="url(#predictedGrad)"
            name="Predicted"
            dot={false}
            activeDot={{ r: 4, fill: "#00D4FF" }}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#actualGrad)"
            name="Actual"
            dot={false}
            activeDot={{ r: 4, fill: "#22C55E" }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-5 rounded bg-[#00D4FF]" />
          <span className="text-[10px] text-[#94A3B8] font-mono">Predicted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-5 rounded bg-[#22C55E]" />
          <span className="text-[10px] text-[#94A3B8] font-mono">Actual</span>
        </div>
      </div>
    </Card>
  );
}

// ─── Signal History Feed ──────────────────────────────────────────────────────

function SignalHistoryFeed({ rounds }: { rounds: SignalRound[] }) {
  if (!rounds.length) {
    return (
      <Card>
        <SectionTitle className="mb-3">Signal History</SectionTitle>
        <div className="flex items-center justify-center py-8 text-[#94A3B8] text-sm">
          No history yet — generate your first signal!
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Signal History</SectionTitle>
        <Badge variant="muted">{rounds.length} rounds</Badge>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#2D3F55]">
              {["Round", "Predicted", "Actual", "Confidence", "Pattern", "Outcome"].map((h) => (
                <th
                  key={h}
                  className="pb-2 px-1.5 text-left font-semibold uppercase tracking-wider text-[#94A3B8] font-mono"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr
                key={r.id}
                className="border-b border-[#2D3F55]/50 hover:bg-[#0A1628]/50 transition-colors"
              >
                <td className="py-2 px-1.5 font-mono text-[#94A3B8]">#{r.roundNumber}</td>
                <td className="py-2 px-1.5 font-mono font-semibold text-[#00D4FF]">
                  {r.predictedMultiplier.toFixed(2)}x
                </td>
                <td className="py-2 px-1.5 font-mono text-[#F8FAFC]">
                  {r.actualMultiplier != null ? `${r.actualMultiplier.toFixed(2)}x` : "—"}
                </td>
                <td className="py-2 px-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-12 rounded-full bg-[#0A1628] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${r.confidence}%`,
                          background:
                            r.confidence >= 80 ? "#22C55E"
                            : r.confidence >= 60 ? "#F59E0B"
                            : "#EF4444",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[#F8FAFC]">{r.confidence}%</span>
                  </div>
                </td>
                <td className="py-2 px-1.5 text-[#94A3B8]">{r.patternLabel}</td>
                <td className="py-2 px-1.5">
                  <Badge
                    variant={
                      r.outcome === "HIT" ? "green"
                      : r.outcome === "MISS" ? "red"
                      : "cyan"
                    }
                  >
                    {r.outcome}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── AI Insight Panel ────────────────────────────────────────────────────────

function AIInsightPanel({
  metrics,
  trendData,
}: {
  metrics: AccuracyMetrics | null;
  trendData: TrendPoint[];
}) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateInsight = async () => {
    if (!metrics || !trendData.length) return;
    setLoading(true);

    try {
      const recentRounds = trendData.slice(-10).map((d) => ({
        round: d.roundNumber,
        predicted: d.predicted,
        actual: d.actual,
        outcome: d.outcome,
      }));

      const result = await invokeLLM({
        message: JSON.stringify({
          metrics,
          recentRounds,
          task: "Analyze this Aviator game signal prediction data and provide a brief 2-3 sentence intelligence insight about current trends, pattern performance, and a strategic recommendation for the team. Be data-driven and concise.",
        }),
        schema: {
          type: "object",
          properties: {
            insight: {
              type: "string",
              description: "2-3 sentence analysis and recommendation",
            },
            trend: {
              type: "string",
              enum: ["bullish", "bearish", "neutral"],
              description: "Current trend assessment",
            },
          },
          required: ["insight", "trend"],
        },
        systemPrompt:
          "You are an Aviator signal intelligence analyst. Analyze prediction accuracy data and return structured JSON insights. Be precise, data-driven, and strategic. Keep insight to 2-3 sentences maximum.",
      });

      if (result.response) {
        const data = result.response as { insight: string; trend: string };
        setInsight(data.insight || "Analysis complete.");
        setHasGenerated(true);
      }
    } catch (err) {
      setInsight("AI analysis unavailable. Check your connection and try again.");
      setHasGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const trendColor =
    metrics && metrics.hitRate >= 70 ? "#22C55E"
    : metrics && metrics.hitRate >= 50 ? "#F59E0B"
    : "#EF4444";

  return (
    <Card className="border-[#00D4FF]/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#00D4FF] animate-pulse" />
          <SectionTitle>AI Insight</SectionTitle>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={generateInsight}
          loading={loading}
          disabled={!metrics}
        >
          {hasGenerated ? "Refresh" : "Analyze"}
        </Button>
      </div>

      {!hasGenerated && !loading && (
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Click Analyze to get AI-powered pattern insights and strategic recommendations based on your signal history.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-2">
          <Spinner className="h-4 w-4" />
          <p className="text-xs text-[#94A3B8]">Analyzing patterns...</p>
        </div>
      )}

      {hasGenerated && !loading && insight && (
        <p className="text-sm text-[#F8FAFC] leading-relaxed">{insight}</p>
      )}
    </Card>
  );
}

// ─── App Header ───────────────────────────────────────────────────────────────

function AppHeader({
  appName,
  logoUrl,
  tagline,
}: {
  appName: string;
  logoUrl: string;
  tagline: string;
}) {
  return (
    <header className="sticky top-0 z-50 bg-[#0A1628]/90 backdrop-blur-sm border-b border-[#2D3F55]">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {logoUrl && !logoUrl.includes("FILL_") && (
            <img src={logoUrl} alt={appName} className="h-7 w-7 rounded object-contain" />
          )}
          <div>
            <h1 className="text-base font-bold text-[#F8FAFC] leading-none font-mono">
              {appName}
            </h1>
            {tagline && (
              <p className="text-[10px] text-[#94A3B8] mt-0.5 uppercase tracking-widest leading-none">
                {tagline}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <LiveDot />
          <span className="text-[10px] font-mono text-[#22C55E] uppercase tracking-wider">Live</span>
        </div>
      </div>
    </header>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { config, loading: configLoading } = useConfigurables();

  const [currentSignal, setCurrentSignal] = useState<SignalRound | null>(null);
  const [history, setHistory] = useState<SignalRound[]>([]);
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [generating, setGenerating] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived config values with safe fallbacks
  const appName = config?.appName || "Avisignal";
  const logoUrl = config?.logoUrl || "";
  const tagline = config?.tagline || "AI-Powered Signal Intelligence";
  const teamName = config?.teamName || "Signal Team";
  const ctaLabel = config?.heroCta || "Get Latest Signal";
  const footerText = config?.footerText || "Avisignal — Internal Signal Intelligence Platform";
  const showTeamStats = config?.showTeamStats !== false;
  const showTrendChart = config?.showTrendChart !== false;
  const showSignalHistory = config?.showSignalHistory !== false;
  const historyLimit = config?.signalHistoryLimit || 20;
  const refreshInterval = (config?.signalRefreshIntervalSeconds || 15) * 1000;

  const fetchAllData = useCallback(async () => {
    try {
      const [signal, hist, acc, trend] = await Promise.all([
        apiFetch<SignalRound | null>("/api/signal/current").catch(() => null),
        apiFetch<SignalRound[]>(`/api/signal/history?limit=${historyLimit}`).catch(() => []),
        apiFetch<AccuracyMetrics>("/api/signal/accuracy").catch(() => null),
        apiFetch<TrendPoint[]>("/api/signal/trend").catch(() => []),
      ]);
      setCurrentSignal(signal);
      setHistory(hist || []);
      setMetrics(acc);
      setTrendData(trend || []);
    } finally {
      setDataLoading(false);
    }
  }, [historyLimit]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    refreshIntervalRef.current = setInterval(() => {
      fetchAllData();
    }, refreshInterval);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchAllData, refreshInterval]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const signal = await apiPost<SignalRound>("/api/signal/generate");
      setCurrentSignal(signal);
      // Refresh all data to update history/metrics
      await fetchAllData();
    } catch (err) {
      console.error("Failed to generate signal:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (configLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-[#2D3F55] border-t-[#00D4FF] animate-spin" />
          <p className="text-sm font-mono text-[#94A3B8] uppercase tracking-widest">
            Initializing Signal Engine...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <AppHeader appName={appName} logoUrl={logoUrl} tagline={tagline} />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-10">
        {/* Hero Signal Card */}
        <HeroSignalCard
          signal={currentSignal}
          onGenerate={handleGenerate}
          generating={generating}
          ctaLabel={ctaLabel}
        />

        {/* Team Stats */}
        {showTeamStats && (
          <TeamStatsBar metrics={metrics} teamName={teamName} />
        )}

        {/* Accuracy Gauge */}
        <AccuracyGauge metrics={metrics} />

        {/* AI Insight */}
        <AIInsightPanel metrics={metrics} trendData={trendData} />

        {/* Trend Chart */}
        {showTrendChart && (
          <TrendChart data={trendData} />
        )}

        {/* Signal History */}
        {showSignalHistory && (
          <SignalHistoryFeed rounds={history} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2D3F55] py-4 px-4">
        <p className="text-center text-[10px] text-[#94A3B8] font-mono uppercase tracking-widest">
          {footerText}
        </p>
      </footer>
    </div>
  );
}
