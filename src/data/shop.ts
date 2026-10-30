/** Articles du marchand (Ratatosk), payés en éclats. Chaque article s'achète une fois par visite. */
export type ShopItemId = 'heal' | 'heart' | 'whetstone' | 'favor';

export interface ShopItemDef {
  id: ShopItemId;
  nameKey: string;
  descKey: string;
  cost: number;
  /** Valeur de l'effet ({value} dans la description). */
  value: number;
}

export const SHOP_ITEMS: readonly ShopItemDef[] = [
  { id: 'heal', nameKey: 'shop.heal', descKey: 'shop.heal.desc', cost: 30, value: 25 },
  { id: 'heart', nameKey: 'shop.heart', descKey: 'shop.heart.desc', cost: 45, value: 10 },
  {
    id: 'whetstone',
    nameKey: 'shop.whetstone',
    descKey: 'shop.whetstone.desc',
    cost: 40,
    value: 10,
  },
  { id: 'favor', nameKey: 'shop.favor', descKey: 'shop.favor.desc', cost: 60, value: 0 },
];

/** Éclats gagnés en plus des portes : chaque élite et chaque boss en rapportent. */
export const SHARD_BOUNTY = { elite: 10, boss: 30 } as const;
