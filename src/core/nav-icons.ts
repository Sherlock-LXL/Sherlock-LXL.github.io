/** One optical grid for the atlas: filled enamel shapes and fine rounded outlines. */
const drawings:Record<string,string>={
 world:'<circle cx="18" cy="18" r="12" fill="currentColor" fill-opacity=".15"/><ellipse cx="18" cy="18" rx="6" ry="12"/><path d="M6 18h24M9 10q9 5 18 0M9 26q9-5 18 0"/><path d="m28 4 1.2 3.8L33 9l-3.8 1.2L28 14l-1.2-3.8L23 9l3.8-1.2Z" fill="currentColor"/>',
 mountain:'<path d="M3 29 13 8l7 13 4-8 9 16Z" fill="currentColor" fill-opacity=".2"/><path d="m9 17 4 3 4-3M20 21l4 3 3-4M7 29h22"/><circle cx="26" cy="6" r="2" fill="currentColor"/>',
 science:'<path d="M13 4h10M15 4v9L6 27q-2 5 4 5h16q6 0 4-5l-9-14V4"/><path d="M11 22q7-4 14 0l5 7q0 3-5 3H11q-5 0-5-3Z" fill="currentColor" fill-opacity=".25"/><circle cx="15" cy="25" r="2"/><circle cx="23" cy="18" r="1.4"/><circle cx="28" cy="9" r="2.5"/>',
 museum:'<path d="M4 14 18 5l14 9Z" fill="currentColor" fill-opacity=".25"/><path d="M7 14v15M29 14v15M4 31h28M12 27v-8q0-3 3-3t3 3v8m3 0v-8q0-3 3-3t3 3v8"/><circle cx="18" cy="10" r="1" fill="currentColor"/>',
 studio:'<path d="M6 20v-3a12 12 0 0 1 24 0v8q0 6-8 6"/><rect x="3" y="18" width="6" height="11" rx="3" fill="currentColor" fill-opacity=".3"/><rect x="27" y="18" width="6" height="11" rx="3" fill="currentColor" fill-opacity=".3"/><path d="M19 24V11l6 2v5"/><ellipse cx="16" cy="25" rx="3" ry="2" fill="currentColor"/>',
 growth:'<path d="M4 30h8v-7h8v-7h8V8" fill="none"/><path d="M7 25q0-10 9-13t12-8m-6 0h6v6"/><circle cx="6" cy="30" r="2" fill="currentColor"/><circle cx="16" cy="23" r="2" fill="currentColor"/><circle cx="24" cy="16" r="2" fill="currentColor"/>',
 horizons:'<path d="M3 26q5-4 10 0t10 0 10 0M5 31q5-3 10 0t10 0"/><path d="m8 23 7-14 6 8 3-5 6 11Z" fill="currentColor" fill-opacity=".25"/><circle cx="27" cy="6" r="3"/>',
 harbor:'<circle cx="18" cy="7" r="4"/><path d="M18 11v20M11 16h14M5 21v5q13 12 26 0v-5M5 21l5 3M31 21l-5 3"/><path d="m14 29 4 3 4-3" fill="currentColor" fill-opacity=".25"/>',
 collections:'<rect x="4" y="5" width="12" height="11" rx="2" fill="currentColor" fill-opacity=".2"/><rect x="21" y="5" width="11" height="17" rx="2"/><rect x="4" y="21" width="12" height="11" rx="2"/><rect x="21" y="27" width="11" height="5" rx="2" fill="currentColor" fill-opacity=".3"/><path d="m7 13 3-4 3 4M24 18l2-4 3 4"/>',
 favorites:'<path d="M6 9v23l12-6 12 6V9"/><path d="m18 3 3.3 6.7 7.4 1.1-5.4 5.2 1.3 7.4-6.6-3.5-6.6 3.5 1.3-7.4-5.4-5.2 7.4-1.1Z" fill="currentColor" fill-opacity=".25"/>'
};
const colors:Record<string,string>={world:'#afcfa1',mountain:'#d5a9bd',science:'#a1c4d5',museum:'#d5bc91',studio:'#a1cfbb',growth:'#abc3d5',horizons:'#bcaed5',harbor:'#9fc9ce',collections:'#d1b9a2',favorites:'#d1b2c7'};
export function navIcon(name:string){return `<span class="nav-art" style="color:${colors[name]??colors.world}" aria-hidden="true"><svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${drawings[name]??drawings.world}</svg></span>`;}
