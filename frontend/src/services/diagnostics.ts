import type { Thresholds } from '../config/device'
import type { Alert, Mode, Telemetry } from '../types/telemetry'
import { tsOf } from '../types/telemetry'

// Transparent rule-based diagnostics. No ML model is involved, and nothing here claims one is.
// The backend mirrors these rules in backend/app/services/diagnostics.py.

export type RawAlert = Omit<Alert, 'since'>

export interface DiagInput {
  /** newest last */
  recent: Telemetry[]
  mode: Mode
  /** Set when Live Device Mode cannot reach the backend. */
  liveError: string | null
  now: number
  cfg: Thresholds
}

const fv = (v: number | null, d = 1) => (v == null ? '—' : v.toFixed(d))
const clock = (t: number) => new Date(t).toLocaleTimeString()

export const turbidityInfo = (): RawAlert => ({
  key: 'turbidity-absent',
  severity: 'info',
  title: 'Turbidity sensor not installed',
  detected: 'Turbidity is unavailable. No NTU value is shown or estimated.',
  trigger: 'sensor_status.turbidity = not_installed',
  basis: 'confirmed',
  checks: [
    'Informational only. This is not a water-quality fault.',
    'Values appear once a sensor is installed and reporting valid data.',
  ],
})

/** When the pump command last switched on, searching back through contiguous "on" records. */
export function pumpOnSince(recent: Telemetry[]): number | null {
  let since: number | null = null
  for (let i = recent.length - 1; i >= 0; i--) {
    if (!recent[i].pump_commanded) break
    since = tsOf(recent[i])
  }
  return since
}

export function evaluate({ recent, mode, liveError, now, cfg }: DiagInput): RawAlert[] {
  const out: RawAlert[] = []
  const last = recent.length ? recent[recent.length - 1] : null

  if (!last) {
    if (mode === 'live') {
      out.push({
        key: 'no-live-data',
        severity: 'warning',
        title: 'No live data',
        detected: liveError
          ? `The backend could not be reached (${liveError}).`
          : 'The backend is reachable but has no telemetry for this device yet.',
        trigger: 'No telemetry received in Live Device Mode',
        basis: 'confirmed',
        checks: [
          'Confirm the ESP32-S3 is powered and connected to Wi-Fi.',
          'Confirm the backend is running and the MQTT bridge or HTTP ingest is configured.',
          'Switch to Simulation Mode to demonstrate the interface.',
        ],
      })
    }
    out.push(turbidityInfo())
    return out
  }

  const lastT = tsOf(last)
  const age = (now - lastT) / 1000
  const stale = age > cfg.staleTimeoutS

  if (stale) {
    const offline = age > cfg.staleTimeoutS * 4
    out.push({
      key: 'stale',
      severity: offline ? 'critical' : 'warning',
      title: offline ? 'Device offline' : 'Telemetry stale',
      detected: `No new telemetry for ${Math.round(age)} s (timeout ${cfg.staleTimeoutS} s).`,
      trigger: `Last message at ${clock(lastT)}`,
      basis: 'confirmed',
      checks: [
        'Check ESP32-S3 power and Wi-Fi signal.',
        'Check the broker or backend is reachable.',
        'Pump and flow rules are paused because the last data may be outdated. The cause of the silence is not known.',
      ],
    })
  } else {
    const names = { tds: 'TDS', temperature: 'Temperature', flow: 'Flow' } as const
    ;(['tds', 'temperature', 'flow'] as const).forEach((k) => {
      const st = last.sensor_status[k]
      if (st !== 'valid') {
        out.push({
          key: `sensor-${k}`,
          severity: 'warning',
          title: `${names[k]} sensor ${st === 'disconnected' ? 'disconnected' : 'reading invalid'}`,
          detected: `Sensor reports status "${st}". The value is shown as unavailable, not zero.`,
          trigger: `sensor_status.${k}`,
          basis: 'confirmed',
          checks: [
            'Check the sensor cable and connector.',
            'Check the sensor is in water where required.',
            'Verify supply voltage at the sensor. The cause cannot be determined from software alone.',
          ],
        })
      }
    })

    const flowOk = last.sensor_status.flow === 'valid' && last.flow_lpm != null
    const onSince = pumpOnSince(recent)
    const onFor = onSince == null ? 0 : (now - onSince) / 1000

    if (flowOk && last.pump_commanded && onFor > cfg.startupDelayS && (last.flow_lpm as number) < cfg.flowMinLpm) {
      out.push({
        key: 'pump-no-flow',
        severity: 'warning',
        title: 'Pump on, no flow detected',
        detected: `Pump commanded on for ${Math.round(onFor)} s but flow is ${fv(last.flow_lpm, 2)} L/min.`,
        trigger: `pump_commanded = true and flow_lpm < ${cfg.flowMinLpm} after ${cfg.startupDelayS} s`,
        basis: 'possible',
        checks: [
          'Check tank level and pump prime.',
          'With power isolated, look for kinked tubing or a clogged cartridge.',
          'Check flow sensor direction and cable.',
          'These are possible causes only. The rule cannot tell which one applies.',
        ],
      })
    }
    if (flowOk && !last.pump_commanded && (last.flow_lpm as number) >= cfg.flowMinLpm) {
      out.push({
        key: 'flow-pump-off',
        severity: 'warning',
        title: 'Flow while pump is off',
        detected: `Flow reads ${fv(last.flow_lpm, 2)} L/min with the pump commanded off.`,
        trigger: `pump_commanded = false and flow_lpm >= ${cfg.flowMinLpm}`,
        basis: 'possible',
        checks: [
          'Check for siphoning or gravity flow through the water path.',
          'Check the flow sensor for noise or a stuck pulse line.',
          'Check that the relay actually opens.',
        ],
      })
    }
    if (last.pump_state === 'fault') {
      out.push({
        key: 'pump-fault',
        severity: 'critical',
        title: 'Pump reports a fault',
        detected: 'The device reports pump_state = fault.',
        trigger: 'pump_state',
        basis: 'confirmed',
        checks: [
          'Switch off and isolate 24 V power before inspecting.',
          'Check wiring and the relay output.',
          'Check for a seized diaphragm or a blocked outlet.',
        ],
      })
    }
    if (last.tds_ppm != null && last.tds_ppm > cfg.tdsWarnHigh) {
      out.push({
        key: 'tds-high',
        severity: 'warning',
        title: 'TDS above project threshold',
        detected: `TDS reads ${last.tds_ppm} ppm, above the ${cfg.tdsWarnHigh} ppm review threshold.`,
        trigger: 'tds_ppm',
        basis: 'confirmed',
        checks: [
          'Rinse and re-seat the TDS probe, then read again.',
          'Compare with a handheld meter.',
          'This prompts a review. It is not a drinking-water judgement, and the threshold is an uncalibrated placeholder.',
        ],
      })
    }
    if (last.temperature_c != null && (last.temperature_c > cfg.tempMax || last.temperature_c < cfg.tempMin)) {
      out.push({
        key: 'temp-range',
        severity: 'warning',
        title: 'Temperature outside project range',
        detected: `Water temperature is ${fv(last.temperature_c)} °C. Range is set to ${cfg.tempMin} to ${cfg.tempMax} °C.`,
        trigger: 'temperature_c',
        basis: 'confirmed',
        checks: ['Check probe placement.', 'Compare with a reference thermometer.', 'The range is a placeholder and not a safety limit.'],
      })
    }
  }
  if (last.sensor_status.turbidity !== 'valid') out.push(turbidityInfo())
  const order = { critical: 0, warning: 1, info: 2 } as const
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}
