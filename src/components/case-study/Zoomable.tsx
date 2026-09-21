"use client";

import { useRef } from "react";
import type { CaseImage } from "./types";

/**
 * An image that opens larger: research boards and product screens carry
 * detail that a column-width image cannot show.
 *
 * It is a real <button> around the image (so it is in the tab order and
 * answers Enter and Space) and a native <dialog> opened with showModal().
 * The platform then does the hard parts correctly, with no library and no
 * hand-rolled focus trap: focus moves into the dialog and cannot leave it,
 * Escape closes it, and on close focus returns to the button that opened
 * it. A click on the backdrop closes it too. `data-lenis-prevent` keeps
 * the page behind from scrolling under the wheel while it is open.
 */
export function Zoomable({ image, labels, className, sizes }: { image: CaseImage; labels: { open: string; close: string }; className?: string; sizes?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={className ? `cs-zoom-trigger ${className}` : "cs-zoom-trigger"}
        aria-label={`${labels.open}: ${image.alt || image.caption || ""}`}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" sizes={sizes} />
      </button>

      <dialog
        ref={dialog}
        className="cs-zoom"
        aria-label={image.alt || image.caption}
        data-lenis-prevent
        /* The dialog box fills the screen; a click that lands on it, not on
           the image or the close button, is a click on the backdrop. */
        onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}
      >
        <form method="dialog" className="cs-zoom-bar">
          <button className="cs-zoom-close" autoFocus>
            {labels.close}
          </button>
        </form>
        <img className="cs-zoom-image" src={image.src} alt={image.alt} width={image.width} height={image.height} />
      </dialog>
    </>
  );
}
