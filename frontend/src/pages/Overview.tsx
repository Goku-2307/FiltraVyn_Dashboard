import { Link } from 'react-router-dom'
import { useTelemetry } from '../app/TelemetryContext'
import { ComponentChips, ComponentInfo, PageHead, Pill, ReadingCard } from '../components/ui'
import { ScenarioBench } from '../components/ScenarioBench'
import { TwinStage } from '../features/digital-twin/TwinStage'
import { clock, fmt, sensorPill, TZ } from '../services/status'
import { DEVICE } from '../config/device'

export function Overview() {
  const { mode, last, cfg, alerts, events, volumeL, states, selected, select } = useTelemetry()
  const src = mode === 'simulation' ? 'Simulated' : 'Measured'
  const noData = !last

  const tds = sensorPill('tds', last, cfg)
  const temp = sensorPill('temperature', last, cfg)
  const flow = sensorPill('flow', last, cfg)
  const ps = last?.pump_state

  return (
    <>
      <PageHead title="Overview">
        Water path, readings and active alerts for <span className="num">{DEVICE.deviceId}</span>.
      </PageHead>

      <div className="ov">
        <div className="panel">
          <div className="ph">
            <h2>Water path</h2>
            <span className="tagline">Drag to orbit, scroll to zoom, click a component</span>
          </div>
          <TwinStage />
          <ComponentChips states={states} selected={selected} onSelect={select} />
          <ComponentInfo id={selected} state={states[selected]} />
        </div>

        <div className="col">
          <div className="cards">
            <ReadingCard
              label="TDS"
              value={noData ? 'No live data' : last.tds_ppm == null ? 'Unavailable' : String(last.tds_ppm)}
              unit={noData || last.tds_ppm == null ? undefined : 'ppm'}
              pill={tds}
              note={noData ? '' : src}
            />
            <ReadingCard
              label="Water temperature"
              value={noData ? 'No live data' : last.temperature_c == null ? 'Unavailable' : fmt(last.temperature_c)}
              unit={noData || last.temperature_c == null ? undefined : '°C'}
              pill={temp}
              note={noData ? '' : src}
            />
            <ReadingCard
              label="Flow rate"
              value={noData ? 'No live data' : last.flow_lpm == null ? 'Unavailable' : fmt(last.flow_lpm, 2)}
              unit={noData || last.flow_lpm == null ? undefined : 'L/min'}
              pill={flow}
              note={noData ? '' : src}
            />
            <ReadingCard label="Turbidity" value="Awaiting sensor" pill={['na', 'Not installed']} note="No NTU value exists" />
            <ReadingCard
              label="Pump"
              value={noData ? 'No live data' : ps === 'fault' ? 'Fault' : ps === 'on' ? 'On' : ps === 'off' ? 'Off' : 'Unknown'}
              pill={noData ? ['na', 'No data'] : ps === 'fault' ? ['crit', 'Fault'] : ps === 'unknown' ? ['na', 'Unknown'] : ['ok', ps === 'on' ? 'On' : 'Off']}
              note={noData ? '' : `${src} · commanded ${last.pump_commanded ? 'on' : 'off'}`}
            />
            <ReadingCard
              label="Total volume"
              value={noData ? 'No live data' : volumeL.toFixed(2)}
              unit={noData ? undefined : 'L'}
              pill={noData ? ['na', 'No data'] : ['info', 'Calculated']}
              note={noData ? '' : `${src} · since page opened`}
            />
          </div>
          <p className="tagline">
            TDS and temperature alone cannot show that water is safe to drink. Flow and volume use a placeholder calibration.
          </p>
        </div>
      </div>

      <div className="two">
        <div className="panel">
          <div className="ph">
            <h2>Active alerts</h2>
            <Link to="/alerts" className="small">Open diagnostics</Link>
          </div>
          <div className="list">
            {alerts.length === 0 && <div className="empty">No active alerts.</div>}
            {alerts.slice(0, 4).map((a) => (
              <div className="li" key={a.key}>
                <Pill kind={a.severity === 'critical' ? 'crit' : a.severity === 'warning' ? 'warn' : 'info'}>
                  {a.severity === 'critical' ? 'Critical' : a.severity === 'warning' ? 'Warning' : 'Info'}
                </Pill>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{a.title}</b>
                  <div className="small muted">{a.detected}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="ph">
            <h2>Recent events</h2>
            <span className="tagline">Times in {TZ}</span>
          </div>
          <div className="list">
            {events.length === 0 && <div className="empty">No events yet.</div>}
            {events.slice(0, 7).map((e, i) => (
              <div className="li" key={e.t + '-' + i}>
                <span className="t">{clock(e.t)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="ph">
          <h2>Scenario bench</h2>
          <span className="tagline">Simulator controls. They change generated data only.</span>
        </div>
        <ScenarioBench />
      </div>
    </>
  )
}
