import artwork from "../assets/xiangmeta-mark.svg?raw";
import iconURL from "../assets/xiangmeta-mark.svg";

/** 作品集、加载页、世界与标签页共用无文字标志。 */
export const brandMark = artwork.replace(
  "<svg ",
  '<svg class="brand-mark" aria-hidden="true" focusable="false" ',
);
export function mountBrandIcon() {
  if (document.querySelector("link[data-xiangmeta-icon]")) return;
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = iconURL;
  link.dataset.xiangmetaIcon = "";
  document.head.append(link);
}
