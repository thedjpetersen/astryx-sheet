function stringifySnapshot(snapshot) {
  return JSON.stringify(snapshot);
}

function parseSnapshot(value) {
  if (value == null || value === '') return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export function createMemoryWorkbookStorage(initialEntries = {}) {
  const entries = initialEntries instanceof Map ? initialEntries : new Map(Object.entries(initialEntries));
  const store = new Map(entries);
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    entries() {
      return Array.from(store.entries());
    },
  };
}

export function createWorkbookStorageAdapter(storage, options = {}) {
  if (!storage) throw new Error('Workbook persistence requires a storage object');
  const prefix = options.prefix || '';
  if (typeof storage.load === 'function' && typeof storage.save === 'function') {
    return {
      load: (key) => storage.load(`${prefix}${key}`),
      save: (key, snapshot, detail) => storage.save(`${prefix}${key}`, snapshot, detail),
      remove: (key) => storage.remove?.(`${prefix}${key}`),
    };
  }
  if (typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new Error('Workbook storage must implement load/save or getItem/setItem');
  }
  return {
    async load(key) {
      return parseSnapshot(await storage.getItem(`${prefix}${key}`));
    },
    async save(key, snapshot) {
      await storage.setItem(`${prefix}${key}`, stringifySnapshot(snapshot));
      return snapshot;
    },
    async remove(key) {
      await storage.removeItem?.(`${prefix}${key}`);
    },
  };
}

export function createWorkbookPersistence(controller, options = {}) {
  if (!controller) throw new Error('Workbook persistence requires a controller');
  const key = options.key || 'workbook';
  const adapter = options.adapter || createWorkbookStorageAdapter(options.storage, options.storageOptions);
  const serializeOptions = options.serializeOptions || {};
  const debounceMs = Math.max(0, Number(options.debounceMs || 0));
  let timer = null;
  let lastEvent = null;
  let suspended = false;
  let pendingSave = Promise.resolve(null);

  function clearTimer() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  }

  function shouldSave(event) {
    return !suspended && (typeof options.shouldSave !== 'function' || options.shouldSave(event) !== false);
  }

  function saveNow(detail = {}) {
    clearTimer();
    const snapshot = controller.serialize(serializeOptions);
    pendingSave = Promise.resolve(adapter.save(key, snapshot, detail)).then(() => {
      options.onSave?.({key, snapshot, detail});
      return snapshot;
    });
    return pendingSave;
  }

  function scheduleSave(event) {
    if (!shouldSave(event)) return pendingSave;
    lastEvent = event;
    if (!debounceMs) return saveNow({event});
    clearTimer();
    pendingSave = new Promise((resolve, reject) => {
      timer = setTimeout(() => {
        timer = null;
        saveNow({event: lastEvent}).then(resolve, reject);
      }, debounceMs);
    });
    return pendingSave;
  }

  const unsubscribe = controller.subscribe((event) => {
    if (event.source === 'subscribe') return;
    scheduleSave(event);
  });

  async function load() {
    const snapshot = await adapter.load(key);
    if (!snapshot) return null;
    suspended = true;
    try {
      controller.load(snapshot, {source: 'persistence', key});
    } finally {
      suspended = false;
    }
    options.onLoad?.({key, snapshot});
    return snapshot;
  }

  return {
    key,
    load,
    saveNow,
    flush() {
      if (timer) return saveNow({event: lastEvent});
      return pendingSave;
    },
    async remove() {
      clearTimer();
      await adapter.remove?.(key);
    },
    destroy() {
      clearTimer();
      unsubscribe();
    },
  };
}
