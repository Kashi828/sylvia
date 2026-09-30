export const CURRENT_RELEASE = '0.67.0';

export const RELEASE_NOTES = {
  version: CURRENT_RELEASE,
  title: 'Blynk Re-theme',
  summary: 'SYLVIA v0.67.0 re-themes the console in the actual Blynk design language: ash canvas, light-green #00CA86 action color, white chrome with a labeled navigation sidebar, Ubuntu typography, IBM Plex Mono data labels and generous 16px rounded cards — interface patterns modeled on the Blynk web console.',
  changes: [
    {
      title: 'Design language (extracted from blynk.io)',
      items: [
        'New app/sylvia-blynk.css loads last and retargets every token family to the palette extracted from the live blynk.io stylesheet: light green #00CA86 (faded #00CA8633, deep #00873E), charcoal ink #212227, ash surfaces #F2F5F5 / #FAFAFA, hairline #E2E6EB.',
        'Typography follows the Blynk stack: Ubuntu for headings and body (from their official font list), IBM Plex Mono for micro-labels, table headers, status bar and code (standing in for their Suisse Intl Mono).',
        'Interface matches the Blynk web console: plain white top bar, white labeled navigation sidebar with green-faded active rows, light hero bands, and 100px pills for chips and toggles.',
        'Signature details: green underline accents on card heads, rounded 16px cards on the ash canvas, green endpoint dots, faded-green icon chips and soft hover elevation — all verified tab-by-tab with computed-style checks across all 18 console sections.'
      ]
    },
    {
      title: 'Shell and elements (Blynk console patterns)',
      items: [
        'Primary buttons are solid #00CA86 with white uppercase mono text; secondary and ghost variants are hairline outlines; focus rings are light green across all interactive elements.',
        'KPI tiles, cards, panels, stats and device rows are white on the ash canvas with #E2E6EB hairlines; meters and badges use Blynk semantic green/red/amber (#00873E, #D3435C, #ED9D00).',
        'The command palette is a white rounded search panel with green-faded highlighted rows; toasts are white with a green left rule; modals are white cards with a green top rule over a charcoal overlay.',
        'Legacy surfaces (event and notification centers, device control center, connection steps, API reference, ZYRA bridge) are retargeted onto the Blynk palette, including the older --sylvia-*, --ui-* and --acad-* token families; the API result box is the single dark charcoal code surface.'
      ]
    },
    {
      title: 'Correctness and accessibility (unchanged guarantees)',
      items: [
        'The full-tab dark-leak sweep from v0.66 was re-run against the Blynk palette with zero unconverted surfaces.',
        'Deep green #00873E is used for green text on light backgrounds so contrast stays readable; solid #00CA86 is reserved for surfaces and accents.',
        'Selection color, scrollbars and reduced-motion behavior follow the Blynk theme.'
      ]
    },
    {
      title: 'Release',
      items: [
        'Platform version is now v0.67.0; Arduino SDK remains v0.53.8.',
        'This is a pure visual identity release: the ops shell, ⌘K palette, KPI overview and all hardware-path behavior are unchanged.'
      ]
    },
    {
      title: 'Navigation (Blynk sidebar)',
      items: [
        'The 56px icon rail becomes a 198px white labeled sidebar — nav items show icon plus label, matching how the Blynk web console structures its navigation.',
        'Active rows get the faded-green ground, deep-green label and a green leading bar; tooltips are retired because labels are always visible.',
        'Release-notes visibility remains version-aware and automatically reappears on the next platform version.'
      ]
    },
    {
      title: 'Legacy surfaces',
      items: [
        'ESP8266/NodeMCU hardware-acceptance screens keep every status color semantic: green ready, amber provisioning, red failure, in Blynk token values.',
        'Device control center, detail grids and provision boxes are white cards with green accent rules and mono identifiers.',
        'API reference result boxes are intentionally charcoal #212227 with mint mono text as the single dark code surface.'
      ]
    },
    {
      title: 'Verification',
      items: [
        'npm run build, tsc --noEmit and the CSS-usage audit gate the release before deploy, with the Blynk stylesheet registered in the audit.',
        'Production verification checks health version, marker and Blynk tokens (#00CA86, #212227, Ubuntu) inside the deployed CSS chunk.'
      ]
    }
  ]
} as const;