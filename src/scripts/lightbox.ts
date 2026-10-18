/*
 * The album lightbox (spec §4.6), and the site's only client JavaScript. It enhances the album
 * grid's thumbnail links, which work without it: each still links to its largest WebP, and this
 * opens that photo in Lightbox.astro's <dialog> instead.
 *
 * The CSP (spec §10.2) blocks inline styles, including any set from script, so nothing here
 * touches `style`. Elements are built with DOM APIs, never innerHTML, and an empty line is hidden
 * with the `hidden` attribute.
 */

/** Sets a line's text, and hides the line when there is none, so it takes no room. */
function setLine(line: HTMLElement, text: string | undefined): void {
  line.textContent = text ?? '';
  line.hidden = line.textContent === '';
}

function source(type: string, srcset: string | undefined): HTMLSourceElement {
  const element = document.createElement('source');
  element.type = type;
  element.srcset = srcset ?? '';
  element.sizes = '100vw';
  return element;
}

/** The URL's fragment, decoded. A malformed escape such as `#%` can't be a photo id, so it is ''. */
function fragment(): string {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}

function enhance(): void {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-lightbox]');
  const items = [...document.querySelectorAll<HTMLAnchorElement>('a[data-lightbox-item]')];
  if (dialog === null || items.length === 0) return;

  const counter = dialog.querySelector('.counter');
  const caption = dialog.querySelector<HTMLElement>('.caption');
  const exif = dialog.querySelector<HTMLElement>('.exif');
  const slot = dialog.querySelector('[data-lightbox-picture]');
  const close = dialog.querySelector('[data-lightbox-close]');
  if (counter === null || caption === null || exif === null || slot === null || close === null) {
    return;
  }

  let current = 0;
  let opener: HTMLAnchorElement | undefined;
  const preloaded = new Set<number>();
  const wrap = (index: number): number => (index + items.length) % items.length;

  // Fetches the photos either side of the one on show, once each, so moving to them is instant.
  // They use the format the browser chose for this photo, so it never fetches both AVIF and WebP.
  const preloadNeighbours = (index: number, currentSrc: string): void => {
    const format = currentSrc.endsWith('.avif') ? 'avif' : 'webp';
    for (const neighbour of [wrap(index - 1), wrap(index + 1)]) {
      const srcset = items[neighbour]?.dataset[format];
      if (neighbour === index || preloaded.has(neighbour) || srcset === undefined) continue;
      preloaded.add(neighbour);
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.setAttribute('imagesrcset', srcset);
      link.setAttribute('imagesizes', '100vw');
      document.head.append(link);
    }
  };

  const show = (index: number): void => {
    const item = items[index];
    if (item === undefined) return;
    current = index;

    const picture = document.createElement('picture');
    picture.append(
      source('image/avif', item.dataset.avif),
      source('image/webp', item.dataset.webp),
    );
    const img = document.createElement('img');
    img.width = Number(item.dataset.width);
    img.height = Number(item.dataset.height);
    img.alt = item.querySelector('img')?.alt ?? '';
    // currentSrc is only known once the image has loaded.
    img.addEventListener('load', () => preloadNeighbours(index, img.currentSrc), { once: true });
    // The <img> joins its sources before it gets a src. Given a src on its own, it would start
    // fetching the WebP before it saw the AVIF source.
    picture.append(img);
    img.src = item.href;
    slot.replaceChildren(picture);

    counter.textContent = `${index + 1} / ${items.length}`;
    setLine(caption, item.dataset.caption);
    setLine(exif, item.dataset.exif);
    history.replaceState(null, '', `${location.pathname}${location.search}#${item.id}`);
  };

  const open = (index: number, from: HTMLAnchorElement): void => {
    opener = from;
    show(index);
    if (!dialog.open) dialog.showModal();
  };

  // With one photo there is nowhere to go, and Lightbox.astro renders no Previous or Next.
  const move = (step: number): void => {
    if (items.length > 1) show(wrap(current + step));
  };

  items.forEach((item, index) => {
    item.addEventListener('click', (event) => {
      // Only a plain primary click opens the lightbox. A modified or middle click keeps the
      // browser's own action, such as opening the photo in a new tab. Enter on a focused link
      // fires a plain click, so the keyboard comes this way too.
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      open(index, item);
    });
  });

  dialog.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => move(-1));
  dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => move(1));
  close.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (event) => {
    // A modified arrow belongs to the browser: Alt+← is Back.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });

  // Esc fires `cancel` and then `close`; the Close button's dialog.close() fires `close` alone.
  dialog.addEventListener('close', () => {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    // The dialog would restore focus to whatever had it before it opened, but WebKit doesn't
    // focus a link when it is clicked, so that can't be relied on to be the thumbnail.
    opener?.focus();
  });

  // A shared /photos/<album>#<photoId> link opens that photo. Any other hash, such as #main from
  // the skip link or a stale id, is ignored.
  const id = fragment();
  const linked = items.findIndex((item) => item.id === id);
  const thumbnail = items[linked];
  if (thumbnail !== undefined) open(linked, thumbnail);
}

enhance();
