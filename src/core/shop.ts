import { GOD_IDS } from '../data/gods';
import type { ShopItemDef } from '../data/shop';
import type { Rng } from './rng';
import type { RunState } from './run/state';

/** Prix réel (Mesure « Rationnement » : plus cher). */
export function price(item: ShopItemDef, priceMul = 1): number {
  return Math.round(item.cost * priceMul);
}

export function canAfford(run: RunState, item: ShopItemDef, priceMul = 1): boolean {
  return run.shards >= price(item, priceMul);
}

/**
 * Achète un article : paie en éclats et applique l'effet. Le don (« favor ») ne fait que désigner
 * un dieu : le choix 1 parmi 3 se fait ensuite comme d'habitude. Renvoie faux si les éclats manquent.
 */
export function buyItem(run: RunState, item: ShopItemDef, rng: Rng, priceMul = 1): boolean {
  if (!canAfford(run, item, priceMul)) return false;
  run.shards -= price(item, priceMul);
  switch (item.id) {
    case 'heal':
      run.hp = Math.min(run.maxHp, run.hp + item.value);
      break;
    case 'heart':
      run.maxHp += item.value;
      run.hp += item.value;
      break;
    case 'whetstone':
      run.damageBonus += item.value / 100;
      break;
    case 'favor':
      run.pendingBoon = rng.pick(GOD_IDS);
      break;
  }
  return true;
}
