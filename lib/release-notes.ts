export const CURRENT_RELEASE = '0.66.0';

export const RELEASE_NOTES = {
  version: CURRENT_RELEASE,
  title: 'Academy Re-theme',
  summary: 'SYLVIA v0.66.0 re-themes the entire console in the ECT department design language: navy chrome with dot-grid texture, gold action color, ivory content canvas, Fraunces display serif, IBM Plex Mono micro-labels and gold underline bars — one coherent identity across shell, palette, modals and every tab.',
  changes: [
    {
      title: 'Design language',
      items: [
        'New app/sylvia-academy.css loads last and retargets the full --ops-* token system: navy #152449, navy-deep #0C1830, gold #C9A227, gold-bright #E8C766, ivory #F6F4EC, ink #16213B, hairline #DEDCD1.',
        'Display typography is Fraunces for page titles, KPI numerals and section heads; body remains Inter; micro-labels, table headers, status bar and code use IBM Plex Mono.',
        'The top bar, command palette and section heroes are navy gradient panels with the ECT radial dot-grid texture and a gold rule; the status bar is navy-deep with a 2px gold top border.',
        'Signature details: gold underline bars on card and section heads, mono eyebrow micro-labels, inset 3px gold active markers on the nav rail, and hover elevation on white cards.'
      ]
    },
    {
      title: 'Shell and elements',
      items: [
        'Primary buttons are gold with navy-deep uppercase mono text; secondary and ghost variants are hairline outlines; focus rings are gold across all interactive elements.',
        'KPI tiles, cards, panels, stats and device rows are white on the ivory canvas with #DEDCD1 hairlines; meters and chips keep green/amber/red tuned for light backgrounds.',
        'The command palette is a navy hero panel with gold group headings and highlighted rows; toasts are navy with a gold left rule; modals are white cards with a gold top rule over a navy overlay.',
        'Legacy surfaces (event and notification centers, device control center, connection steps, API reference, ZYRA bridge) are retargeted onto the academy palette, including the older --sylvia-* and --ui-* token families.'
      ]
    },
    {
      title: 'Correctness and accessibility',
      items: [
        'Every dark-surface leak from the premium and console layers was neutralized and verified tab-by-tab with computed-style checks across all 18 console sections.',
        'Text-gold on light backgrounds uses #A8861B for contrast; gold-bright #E8C766 is reserved for navy surfaces.',
        'Selection color, scrollbars and reduced-motion behavior follow the academy theme.'
      ]
    },
    {
      title: 'Release',
      items: [
        'Platform version is now v0.66.0; Arduino SDK remains v0.53.8.',
        'This is a pure visual identity release: the v0.65 ops shell, ⌘K palette, KPI overview and all v0.64 hardware-path behavior are unchanged.'
      ]
    },
    {
      title: 'Command palette & toasts',
      items: [
        'Palette groups render as gold-bright mono headings over the navy panel with a blurred navy-deep overlay.',
        'Toasts carry a gold left rule and navy-deep ground so alerts read at a glance.',
        'Release-notes visibility remains version-aware and automatically reappears on the next platform version.'
      ]
    },
    {
      title: 'Legacy surfaces',
      items: [
        'ESP8266/NodeMCU hardware-acceptance screens keep every status color semantic: green ready, amber provisioning, red failure.',
        'Device control center, detail grids and provision boxes are light cards with gold accent rules and mono identifiers.',
        'API reference result boxes are intentionally navy-deep with green mono text as the single dark code surface.'
      ]
    },
    {
      title: 'Verification',
      items: [
        'npm run build, tsc --noEmit and the CSS-usage audit gate the release before deploy.',
        'Production verification checks health version, marker and academy tokens inside the deployed CSS chunk.'
      ]
    }
  ]
} as const;