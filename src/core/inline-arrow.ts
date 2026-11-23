// 触屏平台可能用 emoji 字体显示 Unicode 斜箭头。
// 保留桌面图标，移动端箭头使用 currentColor。
export const diagonalArrow = matchMedia("(pointer: coarse)").matches
  ? '<svg class="inline-arrow" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:-.12em;flex-shrink:0"><path d="M6 18 18 6M6 6h12v12"/></svg>'
  : "↗";
