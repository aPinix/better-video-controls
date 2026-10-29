import { element } from './player-tools-ui';

export function createYouTubePipReturnArea(
  doc: Document,
  onReturn: () => void,
  native = false
) {
  const area = element(doc, 'div', 'mfs-pip-return-area');
  area.style.cssText = `position:absolute;inset:0;z-index:1;display:block;background:${native ? 'transparent' : '#000'};pointer-events:${native ? 'none' : 'auto'};container:mfs-pip-placeholder / inline-size;color:#fff;font:14px Roboto,Arial,sans-serif;text-align:left;`;
  const message = element(
    doc,
    'p',
    'mfs-pip-placeholder-message',
    'Playing in picture-in-picture'
  );
  const button = element(
    doc,
    'button',
    'mfs-pip-return-button',
    'Bring video back'
  );
  button.type = 'button';
  button.setAttribute('aria-label', 'Bring video back to this page');
  const style = element(doc, 'style');
  style.textContent = `
    .mfs-pip-return-area .mfs-pip-placeholder-message { position:absolute;left:0;top:0;margin:8px 16px;padding:0;border:0;color:rgba(255,255,255,.8);background:transparent;text-align:left;letter-spacing:.2px;font:400 14px/20px Roboto-Regular,sans-serif,Segoe,serif,Helvetica;pointer-events:none; }
    @container mfs-pip-placeholder (width > 740px) { .mfs-pip-return-area .mfs-pip-placeholder-message { font-size:24px;line-height:28px;margin:32px 64px; } }
    @container mfs-pip-placeholder (width > 1480px) { .mfs-pip-return-area .mfs-pip-placeholder-message { font-size:40px;line-height:47px;margin:64px 96px; } }
    .mfs-pip-return-area .mfs-pip-return-button { position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;white-space:nowrap;margin:0; padding:10px 18px; border:1px solid #ffffff40; border-radius:24px; background:#ffffff18; color:#fff; font:500 14px Roboto,Arial,sans-serif; cursor:pointer; transition:background 140ms ease,border-color 140ms ease,box-shadow 140ms ease,transform 140ms ease; }
    .mfs-pip-return-area .mfs-pip-return-button:hover:not(:disabled) { background:#ffffff30; border-color:#ffffff80; box-shadow:0 2px 12px #0004; }
    .mfs-pip-return-area .mfs-pip-return-button:active:not(:disabled) { background:#ffffff45; border-color:#ffffffb0; box-shadow:none; transform:translate(-50%,-50%) scale(.96); }
    .mfs-pip-return-area .mfs-pip-return-button:focus-visible { outline:2px solid #fff; outline-offset:3px; }
    .mfs-pip-return-area .mfs-pip-return-button:disabled { cursor:default; opacity:.65; }
    @media(prefers-reduced-motion:reduce) { .mfs-pip-return-area .mfs-pip-return-button { transition:none; } }
  `;
  for (const type of ['pointerdown', 'mousedown', 'dblclick', 'click'])
    area.addEventListener(type, (event) => event.stopPropagation());
  button.addEventListener('click', onReturn);
  area.append(style);
  if (!native) area.append(message);
  area.append(button);
  return { area, button };
}
