// IndexedDB 얇은 래퍼. 스토어 정의와 버전 마이그레이션을 한 곳에서 관리한다.
const DB_NAME = 'selfctrl';
const DB_VERSION = 1;

export const STORES = {
  settings:      { keyPath: 'key',  indexes: [] },
  sleepLogs:     { keyPath: 'date', indexes: [] },
  studySessions: { keyPath: 'id',   indexes: [['byDate','date'], ['bySubject','subject']] },
  urges:         { keyPath: 'id',   indexes: [['byDate','date'], ['byTs','ts']] },
  reminders:     { keyPath: 'id',   indexes: [['byFireAt','fireAt'], ['byStatus','status']] },
};

let _db = null;

export function open(){
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      for (const [name, def] of Object.entries(STORES)){
        const s = db.objectStoreNames.contains(name)
          ? req.transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: def.keyPath });
        for (const [idx, path] of def.indexes){
          if (!s.indexNames.contains(idx)) s.createIndex(idx, path);
        }
      }
      void e;
    };
    req.onsuccess = () => {
      _db = req.result;
      _db.onversionchange = () => { _db.close(); _db = null; };
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked — 다른 탭을 닫아주세요'));
  });
}

function tx(store, mode){
  return open().then(db => db.transaction(store, mode).objectStore(store));
}

const wrap = (req) => new Promise((res, rej) => {
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

export const get = (store, key)   => tx(store,'readonly').then(s => wrap(s.get(key)));
export const put = (store, value) => tx(store,'readwrite').then(s => wrap(s.put(value))).then(() => value);
export const del = (store, key)   => tx(store,'readwrite').then(s => wrap(s.delete(key)));
export const all = (store)        => tx(store,'readonly').then(s => wrap(s.getAll()));
export const clear = (store)      => tx(store,'readwrite').then(s => wrap(s.clear()));

/** 인덱스 범위 조회. lower/upper 는 포함(inclusive). */
export function range(store, index, lower, upper){
  return tx(store,'readonly').then(s => {
    const src = index ? s.index(index) : s;
    const kr = (lower !== undefined && upper !== undefined) ? IDBKeyRange.bound(lower, upper)
             : (lower !== undefined) ? IDBKeyRange.lowerBound(lower)
             : (upper !== undefined) ? IDBKeyRange.upperBound(upper)
             : null;
    return wrap(src.getAll(kr));
  });
}

/** 여러 레코드를 한 트랜잭션으로 저장 */
export function putAll(store, values){
  if (!values.length) return Promise.resolve(0);
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    const s = t.objectStore(store);
    for (const v of values) s.put(v);
    t.oncomplete = () => res(values.length);
    t.onerror = () => rej(t.error);
  }));
}

/** 전체 삭제 (설정 초기화용) */
export async function wipe(){
  for (const name of Object.keys(STORES)) await clear(name);
}
