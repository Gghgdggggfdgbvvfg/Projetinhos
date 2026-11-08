export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function panel(root) {
  const section = el('section', undefined, 'oficina');
  root.replaceChildren(section);
  return section;
}

export function field(parent, title, options = {}) {
  const label = el('label', title);
  const input = options.choices ? el('select') : el('input');
  for (const choice of options.choices || []) {
    const [value, text] = Array.isArray(choice) ? choice : [choice, choice];
    const option = el('option', text);
    option.value = value;
    input.append(option);
  }
  for (const [key, value] of Object.entries(options)) {
    if (key !== 'choices') input[key] = value;
  }
  label.append(input);
  parent.append(label);
  return input;
}

export function actions(parent) {
  const row = el('div', undefined, 'of-actions');
  parent.append(row);
  return row;
}

export function button(parent, title, action) {
  const item = el('button', title);
  item.type = 'button';
  item.addEventListener('click', action);
  parent.append(item);
  return item;
}

export function form(parent, onSubmit) {
  const item = el('form');
  item.onsubmit = e => { e.preventDefault(); onSubmit(); };
  parent.append(item);
  return item;
}

export function submit(parent, title) {
  const item = el('button', title);
  item.type = 'submit';
  parent.append(item);
  return item;
}

export function status(parent, initial = '') {
  const node = el('output', initial, 'of-status');
  node.setAttribute('aria-live','polite');
  parent.append(node);
  return node;
}

export function records(key) {
  const storageKey = 'portfolio.iniciante.' + key;
  let list = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) list = saved;
  } catch { /* O armazenamento pode estar indisponível no modo privado. */ }
  return {
    list,
    save() {
      try { localStorage.setItem(storageKey, JSON.stringify(list)); }
      catch { return false; }
      return true;
    }
  };
}

export function remove(list, item) {
  const index = list.indexOf(item);
  if (index >= 0) list.splice(index, 1);
}

export function line(parent, text) {
  const row = el('div', undefined, 'of-line');
  row.append(el('span', text));
  parent.append(row);
  return row;
}

export const money = n => n.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
export const alphabet = {
  minúsculas: 'abcdefghijklmnopqrstuvwxyz',
  maiúsculas: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  números: '0123456789',
  símbolos: '!@#$%&*+-=?'
};
export function randomBelow(max) {
  const range = 0x100000000;
  const ceiling = range - range % max;
  const bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= ceiling);
  return bytes[0] % max;
}

