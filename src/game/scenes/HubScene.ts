import Phaser from 'phaser';
import { finishRun, runBonuses } from '../../core/meta';
import { randomSeed } from '../../core/rng';
import { newRun, summarize, type RunSummary } from '../../core/run/state';
import { exportCode, importCode } from '../../core/save/codec';
import { NewerSaveError } from '../../core/save/migrations';
import { getBiome } from '../../data/biomes';
import { GOD_IDS } from '../../data/gods';
import { PLAYER } from '../../data/player';
import { WEAPON_ORDER, WEAPONS, type WeaponId } from '../../data/weapons';
import { UNLOCK_COST } from '../../data/forge';
import { t, type TextKey } from '../../i18n';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { addEmbers, drawCage, ensureTextures } from '../backdrop';
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
import { forgeLevel, isUnlocked } from '../../core/forge';
import { settings } from '../../core/settings';
import { applyPostFx, autoLowerQuality } from '../fx/postfx';
import { newAutoQuality } from '../../core/perf';
import { markScene } from './markScene';

/** La Cage (hub) : résumé de la dernière run, reprise, choix de l'arme, sauvegarde. */
export class HubScene extends Phaser.Scene {
  private summary: RunSummary | undefined;
  private starting = false;
  /** Une fenêtre (sauvegarde, Thot) est ouverte : la Cage ignore les touches. */
  private modal = false;

  constructor() {
    super('hub');
  }

  init(data: { summary?: RunSummary }): void {
    this.summary = data.summary;
    this.starting = false;
    this.modal = false;
  }

  create(): void {
    ensureTextures(this);
    ensureGameTextures(this);
    const cx = GAME_WIDTH / 2;
    const meta = session.save.meta;

    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const recenter = () => this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.scale.on('resize', recenter);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', recenter));

    drawCage(this, 0.7);
    addEmbers(this);

    const ash = this.add.image(cx, 168, 'ash').setScale(2);
    const glow = this.add
      .image(cx, 168, 'glow')
      .setTint(COLORS.phoenix)
      .setAlpha(0.6)
      .setScale(2.4)
      .setBlendMode('ADD');
    this.tweens.add({
      targets: glow,
      scale: 2.8,
      alpha: 0.4,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    this.tweens.add({
      targets: ash,
      y: 164,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const style = {
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
      stroke: '#07060d',
      strokeThickness: 3,
    };
    this.add.text(cx, 54, t('hub.name'), { ...style, fontSize: '26px' }).setOrigin(0.5);

    const lines: string[] = [];
    if (this.summary) {
      const minutes = Math.floor(this.summary.elapsedMs / 60000);
      const seconds = Math.floor((this.summary.elapsedMs % 60000) / 1000);
      lines.push(
        this.summary.outcome === 'death'
          ? this.summary.room > getBiome(this.summary.biome).rooms
            ? t('hub.lastDeathBoss', {
                biome: t(getBiome(this.summary.biome).nameKey as TextKey),
                killer: this.summary.killedBy ?? '?',
              })
            : t('hub.lastDeath', {
                biome: t(getBiome(this.summary.biome).nameKey as TextKey),
                room: this.summary.room,
                killer: this.summary.killedBy ?? '?',
              })
          : t('hub.lastClearAll'),
        t('hub.lastStats', {
          minutes,
          seconds,
          xp: this.summary.xp,
          parts: this.summary.weaponParts,
        }),
      );
    } else {
      lines.push(t('hub.placeholder'));
    }
    lines.push(
      t('hub.totals', {
        xp: meta.xp,
        parts: meta.weaponParts,
        rebirths: t('hub.rebirths', { count: meta.deaths }),
        victories: t('hub.victories', { count: meta.clears }),
      }),
    );
    const assist = assistReduction(settings.assist, meta.assistDeaths);
    if (assist > 0) lines.push(t('hub.assistActive', { value: Math.round(assist * 100) }));
    this.add
      .text(cx, 84, lines.join('\n'), {
        ...style,
        fontSize: '11px',
        color: COLORS.textDim,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    makeButton(this, {
      x: 64,
      y: 26,
      w: 108,
      h: 30,
      label: t('hub.thothButton'),
      color: 0x7fffc0,
      fontSize: 12,
      onTap: () => this.openThoth(),
    });
    makeButton(this, {
      x: 64,
      y: 62,
      w: 108,
      h: 30,
      label: t('hub.forgeButton'),
      color: 0xffe08a,
      fontSize: 12,
      onTap: () => this.openForge(),
    });
    // Mesures d'urgence : après la 1re victoire.
    if (meta.clears >= HEAT_UNLOCK_VICTORIES) {
      const heat = heatTotal(meta.heat);
      makeButton(this, {
        x: GAME_WIDTH - 64,
        y: 62,
        w: 108,
        h: 30,
        label: heat > 0 ? t('hub.heatButtonOn', { heat }) : t('hub.heatButton'),
        color: 0xffa040,
        fontSize: 11,
        onTap: () => this.openHeat(),
      });
    }
    makeButton(this, {
      x: GAME_WIDTH - 180,
      y: 26,
      w: 108,
      h: 30,
      label: t('hub.optionsButton'),
      color: 0xffb02e,
      fontSize: 12,
      onTap: () => this.openOptions(),
    });
    makeButton(this, {
      x: GAME_WIDTH - 64,
      y: 26,
      w: 108,
      h: 30,
      label: t('hub.saveButton'),
      color: 0x6b4cff,
      fontSize: 12,
      onTap: () => this.openSave(),
    });

    if (session.save.run) this.showResume();
    else this.showWeapons();

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
      if (session.save.run) {
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Digit1') this.resume();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') this.start('katana');
      const digit = Number(/^Digit([1-7])$/.exec(e.code)?.[1] ?? 0);
      const id = WEAPON_ORDER[digit - 1];
      if (id && isUnlocked(session.save.meta, id)) this.start(id);
    });

    this.cameras.main.fadeIn(500, 7, 6, 13);
    applyPostFx(this.cameras.main, settings.quality);
    this.autoQuality = newAutoQuality();
    music.play('hub');
    markScene('hub');
    this.time.delayedCall(650, () => this.playStory());
  }

  private autoQuality = newAutoQuality();

  override update(_time: number, delta: number): void {
    autoLowerQuality(this.autoQuality, delta, this.cameras.main);
    if (this.modal) return;
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    if (!pad) return;
    if (session.save.run) {
      if (pad.buttons[0]?.pressed) this.resume();
      return;
    }
    if (pad.buttons[0]?.pressed) this.start('katana');
    if (pad.buttons[2]?.pressed) this.start('twinBlades');
  }

  private showWeapons(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 214, t('hub.chooseWeapon'), {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        color: COLORS.text,
        stroke: '#07060d',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    // 7 armes sur 2 rangées (4 + 3) ; une arme verrouillée renvoie vers la forge de Brokk.
    WEAPON_ORDER.forEach((id, i) => {
      const unlocked = isUnlocked(session.save.meta, id);
      const row = i < 4 ? 0 : 1;
      const col = row === 0 ? i - 1.5 : i - 4 - 1;
      const cost = UNLOCK_COST[id];
      makeButton(this, {
        x: cx + col * 128,
        y: 248 + row * 50,
        w: 122,
        h: 42,
        label: t(WEAPONS[id].nameKey as TextKey),
        sub: unlocked
          ? t('hub.escape', { key: i + 1 })
          : cost !== undefined
            ? t('hub.locked', { cost })
            : t('hub.lockedDawn'),
        color: unlocked ? WEAPONS[id].color : 0x3a3550,
        fontSize: 11,
        onTap: () => (unlocked ? this.start(id) : this.openForge()),
      });
    });
  }

  /** Une run est sauvegardée : on la reprend (ou on l'abandonne, avec confirmation). */
  private showResume(): void {
    const run = session.save.run;
    if (!run) return;
    const cx = GAME_WIDTH / 2;
    this.add
      .text(
        cx,
        222,
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
        {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          color: COLORS.text,
          stroke: '#07060d',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5);
    makeButton(this, {
      x: cx,
      y: 262,
      w: 200,
      h: 46,
      label: t('hub.resume'),
      sub: t('hub.resumeSub', { hp: run.hp, maxHp: run.maxHp }),
      color: 0xffb02e,
      onTap: () => this.resume(),
    });
    let confirming = false;
    const abandon = makeButton(this, {
      x: cx,
      y: 314,
      w: 200,
      h: 30,
      label: t('hub.abandon'),
      color: 0x6b4cff,
      fontSize: 11,
      onTap: () => {
        if (!confirming) {
          confirming = true;
          abandon.setLabel(t('hub.abandonConfirm'));
          return;
        }
        this.abandon();
      },
    });
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
