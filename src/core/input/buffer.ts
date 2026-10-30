/**
 * Mémoire des appuis (« input buffer ») : un appui fait un peu trop tôt n'est pas perdu,
 * il reste valable pendant `windowMs` et se déclenche dès que l'action devient possible.
 */
export class InputBuffer<A extends string> {
  private readonly pressedAt = new Map<A, number>();

  constructor(private readonly windowMs: number) {}

  press(action: A, now: number): void {
    this.pressedAt.set(action, now);
  }

  /** Vrai si l'action a été appuyée récemment ; l'appui est alors consommé. */
  consume(action: A, now: number): boolean {
    const at = this.pressedAt.get(action);
    if (at === undefined) return false;
    this.pressedAt.delete(action);
    return now - at <= this.windowMs;
  }

  /** Regarde sans consommer. */
  peek(action: A, now: number): boolean {
    const at = this.pressedAt.get(action);
    return at !== undefined && now - at <= this.windowMs;
  }

  clear(): void {
    this.pressedAt.clear();
  }
}
