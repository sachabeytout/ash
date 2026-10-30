import { t } from '../../i18n';

export interface SaveDialogOptions {
  /** Code de la sauvegarde actuelle. */
  exportCode: string;
  /** Tente l'import ; renvoie un message d'erreur, ou null si tout s'est bien passé. */
  onImport: (text: string) => string | null;
  onClose: () => void;
}

const STYLE = `
.ash-dialog{position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;
  background:rgba(7,6,13,.88);font:14px/1.4 system-ui,sans-serif;color:#ffe9d6;
  user-select:text;-webkit-user-select:text;-webkit-touch-callout:default;touch-action:auto}
.ash-dialog .box{width:min(560px,92vw);max-height:92vh;overflow:auto;background:#0d0a18;
  border:2px solid #6b4cff;border-radius:10px;padding:10px 14px;box-sizing:border-box}
.ash-dialog .head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ash-dialog h2{margin:0;font-size:17px}
.ash-dialog .head button{flex:0 0 auto;min-height:34px}
.ash-dialog p{margin:4px 0 8px;color:#bdb2d8;font-size:13px}
.ash-dialog textarea{width:100%;height:50px;box-sizing:border-box;background:#07060d;color:#ffe9d6;
  border:1px solid #3a2f63;border-radius:6px;font:16px/1.3 ui-monospace,monospace;padding:6px;resize:none}
.ash-dialog .row{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 8px}
.ash-dialog button,.ash-dialog label.btn{flex:1 1 auto;min-height:38px;padding:6px 12px;border-radius:8px;
  border:2px solid #ffb02e;background:#07060d;color:#ffe9d6;font:600 14px system-ui,sans-serif;cursor:pointer;
  text-align:center;display:inline-flex;align-items:center;justify-content:center}
.ash-dialog button.secondary{border-color:#6b4cff}
.ash-dialog .msg{min-height:20px;font-size:13px}
.ash-dialog .msg.ok{color:#9dffb0}.ash-dialog .msg.err{color:#ff9ab8}
`;

/** Fenêtre « Sauvegarde » : copier / télécharger le code, ou en importer un (texte ou fichier). */
export function openSaveDialog(o: SaveDialogOptions): void {
  if (!document.getElementById('ash-dialog-style')) {
    const style = document.createElement('style');
    style.id = 'ash-dialog-style';
    style.textContent = STYLE;
    document.head.append(style);
  }
  const root = document.createElement('div');
  root.className = 'ash-dialog';
  root.setAttribute('role', 'dialog');
  root.innerHTML = `
    <div class="box">
      <div class="head"><h2></h2><button class="close secondary"></button></div>
      <p class="export-help"></p>
      <textarea class="export" readonly></textarea>
      <div class="row">
        <button class="copy"></button>
        <button class="download secondary"></button>
      </div>
      <p class="import-help"></p>
      <textarea class="import"></textarea>
      <div class="row">
        <button class="do-import"></button>
        <label class="btn secondary file"><span></span><input type="file" accept=".txt,.json,text/plain" hidden></label>
      </div>
      <div class="msg"></div>
    </div>`;
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  $('h2').textContent = t('save.title');
  $('.export-help').textContent = t('save.exportHelp');
  $('.import-help').textContent = t('save.importHelp');
  $('.copy').textContent = t('save.copy');
  $('.download').textContent = t('save.download');
  $('.do-import').textContent = t('save.import');
  $('.file span').textContent = t('save.chooseFile');
  $('.close').textContent = t('save.close');
  const exportArea = $<HTMLTextAreaElement>('.export');
  const importArea = $<HTMLTextAreaElement>('.import');
  importArea.placeholder = t('save.pastePlaceholder');
  exportArea.value = o.exportCode;
  const msg = $('.msg');
  const say = (text: string, ok: boolean) => {
    msg.textContent = text;
    msg.className = `msg ${ok ? 'ok' : 'err'}`;
  };

  // Le jeu ne doit pas recevoir les touches tapées dans la fenêtre.
  for (const type of [
    'keydown',
    'keyup',
    'pointerdown',
    'pointerup',
    'touchmove',
    'contextmenu',
  ] as const) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }

  const close = () => {
    root.remove();
    o.onClose();
  };
  $('.close').addEventListener('click', close);

  $('.copy').addEventListener('click', () => {
    exportArea.select();
    if (!navigator.clipboard) {
      say(t('save.copyManual'), false);
      return;
    }
    navigator.clipboard.writeText(o.exportCode).then(
      () => say(t('save.copied'), true),
      () => say(t('save.copyManual'), false),
    );
  });

  $('.download').addEventListener('click', () => {
    const blob = new Blob([o.exportCode], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ash-sauvegarde-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  let confirmPending = false;
  const tryImport = (text: string) => {
    if (!text.trim()) return say(t('save.empty'), false);
    if (!confirmPending) {
      confirmPending = true;
      $('.do-import').textContent = t('save.confirm');
      return say(t('save.confirmHelp'), false);
    }
    const error = o.onImport(text);
    confirmPending = false;
    $('.do-import').textContent = t('save.import');
    if (error) return say(error, false);
    say(t('save.imported'), true);
    setTimeout(close, 900);
  };
  $('.do-import').addEventListener('click', () => tryImport(importArea.value));
  importArea.addEventListener('input', () => {
    confirmPending = false;
    $('.do-import').textContent = t('save.import');
  });
  $<HTMLInputElement>('.file input').addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      importArea.value = text.trim();
      confirmPending = false;
      tryImport(importArea.value);
    });
  });

  document.body.append(root);
}
