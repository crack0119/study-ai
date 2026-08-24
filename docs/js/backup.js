// 로컬 전용 저장이라 브라우저 데이터를 지우면 전부 사라진다. 내보내기는 선택이 아니라 필수.
import * as db from './db.js';
import { toast } from './ui.js';

const SCHEMA = 1;

export async function exportJson(){
  const data = { app: 'selfctrl', schema: SCHEMA, exportedAt: new Date().toISOString(), stores: {} };
  for (const name of Object.keys(db.STORES)) data.stores[name] = await db.all(name);
  return data;
}

function filename(){
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `selfctrl-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}.json`;
}

/** 모바일: 공유 시트로 (카톡 나에게 보내기 등). 실패하면 파일 저장으로 폴백. */
export async function shareBackup(){
  const data = await exportJson();
  const text = JSON.stringify(data, null, 2);
  const file = new File([text], filename(), { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })){
      await navigator.share({ files: [file], title: '자기통제 백업' });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

/** 파일 선택 → 복원. mode: 'merge' | 'replace' */
export async function importFile(file, mode = 'merge'){
  const text = await file.text();
  const data = JSON.parse(text);
  if (data?.app !== 'selfctrl' || !data.stores) throw new Error('이 앱의 백업 파일이 아님');
  if (mode === 'replace') await db.wipe();
  let n = 0;
  for (const [name, rows] of Object.entries(data.stores)){
    if (!db.STORES[name] || !Array.isArray(rows)) continue;
    n += await db.putAll(name, rows);
  }
  toast(`${n}건 복원 · 새로고침`);
  return n;
}

export const wipeAll = () => db.wipe();
