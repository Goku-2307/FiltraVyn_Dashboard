import { NavLink, Outlet } from 'react-router-dom'
import { useTelemetry } from './TelemetryContext'
import { DEVICE } from '../config/device'
import { clock, TZ } from '../services/status'
import { tsOf } from '../types/telemetry'

const NAV: [string, string][] = [
  ['/', 'Overview'],
  ['/twin', 'Digital twin'],
  ['/analytics', 'Sensor analytics'],
  ['/alerts', 'Alerts and diagnostics'],
  ['/support', 'Support and DIY'],
]

export function Layout() {
  const { mode, setMode, last, alerts, liveError } = useTelemetry()
  const stale = alerts.some((a) => a.key === 'stale')
  const conn =
    mode === 'simulation'
      ? stale ? 'Simulation (stale)' : 'Simulation'
      : last ? (stale ? 'Live (stale)' : 'Live') : liveError ? 'Backend unreachable' : 'No live data'

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          FiltraVyn<small>Water purifier console</small>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="dev">
          <span>Device</span>
          <b>{DEVICE.deviceId}</b>
          <span>Connection</span>
          <span>{conn}</span>
          <span>Last update ({TZ})</span>
          <b>{last ? clock(tsOf(last)) : '—'}</b>
        </div>
        <div>
          <div className="tagline" style={{ marginBottom: 6 }}>Data source</div>
          <div className="seg" role="group" aria-label="Data source">
            <button aria-pressed={mode === 'simulation'} onClick={() => setMode('simulation')}>Simulation</button>
            <button aria-pressed={mode === 'live'} onClick={() => setMode('live')}>Live device</button>
          </div>
        </div>
        <div className="rail-foot">TDS and temperature cannot show that water is safe to drink. This console is a monitoring aid.</div>
      </aside>
      <main className="main">
        <Banner />
        <Outlet />
      </main>
    </div>
  )
}

function Banner() {
  const { mode, setMode, last, liveError } = useTelemetry()
  if (mode === 'simulation')
    return (
      <div className="banner sim">
        <strong>Simulation mode.</strong>
        <span>Every value is generated in this browser. None of it comes from the ESP32.</span>
      </div>
    )
  if (last) return null
  return (
    <div className="banner live">
      <strong>Live device mode.</strong>
      <span>
        No live data{liveError ? ` (backend: ${liveError})` : ''}. Generated values will not be substituted.
      </span>
      <button className="btn ghost" onClick={() => setMode('simulation')}>Switch to simulation</button>
    </div>
  )
}
