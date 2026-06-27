function clonePlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createJournalEntry(input = {}) {
  if (!input.command) throw new Error('Journal entry requires a command');
  return {
    id: input.id || `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: input.timestamp || Date.now(),
    source: input.source || 'local',
    workbookId: input.workbookId,
    activeSheetId: input.activeSheetId,
    version: input.version,
    command: clonePlain(input.command),
    metadata: input.metadata ? clonePlain(input.metadata) : undefined,
  };
}

export function createCommandJournal(initialEntries = []) {
  const entries = initialEntries.map(createJournalEntry);
  const listeners = new Set();

  function emit(entry) {
    const snapshot = entries.map(clonePlain);
    for (const listener of listeners) listener(clonePlain(entry), snapshot);
  }

  return {
    append(entry) {
      const normalized = createJournalEntry(entry);
      entries.push(normalized);
      emit(normalized);
      return normalized;
    },
    entries() {
      return entries.map(clonePlain);
    },
    clear() {
      entries.length = 0;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function bindWorkbookCommandJournal(controller, options = {}) {
  if (!controller) throw new Error('Command journal binding requires a controller');
  const journal = options.journal || createCommandJournal();
  const source = options.source || 'local';
  let paused = false;

  const unsubscribe = controller.subscribe((event) => {
    if (paused || event.source !== 'command' || !event.command) return;
    if (typeof options.shouldRecord === 'function' && options.shouldRecord(event) === false) return;
    journal.append({
      source,
      workbookId: event.workbook.id,
      activeSheetId: event.activeSheetId,
      version: event.version,
      command: event.command,
      metadata: options.metadata ? options.metadata(event) : undefined,
    });
  });

  return {
    journal,
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    isPaused() {
      return paused;
    },
    destroy() {
      unsubscribe();
    },
  };
}

export function replayCommandJournal(controller, entries, options = {}) {
  if (!controller) throw new Error('Command journal replay requires a controller');
  const list = typeof entries?.entries === 'function' ? entries.entries() : entries;
  const results = [];
  for (const entry of list || []) {
    if (!entry?.command) continue;
    results.push(controller.dispatch(clonePlain(entry.command), options.dispatchOptions || {}));
  }
  return results;
}
