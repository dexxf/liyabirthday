import type { ChestReward } from '../entities/Chest'

const STYLE_ID = 'birthday-valley-popup-style'

// Rendered as DOM rather than inside the canvas so the artwork can keep its own
// aspect ratio and reflow on small screens for free, while still reading as a
// carved signboard from the game's world rather than a browser dialog.
const CSS = `
.bv-veil {
  position: fixed;
  inset: 0;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: clamp(16px, 4vw, 40px);

  background: rgba(31, 57, 74, .68);

  animation: bv-veil-in .18s ease-out;
}

/* Main reward card */
.bv-board {
  position: relative;

  width: min(540px, 100%);
  max-height: calc(100vh - 40px);

  display: flex;
  flex-direction: column;
  gap: 17px;

  padding: 26px;

  background: #fff8e7;

  border: 4px solid #31566b;
  border-radius: 14px;

  box-shadow:
    0 6px 0 #213d4d,
    0 20px 42px rgba(10, 25, 35, .42);

  font-family: "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
  color: #31566b;

  animation: bv-board-in .25s cubic-bezier(.2,1.3,.5,1);
}

/* Decorative birthday dots */
.bv-board::before {
  content: "";
  position: absolute;

  inset: 9px;

  border: 2px dashed #e7b84b;
  border-radius: 9px;

  pointer-events: none;
}

/* Little corner decoration */
.bv-board::after {
  content: "✦";

  position: absolute;

  top: 7px;
  right: 15px;

  font-size: 22px;
  color: #e7b84b;

  transform: rotate(12deg);

  pointer-events: none;
}

/* Title */
.bv-title {
  position: relative;

  margin: 0;
  padding: 10px 18px;

  text-align: center;

  font-size: clamp(22px, 4vw, 30px);
  font-weight: 700;
  letter-spacing: .02em;

  color: #31566b;

  background: #dceef2;

  border: 3px solid #31566b;
  border-radius: 9px;

  box-shadow:
    0 3px 0 #9ebfc8;
}

/* Small yellow accent beneath title */
.bv-title::after {
  content: "";

  display: block;

  width: 45px;
  height: 4px;

  margin: 7px auto 0;

  background: #e7b84b;

  border-radius: 3px;
}

/* Image area */
.bv-mat {
  position: relative;

  display: flex;
  align-items: center;
  justify-content: center;

  min-height: 180px;
  padding: 14px;

  background: #edf6f5;

  border: 3px solid #7197a3;
  border-radius: 9px;

  box-shadow:
    inset 0 0 0 3px #d4e7e5;
}

/* Simple corner tape/decorations */
.bv-mat::before,
.bv-mat::after {
  content: "";

  position: absolute;

  width: 25px;
  height: 8px;

  background: #e7c65c;

  opacity: .85;
}

.bv-mat::before {
  top: -5px;
  left: 18px;

  transform: rotate(-4deg);
}

.bv-mat::after {
  top: -5px;
  right: 18px;

  transform: rotate(4deg);
}

.bv-mat img {
  display: block;

  max-width: 100%;
  max-height: min(48vh, 350px);

  width: auto;
  height: auto;

  object-fit: contain;

  border-radius: 5px;

  box-shadow:
    0 4px 10px rgba(43, 70, 80, .22);
}

/* Caption */
.bv-caption {
  margin: 0 12px;

  text-align: center;

  font-size: clamp(14px, 2.6vw, 17px);
  line-height: 1.45;

  color: #55727c;
}

/* Close button */
.bv-close {
  align-self: center;

  min-width: 150px;

  padding: 11px 30px;

  border: 3px solid #31566b;
  border-radius: 8px;

  cursor: pointer;

  font: inherit;
  font-size: clamp(15px, 3vw, 18px);
  font-weight: 700;

  color: #fff8e7;

  background: #4f8191;

  box-shadow:
    0 4px 0 #31566b;

  transition:
    transform .08s ease,
    box-shadow .08s ease;
}

.bv-close:hover {
  transform: translateY(-1px);

  box-shadow:
    0 5px 0 #31566b;
}

.bv-close:active {
  transform: translateY(3px);

  box-shadow:
    0 1px 0 #31566b;
}

.bv-close:focus-visible {
  outline: 3px solid #e7b84b;
  outline-offset: 3px;
}

/* Entrance */
@keyframes bv-veil-in {
  from {
    opacity: 0;
  }
}

@keyframes bv-board-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(.94);
  }
}

/* Mobile */
@media (max-width: 520px) {
  .bv-veil {
    padding: 12px;
  }

  .bv-board {
    padding: 21px 18px;
    gap: 13px;
  }

  .bv-title {
    font-size: 22px;
  }

  .bv-mat {
    min-height: 140px;
    padding: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bv-veil,
  .bv-board {
    animation: none;
  }

  .bv-close {
    transition: none;
  }
}
`

export class RewardPopup {
  private veil: HTMLDivElement | null = null
  private onClosed: (() => void) | null = null
  private readonly keyListener = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.close()
    }
  }

  public get isOpen(): boolean {
    return this.veil !== null
  }

  public open(reward: ChestReward, onClosed: () => void): void {
    // Hard guard: a second call while one is on screen is ignored, so popups
    // can never stack on top of each other.
    if (this.veil) return
    this.injectStyle()
    this.onClosed = onClosed

    // Only render the caption when there is one, so chests without a caption
    // don't leave an empty paragraph (and an extra flex gap) in the card.
    const captionHtml = reward.caption ? `<p class="bv-caption">${reward.caption}</p>` : ''
    const imageAlt = reward.caption || reward.title

    const veil = document.createElement('div')
    veil.className = 'bv-veil'
    veil.innerHTML = `
      <div class="bv-board" role="dialog" aria-modal="true" aria-label="${reward.title}">
        <h2 class="bv-title">${reward.title}</h2>
        <div class="bv-mat"><img src="${reward.imageUrl}" alt="${imageAlt}"></div>
        ${captionHtml}
        <button class="bv-close" type="button">Close</button>
      </div>`

    veil.querySelector<HTMLButtonElement>('.bv-close')!.addEventListener('click', () => this.close())
    document.body.appendChild(veil)
    window.addEventListener('keydown', this.keyListener)
    veil.querySelector<HTMLButtonElement>('.bv-close')!.focus()
    this.veil = veil
  }

  public close(): void {
    if (!this.veil) return
    window.removeEventListener('keydown', this.keyListener)
    this.veil.remove()
    this.veil = null
    const callback = this.onClosed
    this.onClosed = null
    callback?.()
  }

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.appendChild(style)
  }
}