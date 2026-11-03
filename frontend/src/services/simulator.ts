import { DEVICE } from '../config/device'
import type { SensorStatus, Telemetry } from '../types/telemetry'

// Deterministic, controllable mock data. Everything produced here carries mode: 'simulation'.

export type Dis = 'ok' | 'off' | 'bad'

export interface SimControls {
  pump: boolean
  flow: number
  pumpFault: boolean
  /** pump commanded on but no flow */
  blocked: boolean
  /** flow while pump commanded off */
  ghost: boolean
  tdsOffset: number
  tempOffset: number
  /** stop producing telemetry so the stale path can be demonstrated */
  frozen: boolean
  dis: { tds: Dis; temperature: Dis; flow: Dis }
  pumpSince: number
}

export const defaultControls = (): SimControls => ({
  pump: true,
  flow: 1.2,
  pumpFault: false,
  blocked: false,
  ghost: false,
  tdsOffset: 0,
  tempOffset: 0,
  frozen: false,
  dis: { tds: 'ok', temperature: 'ok', flow: 'ok' },
  pumpSince: Date.now() - 3600e3,
})

const rnd = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const baseTds = (t: number) =>
  238 + 16 * Math.sin(t / 21600e3) + 7 * Math.sin(t / 1.1e6) + (rnd(Math.floor(t / 60e3)) - 0.5) * 6

const baseTemp = (t: number) => {
  const d = new Date(t)
  const h = d.getHours() + d.getMinutes() / 60
  return 28.6 + 1.9 * Math.sin(((h - 9) / 24) * 2 * Math.PI) + (rnd(Math.floor(t / 60e3) + 999) - 0.5) * 0.3
}

function build(
  t: number,
  tds: number | null,
  temp: number | null,
  flow: number | null,
  cmd: boolean,
  pumpState: Telemetry['pump_state'],
  st: { tds: SensorStatus; temperature: SensorStatus; flow: SensorStatus },
): Telemetry {
  return {
    device_id: DEVICE.deviceId,
    timestamp: new Date(t).toISOString(),
    mode: 'simulation',
    tds_ppm: tds == null ? null : Math.round(tds),
    temperature_c: temp == null ? null : Math.round(temp * 10) / 10,
    flow_lpm: flow == null ? null : Math.round(flow * 100) / 100,
    turbidity_ntu: null,
    pump_commanded: cmd,
    pump_state: pumpState,
    sensor_status: { ...st, turbidity: 'not_installed' },
  }
}

/** One live simulator sample, driven by the scenario controls. */
export function simRow(t: number, s: SimControls): Telemetry {
  const st = { tds: 'valid', temperature: 'valid', flow: 'valid' } as {
    tds: SensorStatus
    temperature: SensorStatus
    flow: SensorStatus
  }
  let tds: number | null = baseTds(t) + s.tdsOffset
  let temp: number | null = baseTemp(t) + s.tempOffset
  const elapsed = (t - s.pumpSince) / 1000
  const noise = (rnd(Math.floor(t / 1000)) - 0.5) * 0.05
  let flow: number | null
  if (s.pump && !s.blocked) flow = s.flow * Math.min(1, elapsed / 3) + noise
  else if (!s.pump && s.ghost) flow = 0.6 + noise
  else flow = 0
  flow = Math.max(0, flow)

  const apply = (k: 'tds' | 'temperature' | 'flow', v: number | null): number | null => {
    const d = s.dis[k]
    if (d !== 'ok') {
      st[k] = d === 'off' ? 'disconnected' : 'out_of_range'
      return null
    }
    return v
  }
  tds = apply('tds', tds)
  temp = apply('temperature', temp)
  flow = apply('flow', flow)
  const ps: Telemetry['pump_state'] = s.pump ? (s.pumpFault ? 'fault' : 'on') : 'off'
  return build(t, tds, temp, flow, s.pump, ps, st)
}

const histPumpOn = (t: number) => rnd(Math.floor(t / (25 * 60e3)) + 7) < 0.5

/** One generated historical sample (sample data, not from any device). */
export function histRow(t: number): Telemetry {
  const on = histPumpOn(t)
  const f = on ? 1.15 + rnd(Math.floor(t / 5e3) + 3) * 0.2 : 0
  return build(t, baseTds(t), baseTemp(t), f, on, on ? 'on' : 'off', {
    tds: 'valid',
    temperature: 'valid',
    flow: 'valid',
  })
}

export function historyRows(fromMs: number, toMs: number, stepMs: number): Telemetry[] {
  const rows: Telemetry[] = []
  for (let t = Math.ceil(fromMs / stepMs) * stepMs; t < toMs; t += stepMs) rows.push(histRow(t))
  return rows
}
