// 해시 라우터. 각 뷰는 { render(container), dispose? } 형태의 모듈.
const routes = new Map();
let current = null;
let currentName = null;

export function route(name, view){ routes.set(name, view); }

export function path(){
  const h = location.hash.replace(/^#\/?/, '');
  return h.split('?')[0] || 'home';
}

export async function go(name){
  if (name && `#/${name}` !== location.hash){ location.hash = `#/${name}`; return; }
  await paint();
}

async function paint(){
  const name = path();
  const view = routes.get(name) || routes.get('home');
  if (current?.dispose && currentName !== name){
    try { current.dispose(); } catch { /* noop */ }
  }
  const container = document.getElementById('view');
  container.hidden = false;
  container.scrollTop = 0;
  window.scrollTo(0, 0);
  current = view;
  currentName = name;
  for (const a of document.querySelectorAll('#tabbar a')){
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  await view.render(container);
}

/** 현재 뷰를 다시 그린다 */
export const refresh = () => paint();

export function start(){
  window.addEventListener('hashchange', paint);
  if (!location.hash) location.hash = '#/home';
  return paint();
}
