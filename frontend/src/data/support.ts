export const FAQ: [string, string][] = [
  ['Why does turbidity say "Awaiting sensor"?', 'No turbidity sensor is installed yet. The console shows availability, not a made-up NTU value. Readings appear once a sensor is fitted and reporting valid data.'],
  ['Does a low TDS mean the water is safe to drink?', 'No. TDS measures dissolved ions only. It says nothing about bacteria, many chemicals or particles. This console never gives a drinking-water verdict from TDS.'],
  ['How often should I change the cartridge?', "No interval is set here and filter life is not estimated. Follow the cartridge maker's guidance and watch for a sustained drop in flow compared with your baseline."],
  ['The pump is on but flow is zero. What should I check?', 'Open the "Pump on, no flow" guide in Troubleshooting. Start with tank level and prime, then tubing and cartridge, then the flow sensor direction and cable.'],
  ['Why is the data marked stale?', 'No message arrived within the timeout set on the Alerts page. The cause is not known from the page. Check ESP32 power, Wi-Fi and the broker.'],
  ['Can I switch the pump from this page?', 'Not yet. In Simulation Mode the Scenario bench changes generated data only. A real command needs a backend path that the device acknowledges, and this page never shows a change before that.'],
  ['What is Simulation Mode?', 'Every value is generated in your browser so the interface can be demonstrated without hardware. It is labelled on every page and never mixed with live data.'],
  ['How do I get my SolidWorks model into the twin?', 'Export or convert the assembly to GLB with part names kept, put it in public/models, set it in model.config.json and map mesh names to components. See docs/solidworks-model-integration.md. STEP files need a converter first.'],
]

export interface TreeNode {
  q?: string
  o?: [string, string][]
  r?: string
}
export interface Tree {
  title: string
  start: string
  n: Record<string, TreeNode>
}

export const TREES: Record<string, Tree> = {
  noflow: {
    title: 'Pump on, no flow',
    start: 'a',
    n: {
      a: { q: 'Is the tank water level above the pump inlet?', o: [['No', 'r1'], ['Yes', 'b']] },
      b: { q: 'With the pump off and 24 V isolated, are the tubes kinked or is the cartridge visibly clogged?', o: [['Yes', 'r2'], ['No', 'c']] },
      c: { q: 'Does the flow sensor arrow point with the water, and is its three-wire cable seated?', o: [['No', 'r3'], ['Yes', 'r4']] },
      r1: { r: 'Refill the tank and let the pump prime. A diaphragm pump can lose prime if the inlet runs dry.' },
      r2: { r: 'Straighten the tubing or replace the cartridge, then compare flow with your earlier baseline.' },
      r3: { r: 'Reseat the cable and refit the sensor with the arrow along the flow direction.' },
      r4: { r: 'Possible causes remain: air lock, pump fault or flow sensor fault. Check the relay output and pump supply, ideally with someone qualified for 24 V work.' },
    },
  },
  stale: {
    title: 'Telemetry is stale',
    start: 'a',
    n: {
      a: { q: 'Is the ESP32-S3 powered (LED on, USB or supply connected)?', o: [['No', 'r1'], ['Yes', 'b']] },
      b: { q: 'Is the Wi-Fi network up and in range of the board?', o: [['No', 'r2'], ['Yes', 'c']] },
      c: { q: 'Is the backend or MQTT bridge running?', o: [['No', 'r3'], ['Yes', 'r4']] },
      r1: { r: 'Restore power and wait for the next message.' },
      r2: { r: 'Restore Wi-Fi or move the board or access point closer.' },
      r3: { r: 'Start the backend (see the README). Live Device Mode needs it.' },
      r4: { r: 'Check the device firmware log and the topic or endpoint it publishes to. Cause not determined.' },
    },
  },
  tds: {
    title: 'TDS reading looks wrong',
    start: 'a',
    n: {
      a: { q: 'Is the TDS probe fully in water and free of air bubbles?', o: [['No', 'r1'], ['Yes', 'b']] },
      b: { q: 'Do the probe electrodes look dirty or scaled?', o: [['Yes', 'r2'], ['No', 'c']] },
      c: { q: 'Does a handheld meter disagree with the console by a large margin?', o: [['Yes', 'r3'], ['No', 'r4']] },
      r1: { r: 'Reseat the probe so the electrodes are submerged and tap out bubbles.' },
      r2: { r: 'Rinse with clean water. Do not scrub the electrodes with abrasives. Keep the circuit board dry.' },
      r3: { r: 'Recalibrate or compare against a reference solution. The conversion constant here is a placeholder.' },
      r4: { r: 'The reading is consistent with the reference. TDS alone does not show the water is safe.' },
    },
  },
}

export const FILTER_STEPS = [
  'Turn the pump off and unplug the 24 V supply.',
  'Place a tray under the filter housing and dry the area.',
  'Note how the cartridge sits so the new one goes in the same way.',
  'Unscrew the housing and remove the old cartridge.',
  'Rinse the housing and check the O-ring for nicks or dirt.',
  'Fit a new PP spun sediment cartridge and seat the O-ring.',
  'Hand-tighten the housing. Do not use tools unless the maker says so.',
  'Restore power, run the pump and watch every joint for leaks for a few minutes.',
  'Compare flow with your earlier baseline and add an entry in the Service log.',
]

export const CARE: [string, string][] = [
  ['TDS probe', 'Rinse in clean water. Do not scrub the electrodes with abrasives. Keep the circuit board dry.'],
  ['Temperature probe', 'Wipe clean and check the cable seal. Confirm whether your build uses a DS18B20 or an NTC 10 kΩ.'],
  ['Flow sensor', 'Check for debris at the ports and that the arrow follows the flow. Calibrate with measured volume over time.'],
  ['Turbidity sensor', 'Not installed. When fitted, clean the optical windows with a soft cloth and shield it from ambient light.'],
  ['Pump', 'Listen for changes in sound. Check inlet tubing for air leaks and keep the inlet submerged.'],
]

export interface LogEntry {
  d: string
  type: string
  note: string
  example?: boolean
}
export const EXAMPLE_LOG: LogEntry[] = [
  { d: '2026-10-12', type: 'Filter replaced', note: 'Example entry. Replace with your own records.', example: true },
  { d: '2026-10-26', type: 'Sensor cleaned', note: 'Example entry. Rinsed TDS probe in clean water.', example: true },
]
