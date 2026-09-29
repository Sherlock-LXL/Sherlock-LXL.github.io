const paths={
  arrow:'<path d="M6 18 18 6M6 6h12v12"/>',
  visit:'<path d="M12 21s6-5.8 6-12a6 6 0 0 0-12 0c0 6.2 6 12 6 12Z"/><circle cx="12" cy="9" r="2.1"/><path d="M4 19H2m18 0h2"/>',
  favorite:'<path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2L2.9 9.6l6.3-.9Z"/>',
  back:'<path d="m9 7-5 5 5 5M4 12h11a5 5 0 0 0 5-5V4"/>',
  sparkle:'<path d="M12 2c1.2 6.5 3.5 8.8 10 10-6.5 1.2-8.8 3.5-10 10-1.2-6.5-3.5-8.8-10-10 6.5-1.2 8.8-3.5 10-10Z"/>'
};
export function actionIcon(name:keyof typeof paths,filled=false){return `<svg class="action-icon${filled?' is-filled':''}" viewBox="0 0 24 24" fill="${filled?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;}
