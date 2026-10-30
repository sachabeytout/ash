/** Indique la scène active sur <body data-scene> : utilisé par les tests Playwright. */
export function markScene(key: string): void {
  document.body.dataset.scene = key;
}
