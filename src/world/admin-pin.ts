import "./admin-pin.css";

const pinHash = "9341a98d2c6a50f6860da2065c5d536a12e753e9f7c634053aa6cc890729176f";
const letters = ["", "", "ABC", "DEF", "GHI", "JKL", "MNO", "PQRS", "TUV", "WXYZ"];

/** 六位输入只负责当前操作验证，不保存已解锁状态。 */
export class AdminPin {
  private dialog = document.createElement("dialog");
  private events = new AbortController();
  private digits = "";
  private checking = false;
  private exiting = false;
  private disposed = false;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private complete: (accepted: boolean) => void) {
    this.dialog.className = "arcade-admin";
    this.dialog.setAttribute("aria-label", "请输入管理员密码");
    this.dialog.innerHTML = `<h2>请输入管理员密码</h2><div class="admin-dots" role="status" aria-live="polite" aria-label="已输入 0 位，共 6 位">${Array.from({ length: 6 }, () => "<i></i>").join("")}</div><p class="admin-message" role="status" aria-live="polite"></p><div class="admin-keypad">${Array.from({ length: 9 }, (_, i) => this.key(i + 1)).join("")}<button data-cancel class="admin-text">取消</button>${this.key(0)}<button data-delete class="admin-text" aria-label="删除上一位">⌫</button></div>`;
    const opts = { signal: this.events.signal };
    this.dialog.addEventListener(
      "click",
      (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>("button");
        if (button?.dataset.digit !== undefined) this.enter(button.dataset.digit);
        else if (button?.hasAttribute("data-delete")) this.remove();
        else if (button?.hasAttribute("data-cancel")) this.close(false);
      },
      opts,
    );
    this.dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
        this.close(false);
      },
      opts,
    );
    document.body.append(this.dialog);
    this.dialog.showModal();
    this.dialog.querySelector<HTMLButtonElement>("[data-digit]")!.focus();
  }
  private key(digit: number) {
    return `<button data-digit="${digit}" aria-label="${digit}"><b>${digit}</b><small>${letters[digit]}</small></button>`;
  }
  handleKey(event: KeyboardEvent) {
    event.stopImmediatePropagation();
    if (event.code === "Escape") {
      event.preventDefault();
      this.close(false);
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey && /^[0-9]$/.test(event.key)) {
      event.preventDefault();
      this.enter(event.key);
    } else if (["Backspace", "Delete"].includes(event.key)) {
      event.preventDefault();
      this.remove();
    }
  }
  private render() {
    const dots = this.dialog.querySelector<HTMLElement>(".admin-dots")!;
    dots.setAttribute("aria-label", `已输入 ${this.digits.length} 位，共 6 位`);
    dots.querySelectorAll<HTMLElement>("i").forEach((dot, i) => {
      dot.classList.toggle("filled", i < this.digits.length);
    });
    this.dialog
      .querySelectorAll<HTMLButtonElement>("[data-digit],[data-delete]")
      .forEach((button) => {
        button.disabled = this.checking;
      });
  }
  private enter(digit: string) {
    if (this.checking || this.exiting || this.disposed || this.digits.length >= 6) return;
    this.dialog.querySelector(".admin-message")!.textContent = "";
    this.digits += digit;
    this.render();
    if (this.digits.length === 6) void this.verify();
  }
  private remove() {
    if (this.checking || this.exiting || this.disposed) return;
    this.digits = this.digits.slice(0, -1);
    this.render();
  }
  private async verify() {
    this.checking = true;
    this.render();
    let accepted = false;
    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(this.digits));
      accepted =
        Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
          "",
        ) === pinHash;
    } catch {
      this.dialog.querySelector(".admin-message")!.textContent = "暂时无法验证，请重试";
    }
    if (this.disposed || this.exiting) return;
    if (accepted) {
      this.close(true);
      return;
    }
    const message = this.dialog.querySelector(".admin-message")!;
    if (!message.textContent) message.textContent = "密码不正确，请重试";
    this.dialog.classList.add("is-error");
    this.timer = setTimeout(() => {
      this.dialog.classList.remove("is-error");
      this.digits = "";
      this.checking = false;
      this.render();
    }, 350);
  }
  private close(accepted: boolean) {
    if (this.exiting || this.disposed) return;
    this.exiting = true;
    clearTimeout(this.timer);
    this.dialog.classList.add("is-leaving");
    this.timer = setTimeout(
      () => {
        this.dispose();
        this.complete(accepted);
      },
      matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150,
    );
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.timer);
    this.digits = "";
    this.events.abort();
    this.dialog.close();
    this.dialog.remove();
  }
}
