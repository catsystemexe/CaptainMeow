# FABLE — FSM ARCHITECTURE, KROK 2: CÍLOVÝ NÁVRH

Navazuje na: `fsm-audit.md` (Krok 1, commit `43da07a`, HEAD auditu `0a1a590` = `origin/work`).
Reference na nálezy F-01 … F-18 odpovídají sekci H auditu.

---

## A. Executive recommendation

**Doporučená architektura: Varianta C — hybrid s pevnými kategoriemi a omezenou kompozicí uvnitř movementu.**

Stav FSM bude mít čtyři pevné, typované kategorie + transitions:

```
FsmStateDef
├── movement:   { base: 1× MovementBase, modifiers: 0–3× MovementModifier (uspořádané) }
├── targeting:  0–1× TargetingConfig        (default "forward")
├── combat:     explicitní disabled | inherit | profile
├── lifecycle:  onEnter akce (typovaná, malá sada; MVP: despawn)
└── transitions: uspořádaný seznam { when: Condition, to: stableStateId }
```

**Základní princip:** zachovat vše, co audit označil za zdravé — deterministické jádro `updateFsm` (first-match, max. 1 přechod/tick), Behavior V1 kontrakt (target-based, jediná integrace pohybu v `EnemySystem`), 11 existujících movement primitiv, content pipeline s validací — a doplnit přesně to, co chybí: stabilní state ID, lifecycle (enter/re-entry/terminal), explicitní combat režim, funkcionální movement modifiery, strukturální validaci grafů, preset registry s draftem a user persistence.

**Proč je to vhodné pro CM:**
- Pevné kategorie mapují 1:1 na existující kód: base movement = dnešní `EnemyBehaviorDB` primitivy, combat = dnešní `AttackController` profily, transitions = dnešní `Trigger` union. Migrace je adaptace, ne přepis.
- Omezená kompozice (base + max. 3 modifiery) dává 90 % užitku obecného modulového seznamu (Varianta B) při zlomku validační a UI složitosti — modifiery jsou čisté transformace targetu, takže konflikty zápisu z principu nevznikají.
- Editor bez node grafu: pevné kategorie = pevné UI sekce (accordion), žádný obecný „skládač modulů".

**Co se zachovává:** `updateFsm` sémantika přechodů, všech 11 primitiv (adaptace na typované parametry), `AttackController` datový model, fázový řád, `markKill`+Cleanup, `emitNext` spawn routing, `behaviorPresetId` pro ne-FSM enemy, `ENEMY_GROUP_PARAM_LIMITS` vzor pro metadata parametrů.

**Co se mění:** state dostane stabilní `id` + `label`; `movementPresetId` string nahradí inline typovaná konfigurace; přibude `FsmPresetRegistry` (built-in + user + draft); `BEHAVIOR_GRAPHS` raw cast nahradí validovaný load; `fsmAppliedMovementPresetId` de-dupe nahradí explicitní enter/exit lifecycle; `EnemySystem` deleguje FSM/movement/combat resolvery do tří malých modulů; Enemy Lab dostane editor; despawn bude explicitní lifecycle akce.

---

## B. Goals and non-goals

### Goals (MVP)
1. Typovaný, validovaný, serializovatelný FSM preset model se `schemaVersion`.
2. Stabilní state ID; rename bez rozbití transitions.
3. Movement kompozice: base + uspořádané modifiery, při zachování Behavior V1 kontraktu.
4. Oddělený targeting (směr střelby) od movementu a od fire patternu.
5. Explicitní combat `disabled | inherit | profile` — řeší F-04.
6. Lifecycle: onEnter, re-entry reset, explicitní `despawn` akce přes `markKill` — řeší F-03, F-14.
7. Vícevrstvá validace (strukturální/referenční/sémantická/editorová) — řeší F-01, F-02.
8. Centralizovaná behavior metadata (labels, jednotky, min/max/step/default) — řeší F-08, F-09, F-13.
9. User presety v localStorage, JSON import/export, migrace se zálohou.
10. Enemy Lab editor (master-detail, draft, preview přes respawn) — řeší F-20/F-18 (UI nesmí nabízet ignorovanou volbu).
11. Formalizace cull anchor kontraktu — řeší F-16.
12. Migrace 10 built-in grafů bez pozorovatelné změny chování.

### Non-goals (mimo scope, viz zadání §4.2)
Node graph editor, visual scripting, behavior tree, hierarchická/paralelní/vnořená FSM, vlastní jazyk, arbitrary user code, cloud/DB/sync, přepis enemy systému, migrace všech enemies na FSM, redesign celého dev UI, univerzální action systém. Pravděpodobnostní transitions a náhodné parametry: pouze příprava (seedovaný RNG kontrakt), ne implementace. Undo/redo: mimo MVP, návrh ho nesmí znemožnit.

---

## C. Porovnání variant

| Kritérium | A — pevné sloty (1 hodnota/slot) | B — obecný seznam modulů | C — hybrid (doporučeno) |
|---|---|---|---|
| Princip | `{movement?, targeting?, combat?}` — každý slot max. 1 config | `behaviors: BehaviorConfig[]` — plochý seznam libovolných modulů | pevné kategorie; uvnitř movementu base + omezené modifiery |
| Podoba v CM | dnešní stav + typování (`movementPresetId`→config) | nový exekuční pipeline nad `EnemyBehaviorDB` | base = dnešní primitivy beze změny kontraktu; modifiery = nová malá vrstva transformací targetu |
| Výhody | minimální diff; snadná validace; snadné UI | maximální expresivita; jednotný model | kompozice tam, kde má smysl (movement); jednoduchost tam, kde kompozice smysl nemá (combat, targeting) |
| Nevýhody | „sine na straight" = nový kombinovaný primitiv → kombinatorická exploze presetů (dnes už 26 presetů kvůli parametrizacím) | kdo vlastní target? konflikt 2 movement modulů; ordering je uživatelský problém; validace kombinací = matice N×N | nutnost definovat hranici base vs. modifier; 2 registry místo 1 |
| Runtime složitost | nízká | vysoká (dispatch, konflikt resolution, priority) | nízká–střední (1 base + sekvenční fold modifierů) |
| UI složitost | nízká | vysoká (obecný seznam = mini node editor bez grafu) | střední (pevné sekce, uvnitř movementu malý seznam) |
| Validace | triviální | těžká (sémantika kombinací) | snadná: base povinný a právě 1; modifiery bezkonfliktní z definice (čisté transformace) |
| Konflikty | žádné | hlavní problém varianty | movement: nemožné (fold); targeting/combat: single-slot |
| Migrace | nejlevnější | drahá (přemodelovat primitivy na moduly) | levná: base = adaptované primitivy, legacy graf = base bez modifierů |
| Rozšiřitelnost | špatná (každá kombinace = nový primitiv) | nejlepší, ale za cenu složitosti | dobrá: nový modifier funguje se všemi bases automaticky |
| Riziko overengineeringu | žádné | vysoké (de facto visual scripting) | nízké při tvrdém limitu kategorií a počtu modifierů |
| Dopad na EnemySystem | minimální | velký (nový exekuční engine) | střední: extrakce 3 resolverů, integrace zůstává |
| Dopad na `EnemyBehaviorDB`/presety | žádný | přepis | adaptace signatur (params/state explicitně místo `e.behavior`/`e.bState`), presety zůstanou jako výchozí hodnoty parametrů |

**Decision:** Varianta C.
**Reason:** Jediný reálný požadavek na kompozici z auditu i zadání je *movement* (offsety, clampy, evade překryvy) — targeting a combat jsou přirozeně single-slot. Varianta C dává kompozici přesně tam a nikde jinde. Modifiery jako čisté transformace `target → target` strukturálně eliminují konfliktní zápisy (nejtěžší problém varianty B) a zachovávají Behavior V1 kontrakt beze změny.
**Rejected alternative:** B — expresivita, kterou CM nepotřebuje (žádný use-case z §11 zadání nevyžaduje 2 base movementy současně), za cenu validace kombinací a UI, které by se blížilo zakázanému visual scriptingu. A — zakonzervovala by dnešní explozi presetů (F-08) a neumožnila „sine offset na approach player".
**Trade-off:** hranici base/modifier je nutné disciplinovaně držet (riziko R-01); modifiery mají vlastní malý registr navíc.

---

## D. Doporučená cílová architektura

### Komponenty a umístění

```
src/game/enemies/fsm/
├── FsmTypes.ts            (rozšířeno: cílový datový model, sekce E)
├── FsmRuntime.ts          (NOVÉ: evoluce FsmController — transitions + lifecycle + state switch)
├── FsmPresetRegistry.ts   (NOVÉ: built-in + user + draft, resolved cache)
├── validate.ts            (NOVÉ: validateFsmPreset, ValidationIssue)
├── migrate.ts             (NOVÉ: legacy graf → preset v1; budoucí v1→v2)
└── index.ts               (re-exporty)

src/game/enemies/runtime/
├── MovementResolver.ts    (NOVÉ: base + modifiery → target)
├── CombatResolver.ts      (NOVÉ: targeting → aim; combat mode → volání attack executoru)
└── moduleState.ts         (NOVÉ: alokace/reset per-entity runtime slotů)

src/game/enemies/catalog/
├── movementBases.ts       (adaptace 11 primitiv: descriptor + module, satisfies Record<...>)
├── movementModifiers.ts   (NOVÉ: sineOffset, clampY, speedLimit)
├── targeting.ts           (NOVÉ: forward, atPlayer, fixedAngle, atPlayerOffset)
├── conditions.ts          (adaptace 4 conditions + distanceToPlayer)
└── paramSpec.ts           (ParamSpec, jednotky)

src/game/enemies/store/
├── UserPresetStore.ts     (NOVÉ: localStorage, import/export, backup, migrace)

src/dev/enemylab/          (NOVÉ: editor moduly, DevSummoner se zmenší na spawn panel + mount)
```

### Datové toky

```
content JSON (behaviorGraphs.json → migrate.ts) ──┐
localStorage (UserPresetStore) ───────────────────┼──▶ validate.ts ──▶ FsmPresetRegistry (resolved)
editor draft (EnemyLab) ──────────────────────────┘                        │
                                                                           ▼ (capture při spawnu)
SpawnSystem: ent.fsmPreset = registry.getResolved(key)          EnemySystem tick:
                                                                FsmRuntime → MovementResolver → vel →
                                                                groups → failsafe → integrace →
                                                                CombatResolver → cull
```

Registry je **stabilní reference** vytvořená v `createGame` (AGENTS §7.6); mění se její obsah, ne instance. Entita si při spawnu **zachytí resolved preset** (immutable snapshot) — běžící enemy není ovlivněn pozdější editací draftu (sekce N).

---

## E. TypeScript datový model

Umístění: `src/game/enemies/fsm/FsmTypes.ts` (serializovatelné definice) + `FsmRuntime.ts` (runtime-only typy). Vše níže je serializovatelná definice, pokud není řečeno jinak.

```ts
export const FSM_SCHEMA_VERSION = 1;

export type FsmPresetId = string;   // built-in: "fsm.turret"; user: "user.<nanoid>"
export type FsmStateId = string;    // stabilní, generované ("st_a1b2c3"), NIKDY se nemění

// ---------- Preset ----------
export interface FsmPreset {
  schemaVersion: number;      // verze při uložení; migrace při loadu starší verze
  id: FsmPresetId;
  meta: FsmPresetMeta;
  graph: FsmGraphDef;
}

export interface FsmPresetMeta {
  name: string;               // zobrazovaný název ("Turret v2")
  description?: string;
  createdAt?: number;         // epoch ms; jen user presety
  updatedAt?: number;
  // POZN.: source (builtin|user|draft) se NEserializuje uvnitř presetu —
  // určuje ho registr, který preset vlastní. Zabraňuje "user presetu tvářícímu se jako builtin".
}

export interface FsmGraphDef {
  initialStateId: FsmStateId;
  states: FsmStateDef[];      // pole = stabilní pořadí pro UI i serializaci; unikátnost id hlídá validátor
}

// ---------- State ----------
export interface FsmStateDef {
  id: FsmStateId;             // stabilní ID — transitions odkazují SEM
  label: string;              // zobrazovaný název ("Enter", "Attack") — rename mění jen label
  movement: MovementConfig;   // POVINNÉ (validátor: chybějící base = error) — žádné "zdědit předchozí"
  targeting?: TargetingConfig;  // absence = { type: "forward" }
  combat?: CombatConfig;        // absence = { mode: "disabled" }  ← explicitní řešení F-04
  lifecycle?: LifecycleConfig;
  transitions: TransitionDef[]; // pořadí = priorita (first-match)
}

// ---------- Movement ----------
export interface MovementConfig {
  base: MovementBaseConfig;
  modifiers?: MovementModifierConfig[];  // 0–3, uspořádané; pořadí určuje uživatel
}

export type MovementBaseConfig =
  | { type: "hold" }
  | { type: "straight";    params: { speedX: number; speedY: number } }
  | { type: "straightLerp";params: { speedXStart: number; speedXEnd: number;
                                     speedYStart: number; speedYEnd: number; durationSec: number } }
  | { type: "sine";        params: { speedX: number; speedY: number; ampX: number; ampY: number;
                                     freqHz: number; phaseStep: number } }
  | { type: "zigzag";      params: { speedX: number; speedY: number; ampY: number; periodSec: number } }
  | { type: "loop";        params: { speedX: number; speedY: number; radiusX: number; radiusY: number;
                                     durationSec: number; direction: 1 | -1; turns: number; repeat: boolean } }
  | { type: "invaders";    params: { speedX: number; speedY: number; ampX: number; freqHz: number; phaseStep: number } }
  | { type: "track";       params: { speedX: number; response: number; maxSpeedY: number; deadZoneY: number; offsetY: number } }
  | { type: "align";       params: { speedX: number; alignSpeedY: number; toleranceY: number; offsetY: number } }
  | { type: "evade";       params: { speedX: number; triggerBandY: number; evadeSpeedY: number;
                                     evadeDurationSec: number; cooldownSec: number; paddingY: number } }
  | { type: "range";       params: { preferredDistance: number; tolerance: number; response: number;
                                     maxSpeed: number; fallbackSpeedX: number; fallbackSpeedY: number } }
  | { type: "orbitTarget"; params: { radiusX: number; radiusY: number; angularSpeed: number;
                                     arcRadians: number; direction: 1 | -1; repeat: boolean; pingPong: boolean;
                                     radialResponse: number; maxRadialSpeed: number;
                                     fallbackSpeedX: number; fallbackSpeedY: number } };

export type MovementModifierConfig =
  | { type: "sineOffset"; params: { ampX: number; ampY: number; freqHz: number } }
  | { type: "clampY";     params: { paddingPx: number } }
  | { type: "speedLimit"; params: { maxSpeed: number } };   // px/s, limituje krok targetu od aktuální pozice

// ---------- Targeting ----------
export type TargetingConfig =
  | { type: "forward" }                                     // −X (dnešní "single")
  | { type: "atPlayer" }                                    // dnešní "aimed"
  | { type: "fixedAngle";     params: { deg: number } }     // 0° = +X, CCW
  | { type: "atPlayerOffset"; params: { dx: number; dy: number } };

// ---------- Combat ----------
export type CombatConfig =
  | { mode: "disabled" }                                    // explicitní vypnutí — přebíjí def-level profil
  | { mode: "inherit" }                                     // použij enemyType.attackProfileId (legacy sémantika)
  | { mode: "profile"; profileId: string; resetOnEnter?: boolean };  // default resetOnEnter: false (dnešní chování)

// ---------- Lifecycle ----------
export interface LifecycleConfig {
  onEnter?: LifecycleAction[];          // jednorázové, v pořadí pole, po přepnutí stavu v témže ticku
  resetMovementOnReenter?: boolean;     // default true (re-entry = plný reset movement modulů)
}

export type LifecycleAction =
  | { type: "despawn" }                                                             // MVP
  | { type: "spawnEnemy"; params: { typeId: string; count: number;
                                    offsetX: number; offsetY: number } };           // fáze 2 (emitNext)

// ---------- Transitions ----------
export interface TransitionDef {
  when: ConditionConfig;
  to: FsmStateId;
}

export type ConditionConfig =
  | { type: "timeInState";      params: { seconds: number } }
  | { type: "hpBelow";          params: { ratio: number } }                          // 0–1, striktní <
  | { type: "screenXBelow";     params: { x: number } }                              // px, SCREEN-space (pos.x − scrollX)
  | { type: "offscreen";        params: { side: "left" | "right"; marginPx?: number } }  // default 96 (dnešní konstanta → parametr)
  | { type: "distanceToPlayer"; params: { op: "below" | "above"; px: number } };     // MVP přírůstek
```

Runtime-only typy (`FsmRuntime.ts`), NIKDY se neserializují:

```ts
export interface FsmEntityRuntime {
  preset: ResolvedFsmPreset;    // immutable snapshot zachycený při spawnu
  stateId: FsmStateId;
  age: number;                  // s ve stavu
  movementState: object;        // slot base modulu (module.createState())
  modifierStates: object[];     // index-aligned s modifiers
  combatState: { cooldownMs: number; windupMs: number; firing: boolean; shotsFired: number } | null;
  diagnostics: { invalidTargetLogged?: boolean };  // log-once guardy
}

export interface ResolvedFsmPreset {   // výstup validate+normalize; runtime cache, neserializuje se
  id: FsmPresetId;
  source: "builtin" | "user" | "draft";
  statesById: Readonly<Record<FsmStateId, ResolvedState>>;  // O(1) lookup
  initialStateId: FsmStateId;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;                        // "E_DANGLING_TRANSITION", "W_UNREACHABLE_STATE", ...
  message: string;                     // lidsky čitelné, česky/anglicky dle UI
  path: { stateId?: FsmStateId; transitionIndex?: number; field?: string };
}
```

### Explicitní rozhodnutí k modelu

| Otázka | Decision | Reason |
|---|---|---|
| Stabilní ID vs. label | **Ano, oddělené.** `id` generované (`st_` + krátký random z injektovaného RNG editoru — editor není simulace, `crypto.randomUUID` OK), `label` volný text. | Rename = změna labelu, transitions se nedotknou. Řeší audit G („přejmenování rozbije goto"). |
| Rename state | Mění pouze `label`. `id` je immutable po vytvoření. | Triviálně bezpečné; žádné přepisování referencí. |
| Absence combat | `combat` nepřítomen ⇒ `{ mode: "disabled" }`. | Bezpečný default; „stav nestřílí, pokud neřekneš jinak". |
| Vypnutý combat | Explicitně `{ mode: "disabled" }` — přebíjí def-level profil. Legacy fallback jen přes `{ mode: "inherit" }`. | Řeší F-04 bez tiché magie. |
| Terminální stav | Není vlastnost stavu, ale lifecycle akce `{ type: "despawn" }` v `onEnter`. Stav s ní je efektivně terminální; validátor ignoruje jeho transitions (warning, pokud nějaké má). | Jeden mechanismus místo dvou; používá `markKill` → Cleanup (AGENTS §7.5). |
| Defaulty | Zdroj pravdy = `ParamSpec.default` v descriptoru (sekce I). Serializuje se **plná podoba params** (všechny klíče explicitně) — editor při vytvoření vyplní defaulty z descriptoru. | Explicitní soubor = žádná závislost chování na budoucí změně defaultů; odpadá overrides-merge logika. Trade-off: větší JSON (zanedbatelné) a nutnost migrace při přidání parametru (řeší normalize: chybějící klíč doplní default + warning). |
| Expandovaná vs. overrides | Plně expandovaná (viz výše). | Jednodušší validace, diff-ovatelný export, deterministické chování starých souborů. |
| Definice vs. runtime | Serializovatelné: `FsmPreset` strom (pouze JSON primitiva). Runtime-only: `FsmEntityRuntime`, `ResolvedFsmPreset`, module state sloty. | Jasná hranice; nic z runtime se nikdy neukládá. |
| Neznámý type z novější verze | Import: strukturální validace → `E_UNKNOWN_TYPE` = **odmítnutí importu**. localStorage load: preset se zachová v raw podobě, označí `invalid`, nelze načíst do preview, v UI má error badge — data se nemažou. | Neztrácet uživatelova data; nespouštět nedefinované chování. |
| Sdílení mutable state | `ResolvedFsmPreset` je deep-frozen (`Object.freeze` rekurzivně při resolve). Per-entity stav vzniká výhradně `module.createState()` při spawnu/enter — nikdy se nepředává referencí z definice. | Řeší AGENTS §7.10; dnešní `e.behavior = preset.params` sdílí referenci parametrů (funguje jen dohodou). |

---

## F. Runtime execution flow

Fázový řád beze změny (Input→Director→**Simulation**→Collision→Impact→Flow→Audio→Cleanup). Pořadí uvnitř Simulation beze změny (`createGame.ts:504-556`). Vše níže probíhá v `EnemySystem.update` per enemy:

```
 1. sanitize pos/vel, posPrev snapshot, hit-flash            (beze změny, EnemySystem)
 2. má ent.fsm? → ne: legacy větev (behaviorPresetId), konec FSM části
 3. FsmRuntime.tick(rt, ent, ctx):
    a) evaluate transitions AKTUÁLNÍHO stavu (first-match, max 1)
       — nad stavem světa z konce minulého ticku (pozice před pohybem, HP z minulé Impact)
    b) pokud přechod:
       – interní exit (uvolnění/reset module slotů dle resetMovementOnReenter)
       – stateId = to; age = 0
       – enter: createState+init pro movement base, modifiery, targeting;
                combat dle resetOnEnter (default: cooldown PŘEŽÍVÁ — dnešní chování)
       – onEnter akce v pořadí pole:
           despawn    → store.markKill(ref); return "killed"  (commit až Cleanup fáze)
           spawnEnemy → bus.emitNext(SPAWN_ENEMY, …)          (viditelné příští tick — AGENTS §7.3)
       — nový stav působí TENTÝŽ tick (kroky 4–8 už běží pod novým stavem)
    c) bez přechodu: age += dt
 4. MovementResolver.resolve(state.movement, rt, ent, ctx) → target | null
    a) base.update(dt) + base.getTarget() → target (null = hold sémantika)
    b) for modifier in modifiers (v pořadí pole): target = mod.apply(target, dt, params, modState, ctx)
 5. EnemySystem: target != null → vel = (target − pos)/dt; null → vel beze změny   (beze změny)
 6. group cohesion: člen skupiny → applyMemberCohesion PŘEPÍŠE vel                 (beze změny, sekce G)
 7. failsafe (y < −1 & vel.y==0 → vel.y=40) + sanitizace NaN                       (beze změny)
 8. INTEGRACE pos += vel·dt — jediné místo, EnemySystem                            (beze změny)
 9. CombatResolver.resolve(state.targeting, state.combat, rt, ent, ctx):
    a) combat mode: disabled → skip; inherit → def.attackProfile; profile → lookup
    b) targeting → aim direction (forward/atPlayer/…)
    c) fire pattern executor (evoluce updateAttack) s INJEKTOVANÝM aim směrem
10. cull: anchorX = base.getCullAnchorX?.(state) ?? pos.x → mimo band → markKill   (formalizace F-16)
```

### Explicitní rozhodnutí flow

- **Transitions před behavior update** — zachováno (dnešní sémantika). Reason: deterministické („podmínky čtou uzavřený minulý tick"), migrace bez behavior změny. Rejected: vyhodnocení po pohybu — změnilo by timing všech 10 built-in grafů.
- **Movement před targeting/combat** — combat míří z pozice PO integraci (dnešní chování `updateAttack` po integraci zachováno; projektil startuje z aktuální vykreslené pozice).
- **Spawn viditelnost:** lifecycle `spawnEnemy` přes `emitNext` = příští tick (povinné dle AGENTS §7.3). Projektily: MVP zachová přímý spawn v pattern executoru (dokumentovaná legacy výjimka, F-06); vyčištění na `SPAWN_ENEMY_PROJECTILE` + `emitNext` je samostatná session S11 (1-tick zpoždění při 60 Hz je nepostřehnutelné, ale je to behavior change → vlastní session s vlastní validací).
- **Runtime errors:** try/catch kolem resolverů zůstává v EnemySystem (crash → markKill, jako dnes). Neznámý type za běhu (nemělo by nastat — validace při loadu): log-once přes `rt.diagnostics`, modul se chová jako `hold`/`disabled`.
- **Determinismus:** žádný `Math.random()`; RNG-ready: resolvery dostávají `ctx.rng01?: () => number` (injektovaný, dnes nevyužit).
- **Hot-path alokace:** `FsmEntityRuntime` a module sloty se alokují při spawnu a při enter, ne per tick (opravuje F-18: dnešní `ensureFsm` tvoří objekt každý tick). `ResolvedFsmPreset.statesById` = O(1) lookup bez alokace. Modifier fold mutuje sdílený scratch `{x,y}` v `rt`, nevrací nové objekty.
- **Diagnostika:** log-once flagy v `rt.diagnostics`; agregovaný čítač problémů čitelný z Enemy Lab; žádný per-tick console výstup (odstranit i dnešní mrtvé logy F-05).

### Co zůstane v EnemySystem vs. co se vytáhne

| Zůstává v EnemySystem | Vytahuje se | Odpovědnost nového modulu |
|---|---|---|
| iterace store, sanitizace, posPrev | `FsmRuntime.ts` | transitions, state switch, lifecycle, age |
| derivace vel z targetu, integrace pos | `MovementResolver.ts` | base+modifiery → target |
| group cohesion volání, failsafe | `CombatResolver.ts` | targeting+combat mode → fire executor |
| cull rozhodnutí + markKill | `moduleState.ts` | alokace/reset per-entity slotů |

Každý modul má jednu konkrétní odpovědnost; EnemySystem zůstává jediným vlastníkem integrace a lifecycle entity — žádná abstrakce navíc.

---

## G. Kompozice behaviorů

### Pravidla

1. **Base movement** = právě 1 na stav, povinný. Je to dnešní Behavior V1 primitiv: vlastní analytický výpočet targetu z vlastního runtime stavu (kotvy, čas, fáze). Jediný smí definovat cull anchor.
2. **Movement modifier** = 0–3 na stav, uspořádaný seznam (pořadí určuje **uživatel**, aplikace je sekvenční fold). Modifier je **čistá transformace**: přijímá `(target: Vec2, dt, params, modState, ctx)` a vrací nový target (přes scratch objekt). Nemá přístup k `vel`/`pos` zápisu, smí číst `ent.pos` (např. `speedLimit`).
3. **Vlastnictví:** výsledný target vlastní `MovementResolver`; velocity intent odvozuje a vlastní **EnemySystem**; pozici integruje **výhradně EnemySystem** (Behavior V1 kontrakt zachován — base ani modifier nikdy nezapisují `pos`/`vel`).
4. **Group cohesion** se aplikuje PO derivaci vel z FSM movementu a **přepíše ji** (dnešní `applyMemberCohesion`). Pořadí a ownership: `FSM movement → (member?) group cohesion override → failsafe → integrace`. FSM zůstává vlastností jednotlivce; pro člena skupiny je FSM movement příspěvek, který cohesion vrstva legálně přebije — dokumentovaný kontrakt, validátor dává warning „FSM preset na skupinově spawnovaném typu: movement bude řízen skupinou".
5. **Failsafe** zůstává poslední před integrací (EnemySystem, beze změny).
6. **Dva moduly zapisující stejný výstup:** nemožné z konstrukce — base vrací target, modifiery ho transformují postupně, nikdo nezapisuje sdílený stav.
7. **Nekompatibilní kombinace:** deklarativně v descriptoru (`requires: ["player"]`, `conflictsWith: [...]`). MVP má jediný reálný konflikt: `clampY` + `align/track` s malým `toleranceY` (oscilace) → **warning**, ne error. Editor při přidávání modifiku filtruje/označí nekompatibilní položky podle descriptorů; validátor vydá `W_MODIFIER_CONFLICT` s `path` na konkrétní modifier.

### Příklad 1 — straight + sine offset + periodic single shot

```json
{ "id": "st_atk", "label": "Attack",
  "movement": { "base": { "type": "straight", "params": { "speedX": -120, "speedY": 0 } },
                "modifiers": [ { "type": "sineOffset", "params": { "ampX": 0, "ampY": 24, "freqHz": 0.8 } } ] },
  "targeting": { "type": "forward" },
  "combat": { "mode": "profile", "profileId": "single_basic" },
  "transitions": [ { "when": { "type": "timeInState", "params": { "seconds": 6 } }, "to": "st_out" } ] }
```
Runtime: straight target → +sin offset → vel → integrace → forward aim → single pattern. Konflikty: žádné. Enter/re-entry: reset kotvy straight i fáze sinu (fáze modifikátoru z `rt.age`, deterministická); combat cooldown přežívá (default).

### Příklad 2 — approach + maintain distance + aim at player + burst

```json
{ "movement": { "base": { "type": "range", "params": { "preferredDistance": 160, "tolerance": 16,
                  "response": 3.0, "maxSpeed": 130, "fallbackSpeedX": -90, "fallbackSpeedY": 0 } } },
  "targeting": { "type": "atPlayer" },
  "combat": { "mode": "profile", "profileId": "burst_3" } }
```
„Approach player" a „maintain distance" **není base+modifier, ale jeden base `range`** (existující primitiv už obojí dělá radiálním řízením) — ukázka, že hranice base/modifier se řídí existujícím kódem, ne marketingovými názvy. Burst = nový fire pattern (sekce J). Konflikty: žádné. Re-entry: range nemá kotvy → reset levný; burst čítač (`shotsFired`) se resetuje s combat state jen při `resetOnEnter: true`.

### Příklad 3 — orbit + evade-X + combat disabled + HP transition

```json
{ "id": "st_orbit", "label": "Orbit",
  "movement": { "base": { "type": "orbitTarget", "params": { "radiusX": 190, "radiusY": 124, "angularSpeed": 1.6,
                  "arcRadians": 6.283, "direction": 1, "repeat": true, "pingPong": false,
                  "radialResponse": 2.6, "maxRadialSpeed": 85, "fallbackSpeedX": -75, "fallbackSpeedY": 0 } },
                "modifiers": [ { "type": "sineOffset", "params": { "ampX": 30, "ampY": 0, "freqHz": 1.2 } } ] },
  "combat": { "mode": "disabled" },
  "transitions": [ { "when": { "type": "hpBelow", "params": { "ratio": 0.30 } }, "to": "st_enraged" } ] }
```
(„Evade player X-axis" jako samostatný modifier je odloženo — MVP aproximace X-offset sinem; plný `evadeAxis` modifier ve fázi 2, viz J.) `disabled` garantuje ticho i kdyby typ měl def-level profil (F-04). Přechod: `hpBelow` čte HP z minulé Impact fáze (1-tick latence, dokumentováno). Vstup do `st_enraged`: plný movement reset, orbit se re-inicializuje z aktuální pozice (dnešní chování zachováno).

---

## H. Lifecycle a transitions

### Lifecycle

| Prvek | Sémantika | MVP? |
|---|---|---|
| onEnter (interní) | reset movement/modifier/targeting slotů (`createState`+`init`); vždy při vstupu, řízeno `resetMovementOnReenter` (default true) | ano |
| onEnter (akce) | uživatelské `LifecycleAction[]`, jednorázové, v pořadí pole, v témže ticku po přepnutí | ano |
| state update | žádný samostatný hook — průběžné chování = movement/combat resolvery (žádný user skript) | ano |
| onExit | pouze interní (uvolnění slotů); **uživatelské onExit akce nejsou** — vše vyjádřitelné jako onEnter cílového stavu; méně pojmů v UI | ano (interní) |
| re-entry do téhož stavu | přechod `to == current` je legální; provede plný enter (reset + akce). `resetMovementOnReenter:false` zachová movement stav (např. plynulé pokračování sinu) | ano |
| přechod mezi stavy se stejným movementem | **vždy nový enter** — rozhoduje identita stavu (`stateId`), ne rovnost preset stringů. Nahrazuje `fsmAppliedMovementPresetId` (F-14). Kontinuitu zajistí `resetMovementOnReenter:false` | ano |
| combat runtime | přežívá přechody (dnešní chování), reset volitelně `combat.resetOnEnter` | ano |
| `despawn` akce | `store.markKill(ref)`; entita dožije tick jako pendingKill, commit v Cleanup — standardní kill lifecycle, smí ovlivnit simulaci (to je účel) | **ano — jediná MVP akce** |
| `spawnEnemy` akce | `bus.emitNext(SPAWN_ENEMY, {typeId, spawn: pos+offset, spawnOrdinal: i})` — plně přes spawn pipeline, viditelné příští tick; validátor kontroluje `typeId` proti `ENEMY_DEFS` | fáze 2 |
| VFX/audio hooky | future extension (sekce S); vyžadují event kontrakt s Impact/Audio fází | ne |

**Decision:** malá typovaná sada akcí, ne obecný action scripting. **Reason:** jediné auditem podložené potřeby jsou explicitní despawn (F-03) a summon; vše ostatní je spekulace. **Rejected:** generický `{ type: string; run: Function }` — neserializovatelné, nevalidovatelné. **Trade-off:** každá nová akce = malá změna union + descriptor + executor (přijatelné, exhaustiveness check hlídá kompilátor).

### Transitions

Zachováno (Decision + Reason):
- **first-match priorita a pořadí pole** — jednoduché, deterministické, UI = drag-and-drop pořadí; žádný váhový systém.
- **max. 1 přechod/tick** — strukturální ochrana proti nekonečným smyčkám v jednom ticku; vícekrokové řetězy trvají N ticků (přijatelné při 60 Hz).
- **vyhodnocení před state update** — viz sekce F.

Nové/upravené:
- `xLessThan` → **`screenXBelow`** s dokumentovanou screen-space sémantikou (dnešní chování, jen pojmenované; F-13).
- `offscreen.marginPx` konfigurovatelný, default 96 (dnešní konstanta).
- Typované parametry s ParamSpec (rozsahy: `ratio` 0–1, `seconds` ≥ 0, …).
- **Neexistující target:** load-time hard error `E_DANGLING_TRANSITION` (preset se nenačte do registru) — F-01/F-02. Runtime defenziva (nemělo by nastat): log-once + stav se chová jako terminální hold.
- **Okamžité smyčky:** `timeInState: 0` cyklus A→B→A je díky max-1/tick jen pomalý ping-pong, ne freeze; validátor přesto vydá `W_IMMEDIATE_LOOP` (cyklus stavů dosažitelný výhradně přes podmínky splnitelné v čase 0).
- **Terminální stav:** transitions stavu s `despawn` v onEnter se nevyhodnotí (entita je pendingKill); má-li nějaké, `W_TRANSITIONS_AFTER_DESPAWN`.
- **Probability condition (future):** union je otevřená pro `{ type: "chance", params: { probability, evaluateEveryTicks } }` s `ctx.rng01` — až bude injektovaný seedovaný RNG (příprava: signatura evaluatoru RNG přijímá už v MVP).

**Složené podmínky AND/OR/NOT: odloženo.** Reason: žádný z 10 built-in grafů ani MVP katalog je nepotřebuje; AND je vyjádřitelné řetězem stavů, OR dvěma transitions na stejný cíl (first-match to podporuje přirozeně). NOT by vyžadoval UI pro vnořené výrazy — přesně ta složitost, kterou zadání zakazuje. Datový model je nerozšíří zpětně nekompatibilně (nový `type: "allOf"` s `children` je aditivní změna unionu).

---

## I. Behavior registry a metadata

**Decision: jedna deklarace na typ (descriptor + runtime module v jednom entry), agregovaná do registrů se `satisfies` exhaustiveness kontrolou.** Reason: nulová duplicita seznamů (F-09), typ přidáš na jednom místě, kompilátor ohlídá úplnost. UI importuje jen `descriptor` pole (čistá data, žádné DOM závislosti); simulace jen `module`. Rejected: dva oddělené registry se sdíleným ID — dvojí údržba, přesně dnešní problém `KNOWN_PRIMITIVE_ORDER`; codegen z jedné deklarace — zbytečný build krok.

```ts
// src/game/enemies/catalog/paramSpec.ts
export type ParamUnit = "px" | "px/s" | "s" | "Hz" | "deg" | "rad" | "ratio" | "count" | "none";
export interface ParamSpec {
  key: string; label: string; unit: ParamUnit;
  min: number; max: number; step: number; default: number;
  description?: string;
}

// src/game/enemies/catalog/movementBases.ts
export interface MovementBaseModule<P, S> {
  createState(): S;                                    // per-entity slot — řeší sdílení mutable stavu
  init(p: P, ent: EnemyLike, s: S): void;              // kotvy z ent.pos, fáze ze spawnOrdinal
  update(dt: number, p: P, s: S, ctx: BehaviorCtx): void;
  getTarget(p: P, s: S, ent: EnemyLike, ctx: BehaviorCtx): Vec2 | null;
  getCullAnchorX?(p: P, s: S): number | null;          // formalizace EnemyCullReference (F-16)
}
export interface MovementBaseEntry<T extends MovementBaseType = MovementBaseType> {
  descriptor: {
    type: T; label: string; description: string;
    params: ParamSpec[];
    needsPlayer: boolean;                              // editor: warning bez playera nedává smysl
    tags?: string[];                                   // volné UI skupiny ("smart"), NE zdroj významu
  };
  module: MovementBaseModule<ParamsOf<T>, object>;
}
export const MOVEMENT_BASES = {
  hold: holdEntry, straight: straightEntry, /* … všech 11 */ orbitTarget: orbitEntry,
} satisfies Record<MovementBaseType, MovementBaseEntry>;
// analogicky MOVEMENT_MODIFIERS, TARGETING_MODES, CONDITION_TYPES, LIFECYCLE_ACTIONS
```

- Runtime lookup: `MOVEMENT_BASES[cfg.base.type].module` — objektový přístup, žádný switch, žádný prefix parsing.
- Validátor čte `descriptor.params` (typy, rozsahy) — jedna pravda pro editor i import.
- Editor generuje formuláře z `ParamSpec` (label, unit, min/max/step) — mizí ruční `KNOWN_PRIMITIVE_ORDER` i `formatPrimitiveLabel` z `DevSummoner.ts`.
- Přidání nového base = 1 soubor (entry) + 1 řádek v agregátu + 1 varianta unionu v `FsmTypes.ts`; `satisfies` + discriminated union vynutí konzistenci.

---

## J. MVP behavior katalog

### Zachované a pouze adaptované (base movementy, z `src/game/enemies/behaviors/`)
`hold`(=none), `straight`, `straightLerp`(=dnešní accel/decel varianta), `sine`, `zigzag`, `loop`, `invaders`, `track`, `align`, `evade`, `range`, `orbitTarget` — beze změny matematiky; adaptace signatur na `(params, state)` místo `e.behavior`/`e.bState`. Pokrývají ze seznamu zadání: hold, straight, sine, approach player + maintain distance (`range`), orbit (`orbitTarget`), evade player axis (`evade`), strafe (≈ `align`/`track` s offsetem).

### Nové pro MVP

| Prvek | Kategorie | Účel | Parametry (jednotka, default) | Runtime výstup | Runtime state | Kompatibilita/konflikty |
|---|---|---|---|---|---|---|
| `sineOffset` | mov. modifier | vlnění nad libovolným base | ampX (px, 0), ampY (px, 24), freqHz (Hz, 0.8) | target += sin | žádný (fáze z `rt.age`) | všechny bases; W při 2× sineOffset se stejnou freq |
| `clampY` | mov. modifier | udržení ve viewportu | paddingPx (px, 24) | clamp target.y | žádný | W s `align/track` (oscilace u kraje) |
| `speedLimit` | mov. modifier | strop rychlosti targetu | maxSpeed (px/s, 300) | limit kroku od pos | žádný | všechny bases |
| `forward` | targeting | dnešní „single" směr | — | dir (−1,0) | žádný | — |
| `atPlayer` | targeting | dnešní „aimed" | — | dir na hráče | žádný | bez hráče → fallback forward |
| `fixedAngle` | targeting | šikmá/vertikální palba | deg (deg, 180) | dir z úhlu | žádný | — |
| `atPlayerOffset` | targeting | vedení/offset cíle | dx, dy (px, 0) | dir na hráče+offset | žádný | bez hráče → forward |
| `burst` | fire pattern | dávka N ran | shots (count, 3), intraDelayMs (ms, 90) + zděděné z profilu | N projektilů se sub-cooldownem | shotsFired, subTimer v combatState | libovolný targeting |
| `radial` | fire pattern | kruhová salva | count (count, 8), startDeg (deg, 0) | count projektilů 360° | — | targeting se ignoruje (W v editoru) |
| `fireOnEnter` | fire pattern flag | výstřel při vstupu do stavu | `combat.resetOnEnter` + windupMs=0 varianta profilu | 1 salva na enter | — | — |
| `distanceToPlayer` | condition | přechody dle vzdálenosti | op (below/above), px (px, 200) | bool | žádný | bez hráče → false |
| `despawn` | lifecycle | explicitní terminál (F-03) | — | markKill | — | transitions po ní = W |

Fire patterny se realizují rozšířením `AttackProfileDef.pattern` (`"single" | "spread" | "burst" | "radial"`) + oddělením aimu: `aimed` přestává být pattern a stává se targetingem (migrace: `pattern:"aimed"` → `pattern:"single"` + `targeting:"atPlayer"`, adapter v migrate.ts).

### Odloženo (fáze 2+)
`spawnEnemy` lifecycle akce; `evadeAxis` movement modifier (evade jako překryv nad jiným base); `waypointSequence` base (vyžaduje editor bodů); `stopAndGo` base; `delayedTracking`/`predictiveAim` targeting (potřebují historii pozic hráče — nový buffer); conditions `shotsFired`, `spawnedChildrenStatus` (závisí na spawnEnemy), `chance` (čeká na seedovaný RNG).

---

## K. Validace

Umístění: `src/game/enemies/fsm/validate.ts`. API:

```ts
export function validateFsmPreset(raw: unknown): 
  { ok: true; preset: FsmPreset; issues: ValidationIssue[] }      // issues = jen warnings
| { ok: false; issues: ValidationIssue[] };

export function resolveFsmPreset(preset: FsmPreset, deps: { attackProfiles, enemyDefs }):
  ResolvedFsmPreset;   // normalize (doplnění defaultů z descriptorů) + deep-freeze
```

Průchody (každý běží nad výstupem předchozího):

1. **Strukturální:** JSON shape, `schemaVersion` (starší → migrate; novější → `E_SCHEMA_TOO_NEW`), povinná pole, známé discriminanty (`type`/`mode` proti registrům), typy parametrů (number/string/bool). TypeScript typy toto NEřeší — vstup je `unknown`.
2. **Referenční:** `initialStateId` existuje; každý `transition.to` existuje (`E_DANGLING_TRANSITION`); unikátní `FsmStateId` (`E_DUPLICATE_STATE_ID`); `combat.profileId` v attack profiles (`E_UNKNOWN_ATTACK_PROFILE`); `spawnEnemy.typeId` v `ENEMY_DEFS`.
3. **Sémantická:** rozsahy dle `ParamSpec` (mimo min/max → **W** + clamp při resolve; NaN/špatný typ → **E**); chybějící `movement.base` (**E**); >3 modifiery (**W**); unreachable state (**W**); stav bez odchozí transition a bez `despawn` (**W** „stav je konečná pozice — enemy zůstane do cullu", legální pattern); immediate loop (**W**); transitions po `despawn` (**W**); `needsPlayer` behavior — informativní (fallbacky existují, žádné issue nad rámec popisu).
4. **Editorová:** debounced (≈300 ms po změně) plná validace draftu; issues mapované přes `path` na konkrétní state/transition/parametr; error = blokuje Save/Preview/Export, warning = neblokuje.

| Situace | Chování |
|---|---|
| hard error | preset se nedostane do registru; editor blokuje Save/Preview |
| warning | preset funguje; badge v UI, výpis v panelu |
| mimo rozsah | clamp na min/max při resolve + W (hodnota v souboru se nemění) |
| import s errors | **odmítnut** (dialog s výpisem issues); nic se nezapíše |
| invalid draft preview | **blokováno** — preview vyžaduje `ok: true` (draft s warnings previewovat lze) |
| built-in content s errors | `console.error` + preset vyloučen z registru + badge v Enemy Lab; hra běží dál (fail-soft, ne crash — na rozdíl od dnešního assert-throw v `loadContent`, který by shodil boot; assert zůstává pro presety/typy, grafy dostanou fail-soft cestu) |
| localStorage corrupt | sekce L |

---

## L. Persistence a schema

### Vrstvy

| Vrstva | Zdroj | Vlastnosti |
|---|---|---|
| Built-in registry | `behaviorGraphs.json` → `migrate.ts` → validate → resolve | read-only, load/preview/duplicate |
| User registry | `UserPresetStore` (localStorage) | plná CRUD, export/import |
| Draft | editor pamět; klíč `__draft` v registru | jediný, patří editoru, neserializuje se sám o sobě |
| Saved | user preset po `Save` | draft → user registry (nový/aktualizace) |
| Imported | JSON soubor → validate → user registry | kolize řešeny níže |
| Exported | user (i built-in — jako kopie) → JSON soubor | vždy plně expandovaný |

### localStorage

```
klíč: "cm.fsm.user.v1"
{ "schemaVersion": 1,
  "updatedAt": 1730000000000,
  "presets": { "user.k3j9x2": { …FsmPreset… }, … } }

záloha před migrací: "cm.fsm.user.v1.backup.<schemaVersion>" (jedna na verzi, přepisovaná)
```

Jeden atomický blob (Decision; Reason: atomický zápis, jednoduchá migrace celku; Rejected: klíč per preset — částečně poškozený stav při quota chybě; Trade-off: přepis celého blobu při každém Save — velikosti v jednotkách KB, bezvýznamné).

| Operace | Chování |
|---|---|
| preset ID | `user.` + 6znakový nanoid (editor vrstva, ne simulace — `crypto` povolen) |
| duplicate | nové ID, `name + " (copy)"`, `createdAt/updatedAt` nyní |
| rename | mění `meta.name`; ID immutable |
| overwrite | jen vlastní user preset přes Save; import nikdy tiše nepřepisuje |
| import kolize ID | default: nové ID (auto-suffix) + zachovat oba; volba „přepsat" jen explicitně |
| import kolize name | povoleno (name není klíč), informativní hláška |
| delete | potvrzení; odstranění z blobu |
| reset store | dev akce „smazat všechny user presety" s potvrzením |
| corrupt JSON | blob se přejmenuje na `…corrupt.<ts>` (data se nemažou), store startuje prázdný, error badge v UI |
| quota/write fail | try/catch kolem `setItem`; UI hláška „uložení selhalo", draft zůstává v paměti, nabídnout Export jako záchranu |
| migrace v1→v2 (budoucí) | backup → `migrate.ts` per preset → nevalidní po migraci = ponechán raw + invalid badge |

### Export/import formát

```json
{ "format": "cm-fsm-presets", "schemaVersion": 1, "exportedAt": 1730000000000,
  "presets": [ { …FsmPreset… } ] }
```
**Obě varianty jedním formátem:** `presets` je vždy pole (1 prvek = single export, N = knihovna). Import stejnou cestou. V presetu se ukládá pouze definice + meta; runtime cache (`ResolvedFsmPreset`), editor transient state (výběr, scroll, dirty) a `source` se neserializují.

---

## M. Enemy Lab UI

### Informační architektura — master-detail, accordion v detailu

```
┌ Enemy Lab ────────────────────────────────────────────────┐
│ [Spawn panel — dnešní DevSummoner, zúžený]                │
│────────────────────────────────────────────────────────── │
│ FSM Editor                                    [otevřít ▸] │
│ ┌ Preset toolbar ─────────────────────────────────────┐   │
│ │ [preset ▾ (Built-in/User sekce)] [New] [Duplicate]  │   │
│ │ [Save] [Save as] [Import] [Export] [Delete]  ●dirty │   │
│ └─────────────────────────────────────────────────────┘   │
│ ┌ States ──────┐ ┌ State detail ──────────────────────┐   │
│ │ ▶ st Enter   │ │ Label [........]  [initial ○]      │   │
│ │   st Attack ⚠│ │ ▸ Movement  (base ▾ + params;      │   │
│ │   st Retreat │ │             modifiers list +/−/↑↓) │   │
│ │ [+ Add state]│ │ ▸ Targeting (mode ▾ + params)      │   │
│ │              │ │ ▸ Combat    (⊘ disabled|inherit|   │   │
│ │              │ │              profile ▾, reset □)   │   │
│ │              │ │ ▸ Lifecycle (onEnter akce)         │   │
│ │              │ │ ▸ Transitions (list: when ▾ params │   │
│ │              │ │    → to ▾ ; +/−/↑↓ pořadí)         │   │
│ └──────────────┘ └────────────────────────────────────┘   │
│ ┌ Validation ─ 0 errors, 2 warnings (klik → fokus) ────┐  │
│ ┌ Preview ─ [Spawn preview] [Respawn] [Kill] Y:[slider]┐  │
└────────────────────────────────────────────────────────┘
```

**Decision:** master-detail (state list + detail) s accordion sekcemi uvnitř detailu; editor je rozšiřující se panel vedle dnešního spawn panelu (dnešních 220 px nestačí — editor režim rozšíří panel na ~480 px, na malé obrazovce se state list překlopí do dropdownu nad detailem). **Rejected:** tabs pro kategorie (skrývají kontext stavu), jeden dlouhý panel (nepřehledný od 4+ stavů).

### Pokrytí požadovaných operací
Výběr built-in/user (jeden select se sekcemi + badge), New/Duplicate (built-in → duplicate vytvoří user kopii, built-in polí jsou disabled s hláškou „Built-in preset je read-only — duplikuj pro úpravy"), name/description v toolbar detailu, add/remove/duplicate state, rename = edit `label` (ID nedotčeno → transitions drží), initial state radio v detailu, movement base select + generované param formuláře z `ParamSpec` (label, unit, min/max/step), modifier list s +/−/↑↓, targeting/combat/lifecycle sekce, transitions list s reorder, validation panel s klikem na zdroj chyby, preview controls, Import/Export přes file input/download, Delete s potvrzením.

### Editor state model

```ts
interface EditorState {
  openPresetId: FsmPresetId | null;
  source: "builtin" | "user";
  draft: FsmPreset | null;        // deep clone otevřeného presetu
  selectedStateId: FsmStateId | null;
  dirty: boolean;
  issues: ValidationIssue[];
  preview: { active: boolean; entityRef: EntityRef | null };
}
// Všechny mutace přes: applyEdit(state, edit: EditorEdit): EditorState  (čistá funkce)
```

- **Dirty:** libovolný `applyEdit` → `dirty=true`; Save → validate → store → `dirty=false`. Přepnutí presetu s dirty draftem → potvrzení (zahodit/uložit).
- **Explicit save** (ne autosave) — Decision; Reason: draft je experimentální pracovní kopie a autosave by tiše přepisoval user presety; Rejected: autosave s historií (=undo systém, mimo MVP). Ochrana proti ztrátě: dirty draft se zrcadlí do `sessionStorage` (`cm.fsm.draft.session`) — přežije reload, nešpiní user store.
- **Undo/redo ready:** `applyEdit` je čistá funkce `state→state`, historie = pole editů/snapshotů doplnitelné později bez přestavby.
- **Živé změny při běžícím preview:** neprojeví se na běžící entitě (sekce N) — UI ukazuje „Preview je zastaralé — Respawn" badge, jakmile `dirty` od posledního spawnnutí preview.
- **Spawn panel pro FSM typy (F-18/F-20):** movement selektory se skryjí a nahradí textem „Movement řídí FSM preset: `<id>`" — UI nenabízí ignorovanou volbu.

---

## N. Preview mechanismus

**Decision: explicitní respawn, žádný hot-reload běžících entit.**

1. `Spawn preview` → validace draftu (`ok` nutné) → `registry.registerDraft(resolveFsmPreset(draft))` pod rezervovaným klíčem `"__draft"` → `bus.emitNext(SPAWN_ENEMY, { typeId: <zvolený/preview typ>, spawn, fsmPresetKey: "__draft", devManualSpawnId })`. Payload `SPAWN_ENEMY` se rozšíří o volitelné `fsmPresetKey?: string` (`events.ts:61-68` — aditivní, netýká se directoru).
2. `SpawnSystem.spawnEnemy` při `fsmPresetKey` (nebo `def.fsmPresetId`) zavolá `registry.getResolved(key)` a uloží **snapshot reference** do `ent.fsmRuntime.preset`. Běžící entita už registr nikdy nečte → pozdější změna draftu ji nemůže ovlivnit; determinismus zachován (entita = čistá funkce svého zamčeného presetu a světa).
3. Built-in data nelze mutovat: resolved presety jsou deep-frozen; draft je vždy clone.
4. Preview identita: `devManualSpawnId` (existující mechanismus) + `source:"draft"` v resolved presetu → Enemy Lab debug view zvýrazní „PREVIEW".
5. `Respawn` = kill staré preview entity (`markKill`) + nový registerDraft + nový spawn. `Kill` = jen markKill.
6. Invalid draft: `registerDraft` odmítne (vrátí issues), preview tlačítko disabled — nevalidní data se do runtime registru nikdy nedostanou.
7. Zavření editoru: `registry.unregisterDraft()` + markKill preview entity. Entita, která by přesto dožívala, drží vlastní snapshot — žádný dangling pointer do registru.

---

## O. Migrace

Princip: **jeden runtime (nový), legacy vstup přes adapter, behavior-preserving převod.**

| Krok | Obsah |
|---|---|
| 1. Adapter | `migrate.ts: migrateLegacyGraph(id, legacyGraph, presetDb, attackProfiles): FsmPreset` — čistá funkce volaná v `loadContent`. `behaviorGraphs.json` zůstává beze změny validním vstupem (auto-migrace v paměti). |
| 2. movementPresetId | lookup v `EnemyBehaviorPresets` → expanze na `movement.base = { type: preset.behaviorId, params: {…defaults z descriptoru, …preset.params} }`. Preset JSON zůstává zdrojem výchozích parametrizací pro ne-FSM enemy i pro editor („vlož preset hodnoty"). |
| 3. attackProfileId | přítomen → `combat: { mode: "profile", profileId }`; nepřítomen → `combat: { mode: "inherit" }` — **zachovává dnešní fallback na def-level profil** (žádná změna chování; nové presety dostávají default `disabled`). `pattern:"aimed"` profily → `targeting:{type:"atPlayer"}` + pattern single (adapter na úrovni CombatResolveru, profily JSON beze změny). |
| 4. State names → ID | legacy jméno se stane `label` i `id` (legacy jména jsou v rámci grafu unikátní — validováno migrací). Nové stavy v editoru dostávají generovaná `st_*` ID; kolize nemožná (validátor unikátnost hlídá). |
| 5. transitions | 1:1, pořadí zachováno (first-match beze změny); `xLessThan`→`screenXBelow`, `offscreen` dostane explicitní `marginPx: 96`. |
| 6. Prázdné stavy (`despawn: {}`) | **behavior-preserving:** movement zkopírován z (jediného) předchůdce, žádná despawn akce — enemy dál odjíždí do cull bandu přesně jako dnes (audit F-03: okamžitý despawn by u `fsm.charge` zabil enemy viditelně na obrazovce). Explicitní `despawn` používají až ručně aktualizované built-in grafy v samostatné content session (S10) s vlastní vizuální verifikací. |
| 7. fsmAppliedMovementPresetId | zaniká; enter/re-entry řídí `stateId` identita (sekce H). Stavy se stejným movementem po migraci: legacy de-dupe znamenal „nere-inicializovat" → migrace nastaví `resetMovementOnReenter: false` tam, kde po sobě jdoucí stavy sdílely preset ID (v 10 built-in grafech nenastává — ověřeno auditem; flag je pojistka). |
| 8. Validace bez rozbití buildu | grafy: fail-soft (vyloučení + console.error), ne assert-throw; presety/typy: dnešní assert zůstává. Chyby contentu viditelné v konzoli + Enemy Lab badge. |
| 9. Soubory | `behaviorGraphs.json` zůstává kanonickým built-in zdrojem (AGENTS §6). Po S10 se jeho obsah přepíše do nového schématu (`schemaVersion: 1`) a adapter zůstane jen pro legacy shape detekci (`initial` bez `schemaVersion` ⇒ legacy). Dlouhodobě jediný runtime, adapter je čistá vstupní funkce — ne paralelní implementace. |

Enemy typ binding: `enemyTypes.json.behaviorGraphId` zůstává; `EnemyDefs` ho mapuje na `fsmPresetId` (interní rename, JSON klíč se nemění — žádná content migrace).

---

## P. Dopady na existující moduly

| Modul | Změna | Zachováno | Riziko | Závislosti |
|---|---|---|---|---|
| `FsmTypes.ts` | rozšíření na model E; legacy typy zůstávají exportované pro adapter | `BehaviorGraph` shape jako legacy vstup | nízké | — |
| `FsmController.ts` | evoluce do `FsmRuntime.ts` (transitions beze změny sémantiky + lifecycle + per-spawn runtime alokace) | first-match, max-1, evaluace před update | střední | FsmTypes, registry |
| `loadContent.ts` | + volání `migrateLegacyGraph` + `validateFsmPreset` pro grafy (fail-soft) | assert pipeline pro presety/typy/waves | nízké | migrate, validate |
| `CONTENT.ts` | `BEHAVIOR_GRAPHS` raw cast (F-10) nahrazen `FsmPresetRegistry` inicializovaným v `createGame`; `CONTENT.behaviorGraphs` interně deprecated | statické importy JSON | nízké | loadContent |
| `EnemyBehaviorDB.ts` | interně nahrazeno `MOVEMENT_BASES` (katalog); DB zůstává jako tenký re-export pro legacy ne-FSM cestu do doby S12 | 11 primitiv beze změny matematiky | střední (adaptace signatur) | catalog |
| `EnemyBehaviorPresets.ts` | beze změny účelu — zdroj parametrizací pro ne-FSM enemy + „preset knihovna" v editoru | celé | nízké | — |
| `AttackController.ts` | rozdělení: pure pattern výpočet (směry salvy z injektovaného aimu) vs. emise projektilů; `aimed` pattern → targeting | profily, cooldown/windup model | střední | CombatResolver |
| `EnemySystem.ts` | odstranit FSM inline blok (ř. 126-173 vč. mrtvých logů F-05), `applyStateBehavior`, `fsmAppliedMovementPresetId`; volat FsmRuntime/MovementResolver/CombatResolver; **zachovat**: iteraci, sanitizaci, derivaci vel, cohesion, failsafe, integraci, cull, markKill | jediná autorita integrace | **vysoké** (centrální systém) — mitigace: session S3 mění jen FSM větev, legacy větev nedotčena | runtime moduly |
| `SpawnSystem.ts` | + alokace `FsmEntityRuntime` při spawnu FSM typu (snapshot resolved presetu); + `fsmPresetKey` v payloadu; behaviorPresetId pro FSM typ ignorován (dokumentováno v events.ts komentářem) | celý zbytek | nízké | registry |
| `EnemyGroups.ts` | beze změny kódu; **dokumentovaný kontrakt**: cohesion přepisuje vel po FSM movementu (sekce G bod 4) + validátor warning | vše | žádné | — |
| `EnemyCullReference.ts` | nahrazen `getCullAnchorX` v descriptorech (F-16); soubor smazán po přepojení group cull reference | sémantika anchorů (loop/sine/orbit) | nízké | catalog |
| `DevSummoner.ts` | zeštíhlení na spawn panel + mount point; editor v `src/dev/enemylab/` (PresetToolbar, StateList, StateDetail, ValidationPanel, PreviewControls, EditorStore — samostatné moduly ~150-300 ř.); FSM debug view zůstává | spawn workflow, group controls | střední (soubor 48 KB, mimo typecheck — přidat `src/dev` do tsconfig include v S6) | registry, store, validate |
| `events.ts` | + `fsmPresetKey?: string` do `SPAWN_ENEMY`; (S11) + `SPAWN_ENEMY_PROJECTILE` | ownership mapa | nízké | — |
| testy/smoke | + FSM unit smoky do `runSmokes.ts` (dnes tam FSM není); zaregistrovat i `MovementPresetNormalization.smoke` | existující smoky | nízké — pozor na pre-existing BombExplosionChain failure (AGENTS §8): nové smoky řadit PŘED něj, dokud není opraven | — |

---

## Q. Testovací strategie

Formát: tsx smoke soubory (konvence projektu), registrované v `runSmokes.ts` před známým failing testem.

### Unit (čisté funkce, bez store)

| Test | Acceptance criteria |
|---|---|
| `FsmTransitions.smoke` | first-match: 2 splněné podmínky → přechod dle pořadí pole; max 1 přechod/tick: řetěz A→B→C trvá 2 ticky; age reset na 0 při přechodu; re-entry `to==current` provede enter |
| `FsmLifecycle.smoke` | enter resetuje movement state (kotva = pozice při vstupu); `resetMovementOnReenter:false` zachová `st.t`; combat cooldown přežívá přechod; `resetOnEnter:true` ho nuluje; `despawn` → `pendingKill===true` a po `store.cleanup()` slot mrtvý |
| `MovementComposition.smoke` | straight+sineOffset: target(t) == analytická suma pro t=0..N; pořadí modifierů mění výsledek (sineOffset→clampY ≠ clampY→sineOffset u kraje); 0 modifierů == čistý base (bitově shodné targety) |
| `FsmValidate.smoke` | dangling transition → `E_DANGLING_TRANSITION` s path; duplicate state id → E; neznámý type → E; param mimo rozsah → W + clamp v resolve; unreachable state → W; valid preset → ok:true, 0 errors |
| `FsmMigrate.smoke` | všech 10 legacy grafů: migrace → validate ok:true, 0 errors; `fsm.turret` má 4 stavy, initial "enter", attack stav `combat.mode==="profile"`, profileId `spread_test_slow`; prázdný `despawn` má movement předchůdce a ŽÁDNOU despawn akci |
| `FsmSerialization.smoke` | preset → JSON.stringify → parse → validate → resolve → deep-equal chování (targety 100 ticků shodné); export bundle 2 presetů → import → oba přítomné s původními ID |

### Runtime smoke (store + EnemySystem)

| Test | Acceptance criteria |
|---|---|
| `FsmRuntimeParity.smoke` | pro `fsm.turret`, `fsm.hover`, `fsm.charge`: spawn na fixní pozici, 600 ticků, záznam (stateId, pos) každých 30 ticků — **shodné** před/po migraci (zlatý otisk zachycený ze staré implementace v S3) |
| `FsmDeterminism.smoke` | 2 nezávislé běhy téhož presetu a spawnu → bitově shodné trajektorie a časy přechodů |
| `FsmDespawn.smoke` | preset s `timeInState:1 → terminal(despawn)`: entita pendingKill v ticku 60±1, slot uvolněn po Cleanup, žádný markKill mimo cull/despawn cestu |
| `FsmInvalidGraph.smoke` | registr odmítne graf s dangling transition; hra pokračuje; enemy typ s vyloučeným presetem se nespawne + console.error jednou |
| `FsmGroupCohesion.smoke` | člen skupiny s FSM presetem: vel odpovídá cohesion výpočtu (ne FSM targetu) — potvrzení kontraktu |
| `FsmCombatModes.smoke` | typ s def-level profilem: stav `disabled` → 0 projektilů za 300 ticků; `inherit` → střílí def profil; `profile` → střílí uvedený |

### UI ověřovací scénáře (manuální checklist v S9/S10, browser)

Vytvoření state (objeví se v listu, validní default), rename state (transitions v UI ukazují nový label, JSON `to` beze změny), duplicate built-in (vznikne user kopie, originál read-only), invalid draft (error v panelu, Save/Preview disabled), save→reload stránky→preset přítomen, import kolizního ID (vznikne suffixované), preview respawn po změně parametru (nová entita se chová dle změny, stará zmizela).

---

## R. Rizika a trade-offs

| ID | Riziko | P | Dopad | Vrstvy | Prevence | Ověření |
|---|---|---|---|---|---|---|
| R-01 | plíživé zobecnění kompozice (modifiery mutující stav, mezi-kategoriální závislosti) | M | H | catalog, resolvery | tvrdý kontrakt: modifier = čistá transformace targetu; limit 3; review pravidlo v AGENTS po S4 | code review, MovementComposition.smoke |
| R-02 | konflikt movement výstupů | L | M | MovementResolver | fold konstrukčně vylučuje; jediný zápis vel v EnemySystem | unit testy pořadí |
| R-03 | drift editor model vs. runtime model | M | H | editor, FsmTypes | jeden typ `FsmPreset` pro obojí; editor nemá vlastní paralelní shape; draft = tentýž typ | serialization roundtrip test |
| R-04 | built-in vs. user nekonzistence (user preset odkazuje na profil, který zmizí z contentu) | M | M | validate, registry | referenční validace při KAŽDÉM loadu (ne jen importu); invalid badge místo crash | FsmInvalidGraph.smoke |
| R-05 | schema migrace rozbije stará data | L | H | migrate, store | backup blob před migrací; migrace = čisté testované funkce; nevalidní výstup → raw + badge, ne smazání | FsmMigrate.smoke, ruční v1 fixture |
| R-06 | localStorage corruption/quota | M | L | store | try/catch, corrupt přejmenovat ne smazat, Export jako záchrana | ruční scénář + unit test parseru |
| R-07 | neplatný import | M | L | validate | import = plná validační pipeline, odmítnutí s issues | FsmValidate.smoke |
| R-08 | hot-reload očekávání („změním parametr a běžící enemy se změní") | M | L | preview, UX | žádná mutace běžících entit; „Preview zastaralé — Respawn" badge | UI scénář preview reset |
| R-09 | rozbití determinismu (RNG v editoru pronikne do sim) | L | H | vše | `crypto`/`Date.now` výhradně v editor/store vrstvě; sim přijímá jen `ctx.rng01`; grep-gate v review | FsmDeterminism.smoke |
| R-10 | růst EnemySystem pokračuje | M | M | EnemySystem | S3 přesouvá FSM logiku ven; nová funkcionalita jde do resolverů, ne do systému | diff review per session |
| R-11 | nejasná lifecycle sémantika (co se resetuje kdy) | M | M | FsmRuntime, docs | tabulka v sekci H je normativní; testy FsmLifecycle.smoke ji kodifikují | smoke + dokumentace |
| R-12 | regrese současných 10 built-in grafů a ne-FSM enemies | M | **H** | vše runtime | zlatý otisk parity test (Q); legacy ne-FSM větev v S3 nedotčena; sessions malé s vlastní validací | FsmRuntimeParity.smoke v každé runtime session |

---

## S. Future extensions (mimo MVP, jen směry)

- `spawnEnemy` lifecycle akce (fáze 2, S-navazující session; pipeline připravena) a na ni navázané conditions `spawnedChildrenStatus`.
- Seedovaný RNG: injektovaný `rng01` per entita (seed z `spawnOrdinal` + wave), `chance` condition, náhodné rozptyly parametrů.
- Targeting `delayedTracking`/`predictiveAim` (kruhový buffer pozic hráče v WorldState).
- `evadeAxis` a `waypointSequence` movement prvky.
- VFX/audio lifecycle hooky přes existující event fáze.
- Složené podmínky `allOf/anyOf` (aditivní rozšíření unionu).
- Migrace director waves na FSM typy (dnes žádná wave FSM nepoužívá — příležitost, ne dluh).
- Undo/redo v editoru (applyEdit historie).
- `SPAWN_ENEMY_PROJECTILE` event (S11 — na pomezí MVP a cleanup).

---

## T. Otevřené otázky

1. **Má preview entita běžet v normální hře (kolize, damage, skóre), nebo ve „sterilním" režimu?** Nelze odvodit z kódu — produktová volba. *Doporučení:* MVP = normální hra (nulová dodatečná složitost, skóre dopad zanedbatelný v dev režimu); sterilní režim případně později flagem `previewGhost`.
2. **Jaké limity má editor pro počet stavů/transitions?** *Doporučení:* soft-warning nad 12 stavů / 8 transitions na stav (UI čitelnost), žádný hard limit — runtime je O(transitions) a zvládne víc.
3. **Má se `behaviorGraphs.json` po S10 přejmenovat (např. `fsmPresets.json`)?** Čistě kosmetické vs. AGENTS §6 kanonické názvy. *Doporučení:* ponechat název, změnit obsah na schemaVersion 1 — méně dotčených míst (AGENTS, docs, loadContent).
4. **Lokalizace editoru (CZ/EN)?** *Doporučení:* EN labels v descriptorech (konzistentní s kódem), bez i18n vrstvy v MVP.

---

## U. Codex implementation sessions

Pořadí dle závislostí; každá session = 1 fokusovaný commit na task branch Y → PR do X (dle AGENTS §9). Validace vždy minimálně: `npm run typecheck`, `npm run build`, relevantní smoke přímo přes `npx tsx` (+ `npm run smoke` s vědomím pre-existing BombExplosionChain failure).

| # | Název | Cíl | Závislosti | Dotčené moduly | Mimo scope | Acceptance criteria | Rizika |
|---|---|---|---|---|---|---|---|
| S1 | `feat(fsm): target types, catalog descriptors, validation` | `FsmTypes` cílový model, `ParamSpec`, descriptory (bez runtime přepojení), `validate.ts`, `ValidationIssue` | — | fsm/FsmTypes, catalog/* (descriptory), fsm/validate + `FsmValidate.smoke` | runtime změny, UI | typecheck+build zelené; FsmValidate.smoke: všechny E/W scénáře dle K; nula změn chování hry | nízké — čistě aditivní |
| S2 | `feat(fsm): legacy graph migration + registry` | `migrate.ts`, `FsmPresetRegistry` (built-in only), zapojení do `loadContent` fail-soft; runtime stále čte staré `BEHAVIOR_GRAPHS` | S1 | fsm/migrate, fsm/FsmPresetRegistry, content/loadContent, content/CONTENT + `FsmMigrate.smoke` | přepojení EnemySystem | 10/10 grafů migruje bez errors; registr resolvable; hra běží beze změny (BEHAVIOR_GRAPHS nedotčeno) | nesoulad legacy shape — kryto smoke |
| S3 | `refactor(enemies): FsmRuntime + EnemySystem rewire` | `FsmRuntime.ts`, per-spawn runtime alokace, enter/exit/re-entry, combat modes, odstranění `applyStateBehavior`/`fsmAppliedMovementPresetId`/mrtvých logů (F-05); **zlatý otisk parity PŘED změnou** | S2 | systems/EnemySystem, systems/SpawnSystem, enemies/runtime/*, fsm/FsmRuntime + `FsmRuntimeParity.smoke`, `FsmLifecycle.smoke`, `FsmDeterminism.smoke` | movement modifiery, combat patterny, UI | parity: 3 grafy bitově shodné trajektorie; lifecycle testy zelené; ne-FSM enemy nedotčeni (legacy větev beze změny); `FsmCombatModes.smoke` inherit/disabled | **nejrizikovější session** — malý diff v EnemySystem, legacy větev neměnit |
| S4 | `feat(fsm): movement composition + cull anchor` | `MovementResolver`, 3 MVP modifiery, adaptace 11 primitiv na `(params,state)` signatury v katalogu, `getCullAnchorX`, smazání `EnemyCullReference.ts` | S3 | enemies/runtime/MovementResolver, catalog/movementBases+movementModifiers, systems/EnemySystem (cull řádky), enemies/EnemyGroups (cull ref volání) + `MovementComposition.smoke` | targeting/combat | composition testy dle Q; parity smoke stále zelený; cull chování sine/loop/orbit shodné (EnemyCulling.smoke zelený) | adaptace signatur — mechanická, krytá parity testem |
| S5 | `feat(fsm): targeting + fire patterns` | `CombatResolver`, targeting katalog, patterny burst/radial, `aimed`→targeting adapter, `distanceToPlayer` condition | S4 | enemies/runtime/CombatResolver, catalog/targeting+conditions, enemies/AttackController (rozdělení pure/emit) + `FsmCombatModes.smoke` rozšíření | SPAWN event pro projektily (S11) | aimed profily střílí identicky (parity na sniper_aimed); burst 3×N projektilů s intra-delay; radial count paprsků; disabled tichý | změna AttackController — krytá CombatLoop.smoke |
| S6 | `feat(fsm): user preset store + import/export` | `UserPresetStore`, localStorage blob, backup, corrupt handling, export/import formát; `src/dev` do tsconfig include | S1 (S2 pro registry napojení) | enemies/store/UserPresetStore, fsm/FsmPresetRegistry (user vrstva), tsconfig + `FsmSerialization.smoke` | UI | roundtrip test zelený; corrupt blob → přejmenován, start prázdný; import kolize → suffix; quota fail → hláška bez pádu (unit s mock storage) | tsconfig rozšíření může odkrýt existující type chyby v src/dev — opravit jen blokující |
| S7 | `feat(dev): Enemy Lab editor foundation` | `src/dev/enemylab/`: EditorStore (applyEdit), PresetToolbar, mount v DevSummoner, read-only zobrazení draftu, dirty state, sessionStorage zrcadlo | S6 | dev/enemylab/*, dev/DevSummoner (zeštíhlení) | state editace, preview | build zelený; otevření/výběr presetu, duplicate built-in → user, Save/Delete/rename meta funkční; spawn panel beze změny chování | objem UI kódu — držet moduly malé |
| S8 | `feat(dev): state editor + transitions UI` | StateList, StateDetail (accordion, formuláře z ParamSpec), TransitionsEditor (reorder), ValidationPanel s path fokusem, FSM-typ spawn hint (F-20) | S7 | dev/enemylab/* | preview | UI checklist Q (create/rename/reorder/invalid draft) projde v prohlížeči; rename nemění `to` reference (ověřit exportem) | UX iterace — držet scope na funkčnost, ne vzhled |
| S9 | `feat(dev): draft preview workflow` | `registerDraft`/`unregisterDraft`, `fsmPresetKey` v SPAWN_ENEMY payloadu, SpawnSystem snapshot, PreviewControls (Spawn/Respawn/Kill), stale badge | S8 (payload část jde i po S3) | engine/core/events, systems/SpawnSystem, fsm/FsmPresetRegistry, dev/enemylab/PreviewControls | hot-reload běžících entit | preview scénáře Q; invalid draft → disabled; zavření editoru → draft pryč + entita killed; determinismus smoke stále zelený | zásah do events.ts — aditivní pole, ownership beze změny |
| S10 | `content(fsm): built-in graphs to schema v1 + explicit terminals` | přepis `behaviorGraphs.json` na schemaVersion 1, explicitní terminal stavy s `despawn` + offscreen transitions kde odpovídá, adapter ponechán pro legacy detekci | S3 (ideálně po S9 pro vizuální kontrolu) | content/behaviorGraphs.json, fsm/migrate (detekce) | změny gameplay tuningu | validate 0 errors; parity smoke aktualizován na nové otisky s vysvětleným diffem (despawn dřív než cull — vizuálně ověřeno v prohlížeči); AGENTS §6 beze změny názvů | jediná session měnící pozorovatelné chování — explicitně malý, popsaný diff |
| S11 | `refactor(enemies): enemy projectile spawn via event` *(volitelná, doporučená)* | `SPAWN_ENEMY_PROJECTILE` + emitNext, odstranění přímého store.spawn z attack executoru (F-06) | S5 | engine/core/events+EventOwnershipMap, systems/SpawnSystem, enemies/AttackController/CombatResolver | ostatní přímé spawny | projektily fungují s 1-tick offsetem; CombatLoop + FsmCombatModes zelené; žádný store.spawn v enemies/ | behavior change (1 tick) — vlastní session právě proto |
| S12 | `test(fsm)+docs: suite registration, cleanup, docs` | registrace FSM smoků do runSmokes (před BombExplosionChain), smazání mrtvých vrstev (`ai/`, `controller/`, `behaviors.mvp.json`, `_patch/`, `runSmokes,ts` — po potvrzení maintainerem), aktualizace AGENTS §6 (FSM preset zdroje) a docs | vše | smoke/runSmokes, docs, AGENTS | oprava BombExplosionChain (samostatný dluh mimo FSM) | `npm run smoke` selže POUZE na pre-existing failure; docs odpovídají kódu | mazání souborů — jen s explicitním souhlasem, jinak vynechat |

Sloučení možná: S7+S8 pokud bude S7 malá; S10 lze předřadit před S8, pokud bude potřeba dřív vidět nová schémata. Nespojovat: S3 s čímkoliv dalším (nejrizikovější), S11 vždy samostatně (behavior change).

---

## Finální kontrola (odpovědi na §26 zadání)

- **State reprezentace:** `FsmStateDef` se stabilním `id`, `label`, povinným `movement`, volitelnými `targeting/combat/lifecycle`, uspořádanými `transitions` (E).
- **Skládání movementu:** 1 base + 0–3 uspořádané čisté modifiery, sekvenční fold targetu (G).
- **Base vs. modifier:** base = analytický generátor targetu s vlastním stavem a cull anchorem; modifier = bezstavová/lehce stavová transformace targetu (G1–2).
- **Vlastník movementu:** target — MovementResolver; vel — EnemySystem; integrace pos — výhradně EnemySystem (G3).
- **FSM × cohesion:** FSM movement → cohesion PŘEPÍŠE vel pro členy skupin → failsafe → integrace; dokumentováno + validátor warning (G4).
- **Targeting:** samostatná single-slot kategorie určující aim; fire pattern ji konzumuje (E, J).
- **Combat on/off:** explicitní `disabled | inherit | profile`; absence = disabled (E).
- **Entry/re-entry reset:** movement/modifier/targeting sloty vždy (default), vypnutelné `resetMovementOnReenter:false`; combat přežívá, `resetOnEnter` per stav (H).
- **Explicitní despawn:** lifecycle akce `despawn` → `markKill` → Cleanup (H).
- **Validace:** 4 vrstvy s API `validateFsmPreset`; dangling/duplicate/unknown = hard error, rozsahy = warning+clamp (K).
- **Rename bez rozbití:** mění se jen `label`; `to` odkazuje na immutable `id` (E).
- **Built-in/user/draft odlišení:** `source` určuje vlastnící registr, ne serializovaná data; UI badge + read-only pole (L, M).
- **Uložení a migrace:** localStorage blob `cm.fsm.user.v1`, backup před migrací, migrace = čisté funkce v `migrate.ts` (L).
- **Import/export:** jeden formát `cm-fsm-presets` s polem presets (single i bundle); import přes plnou validaci, kolize ID → suffix (L).
- **Izolace draftu:** klíč `__draft` v registru, deep-frozen resolved snapshot zachycený entitou při spawnu, žádný hot-reload (N).
- **Zachování současných enemies:** legacy ne-FSM větev nedotčena; 10 grafů auto-migrováno behavior-preserving; parity smoke to vynucuje (O, Q).
- **Změny v EnemySystem:** odchází FSM inline blok, `applyStateBehavior`, `fsmAppliedMovementPresetId`, mrtvé logy; přichází volání tří resolverů; zůstává iterace, vel, cohesion, failsafe, integrace, cull (P).
- **Sessions:** S1–S12 dle závislostí (U).

---

**Potvrzení stavu session:** Nebyly provedeny žádné změny zdrojových souborů projektu, žádný commit ani PR v rámci návrhové práce; jediným výstupem je tento dokument (`FSM_architecture_proposal.md`), exportovaný dle explicitního pokynu zadání do stejné složky jako `fsm-audit.md`. Working tree před exportem: čistý (HEAD `43da07a`).
