import Phaser from 'phaser';
import { addFlameHair } from '../fx/flameHair';
import { finishRun, runBonuses } from '../../core/meta';
import { randomSeed } from '../../core/rng';
import { newRun, summarize, type RunSummary } from '../../core/run/state';
import { exportCode, importCode } from '../../core/save/codec';
import { NewerSaveError } from '../../core/save/migrations';
import { getBiome } from '../../data/biomes';
import { GOD_IDS } from '../../data/gods';
import { PLAYER } from '../../data/player';
import { WEAPON_ORDER, WEAPONS, type WeaponId } from '../../data/weapons';
import { t, type TextKey } from '../../i18n';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { addEmbers, drawCage, drawLotusColumn, ensureTextures } from '../backdrop';
import { cheatsEnabled } from '../debug/cheats';
import { openSaveDialog } from '../dom/saveDialog';
import { session } from '../session';
import { ensureGameTextures } from '../textures';
import { COLORS, FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH } from '../theme';
import { makeButton } from '../ui/button';
import { OptionsPanel } from '../ui/OptionsPanel';
import { DialogueBox } from '../ui/DialogueBox';
import { ForgePanel } from '../ui/ForgePanel';
import { HeatPanel } from '../ui/HeatPanel';
import { heatTotal } from '../../core/heat';
import { HEAT_UNLOCK_VICTORIES } from '../../data/heat';
import { markSeen, nextDialogue } from '../../core/story';
import { DAWNBLADE_VICTORIES } from '../../data/story';
import { ThothPanel } from '../ui/ThothPanel';
import { assistReduction } from '../../core/assist';
import { chosenWeapon, forgeLevel, isUnlocked, selectWeapon } from '../../core/forge';
import { settings } from '../../core/settings';
import type { MetaState } from '../../core/save/schema';
import { applyPostFx, autoLowerQuality } from '../fx/postfx';
import { CODEX, recordCodex } from '../../core/codex';
import { CodexPanel } from '../ui/CodexPanel';
import { RecapPanel } from '../ui/RecapPanel';
import { newAutoQuality } from '../../core/perf';
import { markScene } from './markScene';
import { Controls } from '../input/Controls';
import { WeaponPanel } from '../ui/WeaponPanel';
import { TROPHY_COLOR, TrophyPanel, drawTrophyCup, rewardText } from '../ui/TrophyPanel';
import { claimTrophies } from '../../core/trophies';
import type { TrophyDef } from '../../data/trophies';
import {
  BARK_COOLDOWN_MS,
  BARK_RANGE,
  BARK_SHOW_MS,
  BARKS,
  type BarkSpeaker,
  BARK_CHANCE,
  BARK_GLOBAL_MS,
} from '../../data/barks';

/** La Cage (hub) : résumé de la dernière run, reprise, choix de l'arme, sauvegarde. */
export class HubScene extends Phaser.Scene {
  private summary: RunSummary | undefined;
  private starting = false;
  /** Une fenêtre (sauvegarde, Thot) est ouverte : la Cage ignore les touches. */
  private modal = false;
  private controls!: Controls;
  private stations: Station[] = [];
  private ash!: Phaser.GameObjects.Image;
  private ashGlow!: Phaser.GameObjects.Image;
  /** Point où Ash marche (toucher), et la station à ouvrir en arrivant. */
  private walkTarget: { x: number; y: number; station?: Station } | null = null;
  private prompt!: Phaser.GameObjects.Text;
  private padA = false;
  /** Habitants qui parlent quand Ash passe près d'eux. */
  private barkers: {
    who: BarkSpeaker;
    x: number;
    y: number;
    lastAt: number;
    last: number;
    bubble: Phaser.GameObjects.Text;
  }[] = [];
  /** Dernière bulle d'un habitant (toutes confondues). */
  private lastBarkAt = 0;
  /** Abandon de la run : deuxième appui pour confirmer. */
  private abandonArmed = false;

  constructor() {
    super('hub');
  }

  init(data: { summary?: RunSummary }): void {
    this.summary = data.summary;
    this.starting = false;
    this.modal = false;
    this.stations = [];
    this.barkers = [];
    // Première bulle possible quelques secondes après l'arrivée, pas tout de suite.
    this.lastBarkAt = this.time.now - BARK_GLOBAL_MS + 4000;
    this.walkTarget = null;
    this.padA = false;
    this.abandonArmed = false;
  }

  create(): void {
    ensureTextures(this);
    ensureGameTextures(this);
    const cx = GAME_WIDTH / 2;
    const meta = session.save.meta;
    // Trophées gagnés depuis la dernière visite (ou déjà mérités avant leur arrivée) : récompense.
    const newTrophies = claimTrophies(meta);
    if (newTrophies.length > 0) session.commit();

    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const recenter = () => this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.scale.on('resize', recenter);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', recenter));

    // La Cage de l'Oiseleur (barreaux violets, étrangers) dans une salle égyptienne : colonnes de lotus.
    const hall = this.add.graphics().setAlpha(0.75);
    for (const x of [cx - 262, cx + 262]) drawLotusColumn(hall, x, 70, GAME_HEIGHT - 24);
    hall
      .lineStyle(2, COLORS.goldDim, 0.5)
      .lineBetween(cx - 290, GAME_HEIGHT - 22, cx + 290, GAME_HEIGHT - 22);
    drawCage(this, 0.7);
    addEmbers(this);

    const style = {
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
      stroke: '#07060d',
      strokeThickness: 3,
    };
    // Le titre sous le bouton de gauche : le haut de la cage reste visible.
    this.add.text(12, 40, t('hub.name'), { ...style, fontSize: '14px' });
    this.addCorners(meta);
    this.add
      .text(cx, 38, this.infoLines(meta).join('\n'), {
        ...style,
        fontSize: '9px',
        color: COLORS.textDim,
        align: 'center',
        lineSpacing: 2,
      })
      .setOrigin(0.5, 0);

    makeButton(this, {
      x: 52,
      y: 22,
      w: 88,
      h: 26,
      label: t('hub.saveButton'),
      color: 0x6b4cff,
      fontSize: 11,
      onTap: () => this.openSave(),
    });
    makeButton(this, {
      x: GAME_WIDTH - 52,
      y: 22,
      w: 88,
      h: 26,
      label: t('hub.optionsButton'),
      color: 0xffb02e,
      fontSize: 11,
      onTap: () => this.openOptions(),
    });

    this.buildStations(meta);
    this.spawnAsh(meta);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.modal) return;
      if (cheatsEnabled && e.code === 'KeyV') {
        // Victoire factice : fait avancer l'histoire d'une étape.
        session.save.meta.clears += 1;
        session.save.meta.runs += 1;
        session.commit();
        this.scene.restart({
          summary: { outcome: 'cleared', biome: 3, room: 8, elapsedMs: 0, xp: 0, weaponParts: 0 },
        });
        return;
      }
      if (cheatsEnabled && e.code === 'KeyZ') {
        this.scene.start('ending', {});
        return;
      }
      if (cheatsEnabled && e.code === 'KeyU') {
        session.save.meta.unlocked = [...WEAPON_ORDER];
        session.commit();
        this.scene.restart({});
        return;
      }
      if (cheatsEnabled && e.code === 'KeyX') {
        session.save.meta.weaponParts += 10;
        session.save.meta.xp += 100;
        session.commit();
        this.scene.restart({});
        return;
      }
      if (e.code === 'KeyT') {
        this.openThoth();
        return;
      }
      if (e.code === 'KeyF') {
        this.openForge();
        return;
      }
      if (e.code === 'KeyM') {
        this.openHeat();
        return;
      }
      if (cheatsEnabled && e.code === 'KeyK') {
        // Archives complètes (pour vérifier l'affichage).
        for (const entry of CODEX) recordCodex(session.save.meta, entry.key, 3);
        session.commit();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        // Station la plus proche ; sinon, une run en cours reprend.
        const near = this.nearStation();
        if (near) near.action();
        else if (session.save.run) this.resume();
        return;
      }
      if (session.save.run) {
        if (e.code === 'Digit1') this.resume();
        return;
      }
      // Raccourcis : 1 à 7 équipent l'arme et sortent directement.
      const digit = Number(/^Digit([1-7])$/.exec(e.code)?.[1] ?? 0);
      const id = WEAPON_ORDER[digit - 1];
      if (id && isUnlocked(session.save.meta, id)) this.start(id);
    });

    this.cameras.main.fadeIn(500, 7, 6, 13);
    applyPostFx(this.cameras.main, settings.quality);
    this.autoQuality = newAutoQuality();
    music.play('hub');
    markScene('hub');
    this.announceTrophies(newTrophies);
    // Retour de run : d'abord le récapitulatif, puis l'éventuel dialogue.
    if (this.summary?.boons) this.time.delayedCall(500, () => this.openRecap());
    else this.time.delayedCall(650, () => this.playStory());
  }

  private autoQuality = newAutoQuality();

  override update(_time: number, delta: number): void {
    autoLowerQuality(this.autoQuality, delta, this.cameras.main);
    this.controls.update();
    if (this.modal || this.starting) return;
    this.moveAsh(delta);
    this.highlightStations();
    this.updateBarks();
    // Manette : A agit sur la station la plus proche (ou reprend la run).
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    const pressed = pad?.buttons[0]?.pressed ?? false;
    if (pressed && !this.padA) {
      const near = this.nearStation();
      if (near) near.action();
      else if (session.save.run) this.resume();
    }
    this.padA = pressed;
  }

  // ---------- La Cage, niveau 0 : Ash s'y déplace et visite les stations ----------

  /** Résumé en haut : dernière run, run en cours, totaux. */
  private infoLines(meta: MetaState): string[] {
    const lines: string[] = [];
    const s = this.summary;
    if (s) {
      const biome = t(getBiome(s.biome).nameKey as TextKey);
      lines.push(
        s.outcome === 'death'
          ? s.room > getBiome(s.biome).rooms
            ? t('hub.lastDeathBoss', { biome, killer: s.killedBy ?? '?' })
            : t('hub.lastDeath', { biome, room: s.room, killer: s.killedBy ?? '?' })
          : t('hub.lastClearAll'),
      );
    }
    const run = session.save.run;
    if (run) {
      lines.push(
        t('hub.runInProgress', {
          place:
            run.room <= 0
              ? t('hub.atMerchant')
              : t('hub.roomOf', {
                  biome: t(getBiome(run.biome).nameKey as TextKey),
                  room: run.room,
                }),
          weapon: t(WEAPONS[run.weapon].nameKey as TextKey),
        }),
      );
    }
    const assist = assistReduction(settings.assist, meta.assistDeaths);
    if (assist > 0) lines.push(t('hub.assistActive', { value: Math.round(assist * 100) }));
    return lines;
  }

  /** Bilan dans les coins du bas : à gauche morts et victoires, à droite XP, pièces et arme. */
  private addCorners(meta: MetaState): void {
    const style = {
      fontFamily: FONT_FAMILY,
      fontSize: '9px',
      color: COLORS.textDim,
      stroke: '#07060d',
      strokeThickness: 3,
      lineSpacing: 3,
    };
    const bottom = GAME_HEIGHT - 8;
    this.add
      .text(
        12,
        bottom,
        [
          t('hub.rebirths', { count: meta.deaths }),
          t('hub.victories', { count: meta.clears }),
        ].join('\n'),
        style,
      )
      .setOrigin(0, 1);
    this.add
      .text(
        GAME_WIDTH - 12,
        bottom,
        [
          t('hub.statXp', { xp: meta.xp }),
          t('hub.statParts', { parts: meta.weaponParts }),
          t(WEAPONS[chosenWeapon(meta)].nameKey as TextKey),
        ].join('\n'),
        { ...style, align: 'right' },
      )
      .setOrigin(1, 1);
  }

  private buildStations(meta: MetaState): void {
    const run = session.save.run;
    const weapon = WEAPONS[chosenWeapon(meta)];
    this.addStation({
      id: 'door',
      x: GAME_WIDTH / 2,
      y: 128,
      color: 0xffb02e,
      label: run ? t('hub.station.resume') : t('hub.station.door'),
      draw: (g, x, y) => drawDoor(g, x, y),
      action: () => (run ? this.resume() : this.start(chosenWeapon(session.save.meta))),
    });
    if (run) {
      this.addStation({
        id: 'abandon',
        x: GAME_WIDTH / 2 + 92,
        y: 140,
        color: 0x6b4cff,
        label: t('hub.abandon'),
        draw: (g, x, y) => drawBrokenChain(g, x, y),
        action: () => this.abandonStation(),
      });
    } else {
      this.addStation({
        id: 'rack',
        x: 150,
        y: 196,
        color: weapon.color,
        label: t('hub.station.rack', { weapon: t(weapon.nameKey as TextKey) }),
        draw: (g, x, y) => drawRack(g, x, y),
        action: () => this.openRack(),
      });
    }
    this.addStation({
      id: 'thot',
      x: 150,
      y: 290,
      color: 0x7fffc0,
      label: t('hub.station.thot'),
      draw: (g, x, y) => drawTerminal(g, x, y),
      action: () => this.openThoth(),
    });
    this.addStation({
      id: 'codex',
      x: 238,
      y: 316,
      color: 0x9ab4ff,
      label: t('hub.station.codex'),
      draw: (g, x, y) => drawShelf(g, x, y),
      action: () => this.openCodex(),
    });
    this.addStation({
      id: 'trophies',
      x: GAME_WIDTH - 238,
      y: 316,
      color: TROPHY_COLOR,
      label: t('hub.station.trophies'),
      draw: (g, x, y) => drawPedestal(g, x, y),
      action: () => this.openTrophies(),
    });
    this.addStation({
      id: 'aelia',
      x: GAME_WIDTH / 2,
      y: 218,
      color: 0xffa040,
      label: t('hub.station.aelia'),
      draw: (g, x, y) => drawBrazier(g, x, y),
      action: () => this.talkToAnii(),
    });
    // Le brasero d'Anii brille un peu plus à chaque victoire.
    const flame = this.add
      .image(GAME_WIDTH / 2, 210, 'glow')
      .setTint(0xffa040)
      .setAlpha(0.55)
      .setScale(1.2 + Math.min(meta.clears, 10) * 0.08)
      .setBlendMode('ADD');
    this.tweens.add({ targets: flame, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    this.addStation({
      id: 'forge',
      x: 490,
      y: 196,
      color: 0xffe08a,
      label: t('hub.station.forge'),
      draw: (g, x, y) => drawForge(g, x, y),
      action: () => this.openForge(),
    });
    if (meta.clears >= HEAT_UNLOCK_VICTORIES) {
      const heat = heatTotal(meta.heat);
      this.addStation({
        id: 'heat',
        x: 490,
        y: 290,
        color: 0xffa040,
        label: heat > 0 ? t('hub.heatButtonOn', { heat }) : t('hub.heatButton'),
        draw: (g, x, y) => drawBoard(g, x, y),
        action: () => this.openHeat(),
      });
    }
    if (meta.deaths >= 1) {
      // Vesper, perché près de la porte : il observe Ash.
      const g = this.add.graphics();
      drawRaven(g, GAME_WIDTH / 2 - 56, 112);
      this.addBarker('vesper', GAME_WIDTH / 2 - 56, 100, 150);
      this.tweens.add({ targets: g, y: -1.5, duration: 1300, yoyo: true, repeat: -1 });
    }
    this.addBarker('thot', 150, 270, 320);
    this.addBarker('brokk', 473, 178, 230);
    this.addBarker('aelia', GAME_WIDTH / 2, 196, 252);
    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        color: '#ffe9d6',
        stroke: '#07060d',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(30)
      .setVisible(false);
  }

  /** Un habitant qui parle : bulle au-dessus de lui (`reach` : jusqu'où Ash peut être, en hauteur). */
  private addBarker(who: BarkSpeaker, x: number, y: number, reachY?: number): void {
    const bubble = this.add
      .text(x, y, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '8px',
        color: '#ffe9d6',
        backgroundColor: '#14101e',
        padding: { x: 5, y: 3 },
        align: 'center',
        wordWrap: { width: 150 },
      })
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setAlpha(0);
    this.barkers.push({ who, x, y: reachY ?? y + 40, lastAt: -BARK_COOLDOWN_MS, last: -1, bubble });
  }

  private updateBarks(): void {
    const now = this.time.now;
    if (now - this.lastBarkAt < BARK_GLOBAL_MS) return;
    for (const b of this.barkers) {
      if (now - b.lastAt < BARK_COOLDOWN_MS) continue;
      if (Math.hypot(this.ash.x - b.x, this.ash.y - b.y) > BARK_RANGE) continue;
      // Pas à chaque passage : une fois sur deux, l'habitant se tait (et on réessaie plus tard).
      b.lastAt = now;
      this.lastBarkAt = now;
      if (Math.random() > BARK_CHANCE) continue;
      // Une réplique au hasard, jamais deux fois de suite la même.
      const count = BARKS[b.who];
      let n = Math.floor(Math.random() * count);
      if (n === b.last) n = (n + 1) % count;
      b.last = n;
      b.lastAt = now;
      b.bubble
        .setText(t(`bark.${b.who}.${n + 1}` as TextKey, { deaths: session.save.meta.deaths }))
        .setAlpha(0);
      // La bulle ne sort jamais de l'écran.
      const half = b.bubble.width / 2;
      b.bubble.setX(Math.min(GAME_WIDTH - 6 - half, Math.max(6 + half, b.bubble.x)));
      this.tweens.killTweensOf(b.bubble);
      this.tweens.add({
        targets: b.bubble,
        alpha: 1,
        duration: 200,
        hold: BARK_SHOW_MS,
        yoyo: true,
      });
    }
  }

  private addStation(def: Omit<Station, 'labelText' | 'graphics'>): void {
    const g = this.add.graphics().setDepth(4);
    def.draw(g, def.x, def.y);
    const labelText = this.add
      .text(def.x, def.y + 22, def.label, {
        fontFamily: FONT_FAMILY,
        fontSize: '9px',
        color: `#${def.color.toString(16).padStart(6, '0')}`,
        stroke: '#07060d',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(5)
      .setAlpha(0.8);
    const station: Station = { ...def, labelText, graphics: g };
    this.stations.push(station);
    // Toucher une station : Ash y marche, puis l'ouvre.
    this.add
      .zone(def.x, def.y + 6, 60, 54)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        if (this.modal || this.starting) return;
        if (this.distanceTo(station) <= INTERACT_RANGE) station.action();
        else this.walkTarget = { ...this.approachPoint(station), station };
      });
  }

  private spawnAsh(meta: MetaState): void {
    const x = GAME_WIDTH / 2;
    const y = 300;
    this.ashGlow = this.add
      .image(x, y, 'glow')
      .setTint(COLORS.phoenix)
      .setAlpha(0.5)
      .setScale(1.8)
      .setBlendMode('ADD');
    this.ash = this.add.image(x, y, 'ash').setScale(2).setDepth(10);
    addFlameHair(this, this.ash, -14, 2);
    this.controls = new Controls(this, () => this.time.now);
    // Toucher le sol : Ash y marche.
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.modal || this.starting || over.length > 0) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      this.walkTarget = clampToFloor(w.x, w.y);
    });
    void meta;
  }

  private moveAsh(delta: number): void {
    const move = this.controls.move;
    let vx = move.x;
    let vy = move.y;
    if (Math.hypot(vx, vy) > 0.1) {
      this.walkTarget = null;
    } else if (this.walkTarget) {
      const dx = this.walkTarget.x - this.ash.x;
      const dy = this.walkTarget.y - this.ash.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        const station = this.walkTarget.station;
        this.walkTarget = null;
        station?.action();
        return;
      }
      vx = dx / d;
      vy = dy / d;
    } else return;
    const step = (ASH_SPEED * delta) / 1000;
    const next = clampToFloor(this.ash.x + vx * step, this.ash.y + vy * step);
    this.ash.setPosition(next.x, next.y);
    if (Math.abs(vx) > 0.1) this.ash.setFlipX(vx < 0);
    this.ashGlow.setPosition(next.x, next.y);
  }

  /** Distance d'Ash au pied de la station (on peut l'utiliser de côté comme de face). */
  private distanceTo(station: Station): number {
    return Math.hypot(this.ash.x - station.x, this.ash.y - (station.y + 18));
  }

  /** Là où Ash se tient pour utiliser une station : juste devant (en dessous). */
  private approachPoint(station: Station): { x: number; y: number } {
    return clampToFloor(station.x, station.y + 30);
  }

  private nearStation(): Station | undefined {
    let best: Station | undefined;
    let bestD = INTERACT_RANGE;
    for (const st of this.stations) {
      const d = this.distanceTo(st);
      if (d <= bestD) {
        best = st;
        bestD = d;
      }
    }
    return best;
  }

  private highlightStations(): void {
    const near = this.nearStation();
    for (const st of this.stations) st.labelText.setAlpha(st === near ? 1 : 0.75);
    if (!near) {
      this.prompt.setVisible(false);
      return;
    }
    this.prompt
      .setText(t('hub.interact'))
      .setPosition(near.x, near.y - 22)
      .setVisible(true);
  }

  private openRack(): void {
    if (this.modal || this.starting) return;
    this.modal = true;
    sfx.tap();
    new WeaponPanel(
      this,
      session.save.meta,
      (weapon) => {
        selectWeapon(session.save.meta, weapon);
        session.commit();
        this.modal = false;
        this.scene.restart({});
      },
      () => {
        this.modal = false;
        this.openForge();
      },
      () => {
        this.modal = false;
      },
    );
  }

  /** Brasero d'Anii : un dialogue nouveau s'il y en a un, sinon ses souvenirs. */
  private talkToAnii(): void {
    if (this.modal || this.starting) return;
    const last = this.summary
      ? { ...this.summary, atBoss: this.summary.room > getBiome(this.summary.biome).rooms }
      : undefined;
    if (nextDialogue(session.save.meta, last)) {
      this.playStory();
      return;
    }
    this.modal = true;
    sfx.tap();
    new CodexPanel(
      this,
      session.save.meta,
      () => {
        this.modal = false;
      },
      'memory',
    );
  }

  private abandonStation(): void {
    const st = this.stations.find((s) => s.id === 'abandon');
    if (!this.abandonArmed) {
      this.abandonArmed = true;
      sfx.tap();
      st?.labelText.setText(t('hub.abandonConfirm'));
      this.time.delayedCall(3000, () => {
        this.abandonArmed = false;
        st?.labelText.setText(t('hub.abandon'));
      });
      return;
    }
    this.abandon();
  }

  /** En revenant dans la Cage : un personnage parle (une réplique nouvelle à la fois). */
  private playStory(): void {
    if (this.modal || this.starting) return;
    const meta = session.save.meta;
    const last = this.summary
      ? { ...this.summary, atBoss: this.summary.room > getBiome(this.summary.biome).rooms }
      : undefined;
    const dialogue = nextDialogue(meta, last);
    if (!dialogue) return;
    this.modal = true;
    markScene('dialogue');
    new DialogueBox(this, dialogue, () => {
      markSeen(meta, dialogue.id);
      session.commit();
      this.modal = false;
      markScene('hub');
      // La Lame de l'Aube vient d'être forgée : on redessine la Cage pour l'afficher.
      if (dialogue.id === `victory_${DAWNBLADE_VICTORIES}`) this.scene.restart({});
    });
  }

  private openRecap(): void {
    const summary = this.summary;
    if (!summary || this.modal || this.starting) return;
    this.modal = true;
    markScene('recap');
    new RecapPanel(this, summary, () => {
      this.modal = false;
      markScene('hub');
      this.time.delayedCall(250, () => this.playStory());
    });
  }

  private openTrophies(): void {
    if (this.modal || this.starting) return;
    this.modal = true;
    sfx.tap();
    new TrophyPanel(this, session.save.meta, () => {
      this.modal = false;
    });
  }

  /** Un bandeau doré par trophée gagné, l'un après l'autre, en haut de la Cage. */
  private announceTrophies(list: readonly TrophyDef[]): void {
    list.forEach((def, i) => {
      this.time.delayedCall(900 + i * 2600, () => {
        const text = this.add
          .text(
            GAME_WIDTH / 2,
            86,
            t('trophy.earned', { name: t(`trophy.${def.id}` as TextKey), reward: rewardText(def) }),
            {
              fontFamily: FONT_FAMILY,
              fontSize: '11px',
              fontStyle: 'bold',
              color: '#ffd36b',
              backgroundColor: '#14101e',
              padding: { x: 10, y: 6 },
            },
          )
          .setOrigin(0.5)
          .setDepth(500)
          .setAlpha(0);
        const cup = this.add.graphics().setDepth(501).setAlpha(0);
        drawTrophyCup(cup, GAME_WIDTH / 2 - text.width / 2 - 2, 86, 9, true);
        sfx.chest();
        this.tweens.add({
          targets: [text, cup],
          alpha: 1,
          duration: 250,
          hold: 2000,
          yoyo: true,
          onComplete: () => {
            text.destroy();
            cup.destroy();
          },
        });
      });
    });
  }

  private openCodex(): void {
    if (this.modal || this.starting) return;
    this.modal = true;
    sfx.tap();
    new CodexPanel(this, session.save.meta, () => {
      this.modal = false;
    });
  }

  private openHeat(): void {
    if (this.modal || this.starting || session.save.meta.clears < HEAT_UNLOCK_VICTORIES) return;
    this.modal = true;
    sfx.tap();
    new HeatPanel(
      this,
      session.save.meta.heat,
      () => session.commit(),
      () => {
        this.modal = false;
        this.scene.restart({});
      },
    );
  }

  private openForge(): void {
    if (this.modal || this.starting) return;
    this.modal = true;
    sfx.tap();
    new ForgePanel(
      this,
      session.save.meta,
      () => session.commit(),
      () => {
        this.modal = false;
        this.scene.restart({});
      },
    );
  }

  private openThoth(): void {
    if (this.modal || this.starting) return;
    this.modal = true;
    sfx.tap();
    new ThothPanel(
      this,
      session.save.meta,
      () => session.commit(),
      () => {
        this.modal = false;
        this.scene.restart({});
      },
    );
  }

  private openOptions(): void {
    if (this.modal || this.starting) return;
    this.modal = true;
    sfx.tap();
    new OptionsPanel(this, () => {
      this.modal = false;
      this.scene.restart({});
    });
  }

  private openSave(): void {
    if (this.modal || this.starting) return;
    this.modal = true;
    sfx.tap();
    openSaveDialog({
      exportCode: exportCode(session.save),
      onImport: (text) => {
        try {
          session.replace(importCode(text));
          return null;
        } catch (err) {
          return err instanceof NewerSaveError ? t('save.errorNewer') : t('save.errorInvalid');
        }
      },
      onClose: () => {
        this.modal = false;
        this.scene.restart({});
      },
    });
  }

  private resume(): void {
    const run = session.save.run;
    if (this.starting || !run) return;
    this.starting = true;
    sfx.tap();
    this.go(structuredClone(run));
  }

  private abandon(): void {
    const run = session.save.run;
    if (!run) return;
    const summary = summarize(run, 'death', t('hub.abandoned'));
    finishRun(session.save, summary);
    session.commit();
    this.scene.restart({ summary });
  }

  private start(weapon: WeaponId): void {
    if (this.starting) return;
    this.starting = true;
    sfx.tap();
    const seed = randomSeed();
    recordCodex(session.save.meta, `weapon.${weapon}`);
    const bonus = runBonuses(session.save.meta);
    const run = newRun(
      seed,
      weapon,
      PLAYER.maxHp + bonus.maxHpBonus,
      Date.now(),
      GOD_IDS[seed % GOD_IDS.length] ?? 'ra',
      bonus.perks,
      bonus.superStart,
      forgeLevel(session.save.meta, weapon),
      session.save.meta.clears >= HEAT_UNLOCK_VICTORIES ? session.save.meta.heat : {},
    );
    this.go(run);
  }

  private go(run: NonNullable<typeof session.save.run>): void {
    this.cameras.main.fadeOut(400, 7, 6, 13);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('run', { run }),
    );
  }
}

/** Station de la Cage : une forme dessinée, un nom, une action. */
interface Station {
  id: string;
  x: number;
  y: number;
  color: number;
  label: string;
  draw: (g: Phaser.GameObjects.Graphics, x: number, y: number) => void;
  action: () => void;
  labelText: Phaser.GameObjects.Text;
  graphics: Phaser.GameObjects.Graphics;
}

/** Distance à laquelle Ash peut utiliser une station. */
const INTERACT_RANGE = 40;
const ASH_SPEED = 120;
/** Sol de la Cage (entre les barreaux). */
const FLOOR = { left: 104, right: GAME_WIDTH - 104, top: 150, bottom: 330 };

function clampToFloor(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(FLOOR.right, Math.max(FLOOR.left, x)),
    y: Math.min(FLOOR.bottom, Math.max(FLOOR.top, y)),
  };
}

// ---------- Dessins des stations (formes distinctes, pas seulement des couleurs) ----------

function drawDoor(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x07060d, 1).fillRoundedRect(x - 24, y - 30, 48, 44, {
    tl: 24,
    tr: 24,
    bl: 0,
    br: 0,
  });
  g.fillStyle(0x2a1a0a, 1).fillRoundedRect(x - 18, y - 24, 36, 38, {
    tl: 18,
    tr: 18,
    bl: 0,
    br: 0,
  });
  g.lineStyle(2, 0xffb02e, 1).strokeRoundedRect(x - 24, y - 30, 48, 44, {
    tl: 24,
    tr: 24,
    bl: 0,
    br: 0,
  });
  g.lineStyle(2, 0xffe08a, 0.9);
  g.lineBetween(x - 7, y - 2, x, y - 10).lineBetween(x, y - 10, x + 7, y - 2);
  g.lineBetween(x - 7, y + 6, x, y - 2).lineBetween(x, y - 2, x + 7, y + 6);
}

function drawBrokenChain(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.lineStyle(2, 0x6b4cff, 1);
  g.strokeEllipse(x - 7, y, 12, 8).strokeEllipse(x + 7, y, 12, 8);
  g.lineBetween(x - 2, y - 6, x + 2, y + 6);
}

function drawRack(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3a2a1c, 1)
    .fillRect(x - 20, y + 8, 40, 5)
    .fillRect(x - 20, y - 16, 4, 26);
  g.fillRect(x + 16, y - 16, 4, 26).fillRect(x - 20, y - 16, 40, 3);
  g.lineStyle(2, 0xd8e2ff, 1);
  for (const dx of [-9, 0, 9]) g.lineBetween(x + dx, y - 12, x + dx, y + 7);
  g.fillStyle(0xffb02e, 1);
  for (const dx of [-9, 0, 9]) g.fillRect(x + dx - 3, y + 2, 6, 2);
}

function drawTerminal(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x0d1a16, 1).fillRect(x - 14, y - 12, 28, 20);
  g.lineStyle(1.5, 0x7fffc0, 0.9).strokeRect(x - 14, y - 12, 28, 20);
  g.fillStyle(0x7fffc0, 0.85)
    .fillRect(x - 10, y - 8, 14, 2)
    .fillRect(x - 10, y - 4, 20, 2);
  g.fillRect(x - 10, y, 9, 2);
  g.fillStyle(0x3a4a44, 1)
    .fillRect(x - 3, y + 8, 6, 6)
    .fillRect(x - 9, y + 14, 18, 3);
}

/** Socle des trophées : une coupe dorée sur une colonne. */
function drawPedestal(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x2a2238, 1).fillRect(x - 10, y - 2, 20, 16);
  g.lineStyle(1.5, TROPHY_COLOR, 0.7).strokeRect(x - 10, y - 2, 20, 16);
  g.fillStyle(0x3a3050, 1).fillRect(x - 14, y + 12, 28, 4);
  drawTrophyCup(g, x, y - 12, 10, true);
}

function drawShelf(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x141a2a, 1).fillRect(x - 16, y - 18, 32, 32);
  g.lineStyle(1.5, 0x9ab4ff, 0.9).strokeRect(x - 16, y - 18, 32, 32);
  g.lineBetween(x - 16, y - 7, x + 16, y - 7).lineBetween(x - 16, y + 4, x + 16, y + 4);
  const colors = [0x9ab4ff, 0x7fffc0, 0xb08cff, 0xffe08a];
  [-12, -7, -2, 3, 8].forEach((dx, i) => {
    g.fillStyle(colors[i % colors.length] ?? 0x9ab4ff, 0.9).fillRect(x + dx, y - 16, 3, 8);
    g.fillRect(x + dx + 1, y - 5, 3, 8);
  });
}

function drawBrazier(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x3a2a1c, 1)
    .fillRect(x - 3, y + 2, 6, 10)
    .fillRect(x - 10, y + 11, 20, 3);
  g.fillStyle(0x5a4030, 1).fillTriangle(x - 14, y - 4, x + 14, y - 4, x, y + 4);
  g.fillStyle(0xffa040, 1).fillTriangle(x - 8, y - 4, x + 8, y - 4, x, y - 20);
  g.fillStyle(0xffe08a, 1).fillTriangle(x - 4, y - 4, x + 4, y - 4, x, y - 13);
}

function drawForge(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  // Enclume.
  g.fillStyle(0xc0c8d8, 1).fillRect(x - 6, y - 4, 22, 6);
  g.fillTriangle(x + 16, y - 4, x + 22, y - 4, x + 16, y + 2);
  g.fillRect(x + 1, y + 2, 8, 7).fillRect(x - 3, y + 9, 16, 4);
  // Ptah, comme on le représente en Égypte : corps serré dans un linceul clair, visage vert,
  // calotte bleue, barbe droite, et son sceptre tenu droit devant lui.
  g.fillStyle(0xe8dcc0, 1).fillRoundedRect(x - 23, y - 6, 12, 19, 4);
  g.lineStyle(1, 0xb8aa88, 1)
    .lineBetween(x - 22, y, x - 12, y)
    .lineBetween(x - 22, y + 6, x - 12, y + 6);
  g.fillStyle(0x5fae7a, 1).fillCircle(x - 17, y - 11, 5);
  g.fillStyle(0x3a6ad8, 1).fillRoundedRect(x - 22, y - 17, 10, 6, { tl: 4, tr: 4, bl: 0, br: 0 });
  g.fillStyle(0x3a2a1c, 1).fillRect(x - 15, y - 7, 3, 6);
  g.lineStyle(2, 0xffe08a, 1).lineBetween(x - 8, y - 15, x - 8, y + 13);
  g.lineStyle(1.5, 0xffe08a, 1).strokeCircle(x - 8, y - 17, 2.5);
}

function drawBoard(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a120a, 1).fillRect(x - 18, y - 14, 36, 26);
  g.lineStyle(1.5, 0xffa040, 0.9).strokeRect(x - 18, y - 14, 36, 26);
  for (let i = 0; i < 6; i++) {
    const px = x - 13 + (i % 3) * 13;
    const py = y - 8 + Math.floor(i / 3) * 11;
    g.lineStyle(1.5, 0xffa040, 1).strokeRect(px - 3, py - 3, 6, 6);
  }
}

function drawRaven(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x1a1626, 1).fillEllipse(x, y, 14, 10);
  g.fillCircle(x + 6, y - 4, 4);
  g.fillTriangle(x + 9, y - 5, x + 14, y - 3, x + 9, y - 2);
  g.fillTriangle(x - 6, y, x - 13, y + 4, x - 6, y + 3);
  g.fillStyle(0xb8a8ff, 1).fillCircle(x + 7, y - 5, 1.2);
  g.lineStyle(1, 0x6a5a8a, 1).lineBetween(x - 14, y + 6, x + 14, y + 6);
}
