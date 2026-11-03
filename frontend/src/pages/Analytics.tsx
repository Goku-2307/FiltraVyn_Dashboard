import { useMemo, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTelemetry } from '../app/TelemetryContext'
import { PageHead, Pill } from '../components/ui'
import { RANGES, useHistoryRows } from '../hooks/useHistoryRows'
import { downloadCsv, toCsv } from '../services/csv'
import { dateTime, fmt, sensorPill, TZ, clock } from '../services/status'
import type { RangeKey, Telemetry } from '../types/telemetry'
import { tsOf } from '../types/telemetry'

type Key = 'tds_ppm' | 'temperature_c' | 'flow_lpm'

interface SensorDef {
  key: Key
  status: 'tds' | 'temperature' | 'flow'
  label: string
  unit: string
  color: string
  digits: number
  span: number
  floor: number
}

const SENSORS: SensorDef[] = [
  { key: 'tds_ppm', status: 'tds', label: 'TDS', unit: 'ppm', color: '#2A3FD8', digits: 0, span: 30, floor: 0 },
  { key: 'temperature_c', status: 'temperature', label: 'Water temperature', unit: '°C', color: '#0E7C86', digits: 1, span: 3, floor: -20 },
  { key: 'flow_lpm', status: 'flow', label: 'Flow rate', unit: 'L/min', color: '#6B3FA0', digits: 2, span: 0.6, floor: 0 },
]

function SensorChart({ rows, def, range }: { rows: Telemetry[]; def: SensorDef; range: RangeKey }) {
  const data = useMemo(() => rows.map((r) => ({ t: tsOf(r), v: r[def.key] })), [rows, def.key])
  const valid = data.filter((d) => d.v != null) as { t: number; v: number }[]
  if (!valid.length) return <div className="empty">No valid readings in this range.</div>

  let lo = Math.min(...valid.map((d) => d.v))
  let hi = Math.max(...valid.map((d) => d.v))
  if (hi - lo < def.span) {
    const mid = (hi + lo) / 2
    lo = mid - def.span / 2
    hi = mid + def.span / 2
  }
  const pad = (hi - lo) * 0.1
  const domain: [number, number] = [Math.max(def.floor, lo - pad), hi + pad]
  const lastPt = valid[valid.length - 1]
  const long = RANGES[range].window > 90000e3
  const tick = (t: number) => {
    const d = new Date(t)
    return long ? `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : clock(t).slice(0, 5)
  }

  return (
    <div style={{ width: '100%', height: 210 }} role="img" aria-label={`${def.label} history`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 14, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#DAE1E5" vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tick} tick={{ fill: '#46596A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#C3CDD3' }} minTickGap={40} />
          <YAxis domain={domain} tick={{ fill: '#46596A', fontSize: 11 }} tickLine={false} axisLine={false} width={46} tickFormatter={(v: number) => (def.digits === 0 ? String(Math.round(v)) : v.toFixed(def.digits === 1 ? 1 : 1))} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(def.digits)} ${def.unit}`, def.label]}
            labelFormatter={(t: number) => `${dateTime(t)} ${TZ}`}
            contentStyle={{ border: '1px solid #C3CDD3', borderRadius: 3, fontSize: 12 }}
          />
          <Line type="monotone" dataKey="v" stroke={def.color} strokeWidth={1.8} dot={false} connectNulls={false} isAnimationActive={false} />
          <ReferenceDot x={lastPt.t} y={lastPt.v} r={4} fill={def.color} stroke="#fff" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SensorCard({ def, rows, range }: { def: SensorDef; rows: Telemetry[]; range: RangeKey }) {
  const { last, cfg, mode } = useTelemetry()
  const vals = rows.map((r) => r[def.key]).filter((v): v is number => v != null)
  const n = vals.length
  const min = n ? Math.min(...vals) : 0
  const max = n ? Math.max(...vals) : 0
  const avg = n ? vals.reduce((a, b) => a + b, 0) / n : 0
  const pill = sensorPill(def.status, last, cfg)
  const v = last ? last[def.key] : null
  return (
    <div className="panel sc">
      <div className="head">
        <div>
          <h2>{def.label}</h2>
          <div className="tagline">{mode === 'simulation' ? 'Simulated' : 'Measured'} · {last ? `latest ${clock(tsOf(last))} ${TZ}` : 'no data'}</div>
        </div>
        <Pill kind={pill[0]}>{pill[1]}</Pill>
      </div>
      <div className="head" style={{ paddingTop: 2 }}>
        <div className="big">{v == null ? '—' : fmt(v, def.digits)}<small>{v == null ? '' : def.unit}</small></div>
      </div>
      <div className="stats">
        {n ? (
          <>
            <span>Min <b>{min.toFixed(def.digits)}</b></span>
            <span>Max <b>{max.toFixed(def.digits)}</b></span>
            <span>Avg <b>{avg.toFixed(def.digits)}</b></span>
            <span><b>{n}</b> valid records</span>
          </>
        ) : (
          <span>No valid records in range</span>
        )}
      </div>
      <div className="chart"><SensorChart rows={rows} def={def} range={range} /></div>
    </div>
  )
}

export function Analytics() {
  const { mode } = useTelemetry()
  const [range, setRange] = useState<RangeKey>('1h')
  const { rows, error } = useHistoryRows(range)
  const csv = useMemo(() => toCsv(rows), [rows])
  const csvRef = useRef<HTMLTextAreaElement>(null)
  const [msg, setMsg] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv)
      setMsg('CSV copied.')
    } catch {
      csvRef.current?.focus()
      csvRef.current?.select()
      setMsg('Copy was blocked. The text is selected: press Ctrl+C or Cmd+C.')
    }
  }
  const save = () => setMsg(downloadCsv(csv, `filtravyn-${mode}-${range}.csv`) ? 'Download started.' : 'Download blocked. Use Copy CSV instead.')

  const show = rows.slice(-40).reverse()
  return (
    <>
      <PageHead
        title="Sensor analytics"
        right={
          <div className="rangebar">
            <span className="small muted">Range</span>
            <div className="seg" role="group" aria-label="Time range">
              {(Object.keys(RANGES) as RangeKey[]).map((k) => (
                <button key={k} aria-pressed={range === k} onClick={() => setRange(k)}>{k}</button>
              ))}
            </div>
          </div>
        }
      >
        History, ranges and exportable records. Unavailable readings are blank, never zero.
      </PageHead>

      {mode === 'simulation' && (
        <div className="tagline">History before this page opened is generated sample data. Rows after that come from the running simulator.</div>
      )}
      {error && <div className="err">Could not load history from the backend: {error}</div>}

      <div className="sensors">
        {SENSORS.map((d) => <SensorCard key={d.key} def={d} rows={rows} range={range} />)}
        <div className="panel sc">
          <div className="head">
            <div><h2>Turbidity</h2><div className="tagline">NTU</div></div>
            <Pill kind="na">Awaiting sensor</Pill>
          </div>
          <div className="empty">No turbidity sensor is installed, so no NTU data exists. A chart appears once a sensor reports valid readings.</div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <h2>Readings table</h2>
          <span className="tagline">Latest 40 of <span className="num">{rows.length}</span> records · times in {TZ}</span>
        </div>
        {rows.length ? (
          <div className="tbl" style={{ maxHeight: 340, overflow: 'auto' }}>
            <table>
              <thead>
                <tr><th>Time</th><th>Source</th><th>TDS (ppm)</th><th>Temp (°C)</th><th>Flow (L/min)</th><th>Turbidity (NTU)</th><th>Pump</th></tr>
              </thead>
              <tbody>
                {show.map((r) => (
                  <tr key={r.timestamp}>
                    <td className="n">{dateTime(tsOf(r))}</td>
                    <td>{r.mode === 'simulation' ? 'Simulated' : 'Measured'}</td>
                    <td className="n">{r.tds_ppm ?? '—'}</td>
                    <td className="n">{fmt(r.temperature_c)}</td>
                    <td className="n">{fmt(r.flow_lpm, 2)}</td>
                    <td className="n">—</td>
                    <td>{r.pump_state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No records. {mode === 'live' ? 'Live Device Mode has not received any telemetry.' : ''}</div>
        )}
      </div>

      <div className="panel">
        <div className="ph">
          <h2>CSV export</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" disabled={!rows.length} onClick={save}>Download CSV</button>
            <button className="btn ghost" disabled={!rows.length} onClick={copy}>Copy CSV</button>
          </div>
        </div>
        <div className="pb" style={{ display: 'grid', gap: 8 }}>
          <p className="small muted">Timestamps are UTC ISO 8601. Blank cells mean unavailable. Field names match the API.</p>
          <textarea ref={csvRef} className="csv" readOnly aria-label="CSV text" value={csv} />
          <div className="small muted">{msg}</div>
        </div>
      </div>
    </>
  )
}
