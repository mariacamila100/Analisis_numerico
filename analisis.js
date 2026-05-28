import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const PROBLEMS = {
  p1: {
    label: "Problema 1: u(4) = -4u, u(t) = eᵗ sin(t)",
    exact: (t) => Math.exp(t) * Math.sin(t),
    system: (t, y) => {
      // y = [u, u', u'', u'''], u'''' = -4u
      return [y[1], y[2], y[3], -4 * y[0]];
    },
    y0: [0, 1, 2, 2],
    order: 4,
  },
  p2: {
    label: "Problema 2: u' = -u, u(t) = e⁻ᵗ",
    exact: (t) => Math.exp(-t),
    system: (t, y) => [-y[0]],
    y0: [1],
    order: 1,
  },
  p3: {
    label: "Problema 3: u'' = -u, u(t) = sin(t)",
    exact: (t) => Math.sin(t),
    system: (t, y) => [y[1], -y[0]],
    y0: [0, 1],
    order: 2,
  },
};

function rk4Step(f, t, y, h) {
  const k1 = f(t, y);
  const k2 = f(t + h / 2, y.map((yi, i) => yi + (h / 2) * k1[i]));
  const k3 = f(t + h / 2, y.map((yi, i) => yi + (h / 2) * k2[i]));
  const k4 = f(t + h, y.map((yi, i) => yi + h * k3[i]));
  return y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function runRK4(problem, h, t0, tf) {
  const { system, y0, exact } = PROBLEMS[problem];
  const steps = [];
  let t = t0;
  let y = [...y0];
  let maxErr = 0;

  while (t <= tf + 1e-10) {
    const ex = exact(t);
    const err = Math.abs(y[0] - ex);
    if (err > maxErr) maxErr = err;
    steps.push({ t: +t.toFixed(6), numerical: +y[0].toFixed(8), exact: +ex.toFixed(8), error: +err.toExponential(4) });
    if (t >= tf - 1e-10) break;
    y = rk4Step(system, t, y, Math.min(h, tf - t));
    t = +(t + h).toFixed(10);
    if (t > tf) t = tf;
  }
  return { steps, maxErr };
}

function ConvergenceTable({ convergence }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="p-2 border border-blue-600">h</th>
            <th className="p-2 border border-blue-600">Error Máx.</th>
            <th className="p-2 border border-blue-600">Ratio</th>
            <th className="p-2 border border-blue-600">Orden Est.</th>
          </tr>
        </thead>
        <tbody>
          {convergence.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}>
              <td className="p-2 border border-gray-600 font-mono">{row.h}</td>
              <td className="p-2 border border-gray-600 font-mono text-yellow-300">{row.err.toExponential(4)}</td>
              <td className="p-2 border border-gray-600 font-mono text-green-300">{row.ratio ?? "—"}</td>
              <td className="p-2 border border-gray-600 font-mono text-cyan-300">{row.order ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [problem, setProblem] = useState("p1");
  const [h, setH] = useState(0.1);
  const [t0] = useState(0);
  const [tf, setTf] = useState(5);
  const [result, setResult] = useState(null);
  const [convergence, setConvergence] = useState([]);
  const [tab, setTab] = useState("solution");
  const [animStep, setAnimStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [animData, setAnimData] = useState([]);
  const animRef = useRef(null);

  const compute = () => {
    const r = runRK4(problem, h, t0, tf);
    setResult(r);
    setAnimData([]);
    setAnimStep(0);
    // Convergence
    const hs = [0.5, 0.25, 0.1, 0.05, 0.025, 0.01];
    const conv = hs.map((hi) => ({ h: hi, err: runRK4(problem, hi, t0, tf).maxErr }));
    const withRatio = conv.map((row, i) => {
      if (i === 0) return { ...row, ratio: null, order: null };
      const ratio = conv[i - 1].err / row.err;
      const order = Math.log(ratio) / Math.log(conv[i - 1].h / row.h);
      return { ...row, ratio: ratio.toFixed(3), order: order.toFixed(2) };
    });
    setConvergence(withRatio);
  };

  const startAnimation = () => {
    if (!result) return;
    setAnimating(true);
    setAnimData([]);
    setAnimStep(0);
  };

  useEffect(() => {
    if (!animating || !result) return;
    const steps = result.steps;
    if (animStep >= steps.length) { setAnimating(false); return; }
    animRef.current = setTimeout(() => {
      setAnimData(prev => [...prev, steps[animStep]]);
      setAnimStep(s => s + 1);
    }, Math.max(5, 1200 / steps.length));
    return () => clearTimeout(animRef.current);
  }, [animating, animStep, result]);

  const displayData = animating || animData.length > 0 ? animData : result?.steps ?? [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-mono text-sm">
      <h1 className="text-xl font-bold text-cyan-400 mb-1"> Simulación RK4 — Métodos Numéricos</h1>
      <p className="text-gray-400 text-xs mb-4">Runge-Kutta de Orden 4 · Solución numérica vs exacta · Análisis de convergencia</p>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4 grid grid-cols-1 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Problema</label>
          <select className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm" value={problem} onChange={e => setProblem(e.target.value)}>
            {Object.entries(PROBLEMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Paso h = {h}</label>
            <input type="range" min="0.01" max="0.5" step="0.01" value={h} onChange={e => setH(+e.target.value)} className="w-full accent-cyan-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">t final = {tf}</label>
            <input type="range" min="1" max="10" step="0.5" value={tf} onChange={e => setTf(+e.target.value)} className="w-full accent-purple-400" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={compute} className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded px-3 py-2 font-bold text-white text-sm">▶ Calcular</button>
          <button onClick={startAnimation} disabled={!result || animating} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded px-3 py-2 font-bold text-white text-sm">
            {animating ? "⏳ Animando..." : "🎬 Animar"}
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            {["solution", "error", "convergence", "table"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded text-xs font-bold ${tab === t ? "bg-cyan-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                {t === "solution" ? "📈 Solución" : t === "error" ? "📉 Error" : t === "convergence" ? "🔁 Convergencia" : "📋 Tabla"}
              </button>
            ))}
          </div>

          {tab === "solution" && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="text-cyan-300 font-bold mb-2 text-xs">Solución Numérica vs Exacta</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="t" stroke="#9CA3AF" tick={{ fontSize: 10 }} label={{ value: "t", position: "insideRight", fill: "#9CA3AF" }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", fontSize: 11 }} formatter={(v) => v?.toFixed(6)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="exact" stroke="#10B981" dot={false} name="Exacta" strokeWidth={2} />
                  <Line type="monotone" dataKey="numerical" stroke="#60A5FA" dot={false} name="RK4" strokeWidth={2} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-400 mt-2">Error máximo: <span className="text-yellow-300 font-bold">{result.maxErr.toExponential(4)}</span> · Pasos: <span className="text-cyan-300">{result.steps.length}</span> · h = <span className="text-purple-300">{h}</span></p>
            </div>
          )}

          {tab === "error" && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="text-cyan-300 font-bold mb-2 text-xs">Error Absoluto en cada paso</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="t" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={v => v.toExponential(1)} />
                  <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", fontSize: 11 }} formatter={(v) => (+v).toExponential(4)} />
                  <Line type="monotone" dataKey="error" stroke="#F59E0B" dot={false} name="|Error|" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {tab === "convergence" && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="text-cyan-300 font-bold mb-2 text-xs">Análisis de Convergencia (se espera orden ≈ 4)</h2>
              <ConvergenceTable convergence={convergence} />
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={convergence.map(r => ({ h: r.h, err: r.err }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="h" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} tickFormatter={v => v.toExponential(1)} />
                    <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", fontSize: 11 }} formatter={(v) => v.toExponential(4)} />
                    <Line type="monotone" dataKey="err" stroke="#A78BFA" dot name="Error Máx." strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === "table" && (
            <div className="bg-gray-800 rounded-lg p-3">
              <h2 className="text-cyan-300 font-bold mb-2 text-xs">Tabla de resultados (primeros 50 pasos)</h2>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-blue-800 text-white">
                      <th className="p-2 border border-blue-700">t</th>
                      <th className="p-2 border border-blue-700">u_RK4</th>
                      <th className="p-2 border border-blue-700">u_exacta</th>
                      <th className="p-2 border border-blue-700">|Error|</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.steps.slice(0, 50).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                        <td className="p-1 border border-gray-700 font-mono">{row.t.toFixed(4)}</td>
                        <td className="p-1 border border-gray-700 font-mono text-blue-300">{row.numerical}</td>
                        <td className="p-1 border border-gray-700 font-mono text-green-300">{row.exact}</td>
                        <td className="p-1 border border-gray-700 font-mono text-yellow-300">{row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!result && (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-3"></p>
          <p>Selecciona un problema y presiona <span className="text-cyan-400 font-bold">▶ Calcular</span></p>
        </div>
      )}
    </div>
  );
}