import { migrate } from './migrations';
import type { SaveData } from './schema';

/** Empreinte FNV-1a : détecte une sauvegarde tronquée ou abîmée. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Texte stocké : les données + leur empreinte. */
export function serialize(save: SaveData): string {
  const data = JSON.stringify(save);
  return JSON.stringify({ sum: checksum(data), data });
}

/** Relit un texte stocké : vérifie l'empreinte puis migre vers le format actuel. */
export function deserialize(text: string): SaveData {
  const envelope: unknown = JSON.parse(text);
  if (typeof envelope !== 'object' || envelope === null) throw new Error('Sauvegarde illisible');
  const { sum, data } = envelope as { sum?: unknown; data?: unknown };
  if (typeof data !== 'string') return migrate(envelope); // ancien format sans enveloppe
  if (sum !== checksum(data)) throw new Error('Sauvegarde abîmée');
  return migrate(JSON.parse(data));
}

const EXPORT_PREFIX = 'ASH1-';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(code: string): string {
  const binary = atob(code);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Code texte à copier (transfert téléphone ↔ Mac, copie de secours). */
export function exportCode(save: SaveData): string {
  return EXPORT_PREFIX + toBase64(serialize(save));
}

/** Accepte un code exporté (espaces et retours à la ligne tolérés) ou le contenu d'un fichier. */
export function importCode(input: string): SaveData {
  const trimmed = input.trim();
  if (trimmed.startsWith('{')) return deserialize(trimmed);
  const code = trimmed.replace(/\s+/g, '');
  if (!code.startsWith(EXPORT_PREFIX)) throw new Error('Code de sauvegarde inconnu');
  return deserialize(fromBase64(code.slice(EXPORT_PREFIX.length)));
}
