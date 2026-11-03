import { useTelemetry } from '../app/TelemetryContext'
import type { Dis } from '../services/simulator'

function DisSelect({ id, label, value, disabled, onChange }: { id: string; label: string; value: Dis; disabled: boolean; onChange: (v: Dis) => void }) {
  return (
    <label className="fld" htmlFor={id}>
      {label}
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as Dis)}>
        <option value="ok">Normal</option>
        <option value="off">Disconnected</option>
        <option value="bad">Invalid reading</option>
      </select>
    </label>
  )
}

/** Simulator controls. They change generated data only and are disabled in Live Device Mode. */
export function ScenarioBench() {
  const { mode, controls: s, patchControls, resetControls } = useTelemetry()
  const d = mode !== 'simulation'
  return (
    <div>
      {d && <div className="empty">Scenario controls are available in Simulation Mode only.</div>}
      <div className="bench">
        <div className="fld">
          Pump (simulator)
          <button className="btn ghost" disabled={d} onClick={() => patchControls({ pump: !s.pump })}>
            Pump commanded {s.pump ? 'on. Turn off' : 'off. Turn on'}
          </button>
        </div>
        <label className="fld" htmlFor="b-flow">
          Flow setpoint: <span className="num">{s.flow.toFixed(1)}</span> L/min
          <input id="b-flow" type="range" min={0.2} max={1.6} step={0.1} value={s.flow} disabled={d} onChange={(e) => patchControls({ flow: +e.target.value })} />
        </label>
        <label className="fld" htmlFor="b-tds">
          Raise TDS by <span className="num">{s.tdsOffset}</span> ppm
          <input id="b-tds" type="range" min={0} max={400} step={10} value={s.tdsOffset} disabled={d} onChange={(e) => patchControls({ tdsOffset: +e.target.value })} />
        </label>
        <label className="fld" htmlFor="b-temp">
          Raise temperature by <span className="num">{s.tempOffset}</span> °C
          <input id="b-temp" type="range" min={0} max={15} step={1} value={s.tempOffset} disabled={d} onChange={(e) => patchControls({ tempOffset: +e.target.value })} />
        </label>
        <DisSelect id="b-dtds" label="TDS sensor" value={s.dis.tds} disabled={d} onChange={(v) => patchControls({ dis: { ...s.dis, tds: v } })} />
        <DisSelect id="b-dtemp" label="Temperature sensor" value={s.dis.temperature} disabled={d} onChange={(v) => patchControls({ dis: { ...s.dis, temperature: v } })} />
        <DisSelect id="b-dflow" label="Flow sensor" value={s.dis.flow} disabled={d} onChange={(v) => patchControls({ dis: { ...s.dis, flow: v } })} />
        <div className="fld">
          <label className="chk"><input type="checkbox" checked={s.blocked} disabled={d} onChange={(e) => patchControls({ blocked: e.target.checked })} />Pump on, no flow</label>
          <label className="chk"><input type="checkbox" checked={s.ghost} disabled={d} onChange={(e) => patchControls({ ghost: e.target.checked })} />Flow while pump is off</label>
          <label className="chk"><input type="checkbox" checked={s.pumpFault} disabled={d} onChange={(e) => patchControls({ pumpFault: e.target.checked })} />Pump reports fault</label>
          <label className="chk"><input type="checkbox" checked={s.frozen} disabled={d} onChange={(e) => patchControls({ frozen: e.target.checked })} />Stop telemetry (stale)</label>
        </div>
        <div className="fld">
          Reset
          <button className="btn ghost" disabled={d} onClick={resetControls}>Restore normal scenario</button>
        </div>
      </div>
    </div>
  )
}
