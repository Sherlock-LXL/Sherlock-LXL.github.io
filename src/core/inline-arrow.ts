// Touch platforms may display Unicode diagonal arrows using their emoji font.
// Preserve the existing desktop glyph and draw the mobile arrow in currentColor.
export const diagonalArrow=matchMedia('(pointer: coarse)').matches
  ? '<svg class="inline-arrow" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:-.12em;flex-shrink:0"><path d="M6 18 18 6M6 6h12v12"/></svg>'
  : '↗';
