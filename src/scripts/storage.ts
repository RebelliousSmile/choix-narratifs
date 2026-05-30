const SCHEMA_VERSION = 1;
const TOOL_ID = 'choix-narratifs';

export interface ExportEnvelope<T = unknown> {
  schemaVersion: number;
  tool: string;
  exportedAt: string;
  data: T;
}

const STORAGE_PREFIX = `${TOOL_ID}:`;

export function saveData<T>(key: string, value: T): void {
  const payload = JSON.stringify(value);
  localStorage.setItem(STORAGE_PREFIX + key, payload);
}

export function loadData<T>(key: string): T | null {
  const raw = localStorage.getItem(STORAGE_PREFIX + key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearData(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key);
}

export function exportData<T>(data: T): Blob {
  const envelope: ExportEnvelope<T> = {
    schemaVersion: SCHEMA_VERSION,
    tool: TOOL_ID,
    exportedAt: new Date().toISOString(),
    data,
  };
  const json = JSON.stringify(envelope, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function importData<T>(file: File | Blob): Promise<T> {
  const text = await readFileAsText(file);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Fichier invalide : JSON corrompu.');
  }

  if (!isValidEnvelope(parsed)) {
    throw new Error('Fichier invalide : enveloppe non reconnue.');
  }

  return parsed.data as T;
}

function isValidEnvelope(value: unknown): value is ExportEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const env = value as Partial<ExportEnvelope>;
  return (
    typeof env.schemaVersion === 'number' &&
    env.tool === TOOL_ID &&
    'data' in env
  );
}

async function readFileAsText(file: File | Blob): Promise<string> {
  // 1) Privilegie Blob.text() / File.text() quand disponible (navigateurs
  //    modernes, Node 18+). C'est le chemin nominal en production.
  if (typeof (file as { text?: unknown }).text === 'function') {
    return (file as Blob).text();
  }

  // 2) Fallback robuste : le Blob de jsdom n'expose pas .text(), mais il reste
  //    consommable via l'API Response (Node 18+ / undici). On evite ainsi le
  //    FileReader de jsdom, instable sous Node recent.
  if (typeof Response === 'function') {
    try {
      return await new Response(file as Blob).text();
    } catch {
      // On bascule sur FileReader ci-dessous.
    }
  }

  // 3) Dernier recours : FileReader (environnements sans Blob.text() ni Response).
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible.'));
    reader.readAsText(file);
  });
}
