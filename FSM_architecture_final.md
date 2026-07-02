# FABLE — FSM ARCHITECTURE, KROK 2B: FINÁLNÍ REVIDOVANÝ NÁVRH

Navazuje na: `fsm-audit.md` (Krok 1) a `FSM_architecture_proposal.md` (Krok 2, commit `403aa4a`).
Tento dokument **nahrazuje sporné části** původního návrhu. Kde mlčí, platí Krok 2 beze změny
(varianta C, descriptor katalog, persistence model, preview snapshot, UI informační architektura).
Reference F-xx = nálezy auditu; §-odkazy na soubory odpovídají stavu HEAD `0a1a590` (`origin/work`).

---

## A. Summary of revisions

| # | Oblast | Změna oproti Kroku 2 |
|---|---|---|
| 1 | Groups × FSM | Původně „FSM movement se vykoná a cohesion ho přepíše". **Nově: u group-controlled entity se individuální FSM movement vůbec nevykonává** (suspenze na úrovni MovementResolveru). FSM dál řídí transitions/targeting/combat/lifecycle. Blend je future extension. |
| 2 | Lifecycle | Původní `LifecycleConfig { onEnter?, resetMovementOnReenter? }` **nahrazeno** `LifecycleConfig { enterActions?: EnterAction[] }`. Žádné user-facing onExit/onUpdate. MVP akce: pouze `despawn`. `fireOnEnter` z MVP vypuštěn. |
| 3 | Movement reset | `resetMovementOnReenter` **odstraněn z modelu**. Každý vstup do stavu (včetně self-transition a návratu) vytváří nový movement runtime state. `enterPolicy: "preserveIfCompatible"` = future extension. |
| 4 | Combat policy | Původní default „cooldown přežívá přechody" (`resetOnEnter: false`) **odmítnut jako nebezpečný default**. Nově `runtimePolicy?: "reset" \| "preserveIfSameProfile"`, default `"reset"`. Parita built-in grafů ověřena — legacy adapter není potřeba (B-06). |
| 5 | Age/transition sémantika | Přijat přesný model „age na začátku ticku = čas před tímto tickem; increment po vykonání, i v entry ticku". Vědomá změna: `timeInState` přepne **o 1 tick dříve** než legacy — dokumentováno, kryto testy (E-3). |
| 6 | Cycle validace | Původní plošné `W_IMMEDIATE_LOOP` **zpřesněno**: hard error jen pro cykly složené výhradně z guaranteed-immediate hran; warning pro časově nepodmíněné cykly; validní cykly bez issue (F-2). |
| 7 | Normalizace hodnot | Původní „clamp při resolve + warning" **odmítnut** (skrytý rozdíl uložená vs. runtime hodnota). Nově: editor blokuje Save při chybě; import = explicit normalization s reportem a přepsanou hodnotou; runtime nikdy tiše neclampuje (F-3). |
| 8 | Invalid built-in | Původní jednotné fail-soft **rozděleno**: dev/CI = fail-fast (throw/failing test), production = fail-soft s log-once (F-4). |
| 9 | Runtime typy | `movementState: object` / `modifierStates: object[]` **nahrazeno** generickým modulovým API `<C, S>` s erasure izolovanou v `define*` helperu a resolveru; resolved reprezentace bez per-tick string dispatch (C-4). |
| 10 | MVP katalog | **Zúženo**: modifiery jen `sineOffset` + `clampY`; targeting jen `forward`/`atPlayer` (fixedAngle, atPlayerOffset odloženy); combat bez nových patternů (burst/radial odloženy); conditions +`distanceToPlayer`; lifecycle jen `despawn` (G). |
| 11 | CullReference | Zpřesněno na dvouhodnotovou capability `cullReference: "entityPosition" \| "moduleAnchor"` + povinné `getCullAnchorX` u moduleAnchor. Žádná obecná capability platforma (B-11). |
| 12 | Roadmapa | Přeuspořádána dle zadání: built-in konverze (S7) před plným UI; projectile event refactor a mazání mrtvých prototypů **vyřazeny z roadmapy** do samostatné maintenance (J). |

---

## B. Final architectural decisions

| ID | Oblast | Finální rozhodnutí | Důvod | Odmítnutá alternativa |
|---|---|---|---|---|
| B-01 | Group-controlled movement | Zdroj pravdy = **runtime group membership** (`ent.group`, nastavuje `SpawnSystem.spawnEnemy` přes `groups.addMember`, dnes čteno v `EnemySystem.ts:212,255`). Je-li `ent.group` přítomné a skupina existuje, MovementResolver se **nevolá**; vel počítá výhradně `applyMemberCohesion`. FSM transitions/targeting/combat/lifecycle běží normálně. | Membership už je existující runtime marker s přesně tou sémantikou; observably identické s dneškem (cohesion vel stejně přepisovala — jen odpadá zahozený výpočet). Definice enemy typu nemůže vědět, jak bude spawnut. | Capability v enemy definition („groupOnly") — duplikuje informaci, kterou runtime už má, a rozbije se u typů spawnovaných oběma způsoby. Blend FSM×cohesion — future extension, ne MVP. |
| B-02 | Ztráta membership za běhu | Dnes nenastává (audit: `reconcile` odebírá jen mrtvé členy; živý člen skupinu neopouští). Defenzivně: MovementResolver drží `rt.movementSuspended`; přechod suspended→active provede **re-init movement modulů na aktuální pozici** (jako state entry), pak normální běh. | Bez re-initu by kotvy (baseX/baseY) pocházely z okamžiku state entry, zatímco entitu mezitím posunula skupina → skok targetu. | Ignorovat (skok) nebo zakázat — zbytečně křehké. |
| B-03 | UI pro group-controlled | Editor movement sekce dostává kontextový badge „Movement je u skupinově spawnovaných enemy řízen skupinou — tato sekce se neuplatní". Group spawn panel (DevSummoner) u FSM typu skryje movement selektory a zobrazí tutéž hlášku. Preset-level validace **žádná** — preset nezná spawn kontext. | Kontext je vlastnost spawnu, ne presetu. | Validátor error/warning na presetu — false positives pro typy spawnované individuálně. |
| B-04 | Lifecycle terminologie | `LifecycleConfig { enterActions?: EnterAction[] }`. Interní cleanup při opuštění stavu je implementační detail FsmRuntime, ne user-facing pojem. MVP akce: **pouze `{ type: "despawn" }`**. `spawn/summon/playVfx/playSound/fireOnce` odloženy. | Ověření architektury vyžaduje jedinou akci (F-03); zvuk/VFX vyžadují event kontrakty mimo FSM scope; fireOnce je dosažitelný kombinací profile+krátký stav. | Obecné onEnter/onUpdate/onExit — slibuje fáze, které model nepodporuje. |
| B-05 | Movement runtime reset | **Každý vstup do stavu = nový movement runtime state** (self-transition, návrat, stejný module type, stejné parametry — vždy). Žádná implicitní konzervace. Future: `enterPolicy: "reset" \| "preserveIfCompatible"` (explicitní, mimo MVP). | Předvídatelnost, triviální preview reset, žádné sdílení fáze, bezpečná změna parametrů. | `resetMovementOnReenter?: boolean` z Kroku 2 — nejasná sémantika napříč pěti scénáři vstupu (viz E-1). |
| B-06 | Combat runtime policy | `runtimePolicy?: "reset" \| "preserveIfSameProfile"`, **default `"reset"`**. Preserve povolen výhradně mezi stavy se **stejným `profileId`** a explicitní volbou. `disabled→profile`, `inherit→profile`, jiný profil, self-transition = vždy reset. **Legacy adapter není potřeba**: v 10 built-in grafech neexistuje přechod mezi dvěma attack stavy (audit, sekce E — max. 1 attack stav na graf; `fsm.smart_aligner` má attack→retreat bez profilu), takže default reset je paritní. | Explicitní model bez nebezpečného děděného cooldownu; parita ověřena proti contentu, ne předpokladem. | Default preserve (Krok 2) — nový preset by tiše dědil runtime z jiného profilu. Legacy politika `"legacyPreserve"` — mrtvý kód od prvního dne. |
| B-07 | Age & transition timing | Model dle E-3: eval s age „před tickem" → případný switch (cleanup, age=0, nové module state, enterActions) → vykonání aktivního stavu → `age += dt` pro stav, který se vykonal. Stav se **vždy vykoná aspoň 1 tick**; enterActions právě jednou na skutečný vstup; max 1 přechod/tick zachován. | Čistá sémantika: `timeInState ≥ T` ⇒ stav běží přesně `ceil(T/dt)` ticků. | Legacy sémantika (bez incrementu v entry ticku) — drží bitovou paritu, ale zachovává off-by-one (stav běží T+dt); nová sémantika přijata a kryta testy. |
| B-08 | timeInState boundary změna | **Přijata** změna −1 tick vůči legacy (viz E-3 příklady). Parita testů: sekvence stavů identická; časové přechody o přesně 1 tick dříve; poziční/HP přechody beze změny. | Off-by-one fix; 16,7 ms rozdíl je herně nepozorovatelný, deterministický a dokumentovaný. | Emulace legacy off-by-one navždy — konzervace chyby kvůli bitovému otisku. |
| B-09 | Immediate cycles | **Hard error** `E_IMMEDIATE_CYCLE`: cyklus, jehož každá hrana je guaranteed-immediate (v MVP: `timeInState.seconds <= 0`; množina je definovaná predikátem `isGuaranteedImmediate(condition)` v katalogu conditions). **Warning** `W_TIMELESS_CYCLE`: cyklus, jehož žádná hrana nemá `timeInState.seconds > 0` (může oscilovat po herním stavu). **Bez issue**: cyklus s aspoň jednou časovou hranou > 0. Algoritmus: cycle-detekce (DFS) nad podgrafem immediate hran; pak nad podgrafem všech hran s klasifikací. | Cyklická FSM je legitimní (patrol/enrage loops); nebezpečný je jen every-tick reset + re-fire entry akcí. Realistická statická analýza, žádný theorem prover. | Plošný warning na každý cyklus (Krok 2) — false positives na validní návrhy. |
| B-10 | Normalizace hodnot | **Editor**: hodnota mimo rozsah = error, Save blokován; vstupy clampují okamžitě při commitu hodnoty a zobrazená hodnota == uložená hodnota draftu (divergence nemožná). **Import**: explicit normalization (varianta B) pro numerické rozsahy — issue `severity: "normalized"` s original/normalized, importovaný preset už obsahuje opravenou hodnotu, uživatel dostane report; strukturální/referenční/neznámý-typ = hard error, import odmítnut. **Runtime resolve nikdy tiše neclampuje** — přijímá jen validovaný vstup (dev assert). | Uložená ≠ runtime hodnota je zakázaný stav; numerika je bezpečně opravitelná, struktura ne. | Strict import (varianta A) i pro rozsahy — zbytečně nepřátelské k presetům z odlišně tuněné verze; clamp při resolve (Krok 2) — skrytá divergence. |
| B-11 | Cull reference | Descriptor capability: `cullReference: "entityPosition" \| "moduleAnchor"`. `moduleAnchor` ⇒ modul povinně implementuje `getCullAnchorX(config, state): number`; konzistenci kontroluje definiční helper (dev assert při registraci). Mapování: `loop`, `sine`, `orbitTarget` = moduleAnchor (přenesená matematika z `EnemyCullReference.ts`, který se poté maže); ostatní = entityPosition. Cull rozhodnutí (band, markKill) zůstává v EnemySystem; group cull ref používá tutéž capability přes anchor behavior skupiny. | Odstraňuje skrytý switch podle behavior ID (F-16) jedním enum polem + jednou metodou. | `"custom"` třetí hodnota s externím providerem — obecná capability platforma pro neexistující use case. |
| B-12 | Modifier limiter volba | MVP druhý modifier = **`clampY`** (vedle `sineOffset`). | Přímá autorská hodnota: udržet sine/zigzag/offset vzory ve viewportu; bezstavový, deterministický; `evade` už interně clampuje — vzor existuje. `speedLimit` řeší problém, který bases už řeší interně (maxSpeed parametry). | `speedLimit`. |
| B-13 | Built-in fail policy | Dev/CI = fail-fast; production = fail-soft (detaily F-4). Spouští se: (1) v `loadContent`/registry initu (boot), (2) v dedikovaném smoke `FsmBuiltinContent.smoke` (CI/test). | Chyba contentu je chyba projektu — musí zastavit vývojáře, ne hráče. | Jednotné fail-soft (Krok 2) — tiché vyřazení v developmentu. |
| B-14 | Registry typová izolace | Generické `MovementBaseModule<C,S>` atd.; erasure na `<unknown, unknown>` výhradně uvnitř `defineMovementBase()` helperu a registry resolveru. Resolved reprezentace nese přímé `module` reference + validované configy — žádný per-tick switch podle stringu. | `unknown` na 1 místě místo `any` napříč runtime (F-07). | Plně generický heterogenní registr (existenciální typy) — TS gymnastika bez užitku. |

---

## C. Revised data model

Změny proti Kroku 2 (ostatní typy — `FsmPreset`, `FsmPresetMeta`, `FsmGraphDef`, `TransitionDef`, persistence typy — beze změny):

```ts
// ---------- State (revidováno) ----------
export interface FsmStateDef {
  id: FsmStateId;               // stabilní, immutable; transitions odkazují sem
  label: string;                // zobrazovaný název; rename mění jen label
  movement: MovementConfig;     // povinné; u group-controlled entity se NEVYKONÁVÁ (B-01)
  targeting?: TargetingConfig;  // absence = { type: "forward" }
  combat?: CombatConfig;        // absence = { mode: "disabled" }
  lifecycle?: LifecycleConfig;
  transitions: TransitionDef[];
}

// ---------- Lifecycle (revidováno, B-04) ----------
export interface LifecycleConfig {
  enterActions?: EnterAction[];      // jednorázové, v pořadí pole, právě jednou na skutečný vstup
}
export type EnterAction =
  | { type: "despawn" };             // MVP: jediná akce; markKill → Cleanup
// future (mimo MVP): spawnEnemy, playVfx, playSound

// ---------- Combat (revidováno, B-06) ----------
export type CombatConfig =
  | { mode: "disabled" }
  | { mode: "inherit" }                                  // def-level attackProfile (legacy vazba)
  | { mode: "profile"; profileId: string;
      runtimePolicy?: "reset" | "preserveIfSameProfile" }; // default "reset"

// ---------- Movement (beze změny struktury; enterPolicy NEEXISTUJE v MVP, B-05) ----------
export interface MovementConfig {
  base: MovementBaseConfig;                 // discriminated union, 11 adaptovaných typů (Krok 2 E)
  modifiers?: MovementModifierConfig[];     // MVP: sineOffset, clampY; 0–3, uspořádané
}
export type MovementModifierConfig =
  | { type: "sineOffset"; params: { ampX: number; ampY: number; freqHz: number } }
  | { type: "clampY";     params: { paddingPx: number } };

// ---------- Targeting (zúženo, MVP) ----------
export type TargetingConfig =
  | { type: "forward" }        // −X
  | { type: "atPlayer" };      // bez hráče → fallback forward
// fixedAngle, atPlayerOffset: fáze 2 (aditivní rozšíření unionu)

// ---------- Conditions (zachováno + distanceToPlayer) ----------
export type ConditionConfig =
  | { type: "timeInState";      params: { seconds: number } }                        // s
  | { type: "hpBelow";          params: { ratio: number } }                          // 0–1, striktní <
  | { type: "screenXBelow";     params: { x: number } }                              // px, screen-space
  | { type: "offscreen";        params: { side: "left" | "right"; marginPx?: number } } // default 96
  | { type: "distanceToPlayer"; params: { op: "below" | "above"; px: number } };     // world-space eukleid.

// ---------- Validation issue (revidováno, B-10) ----------
export interface ValidationIssue {
  severity: "error" | "warning" | "normalized";
  code: string;                 // "E_DANGLING_TRANSITION", "E_IMMEDIATE_CYCLE", "N_PARAM_CLAMPED", ...
  path: string;                 // "states[st_atk].movement.base.params.speedX"
  message: string;
  location?: { stateId?: FsmStateId; transitionIndex?: number; field?: string };  // pro fokus v editoru
  originalValue?: unknown;      // jen normalized
  normalizedValue?: unknown;    // jen normalized
}
```

### Modulové API a resolved reprezentace (B-14)

```ts
// src/game/enemies/catalog/ — veřejný kontrakt modulů
export interface MovementBaseModule<C, S> {
  createState(config: C, ctx: MovementEnterContext): S;   // ctx: ent pos, spawnOrdinal, rng01?
  update(state: S, config: C, dt: number, ctx: MovementUpdateContext): void;
  getTarget(state: S, config: C, ctx: MovementUpdateContext, out: MutableVec2): boolean; // false = hold
  getCullAnchorX?(state: S, config: C): number;           // povinné ⟺ descriptor.cullReference === "moduleAnchor"
}
export interface MovementModifierModule<C, S> {
  createState(config: C, ctx: MovementEnterContext): S;   // clampY/sineOffset: S = void-like {}
  apply(state: S, config: C, dt: number, ctx: MovementUpdateContext, target: MutableVec2): void;
}
export interface TargetingModule<C> {
  resolveAim(config: C, ctx: CombatContext, out: MutableVec2): void;   // bezstavové v MVP
}
export interface CombatController {   // jediný v MVP: profile executor (evoluce updateAttack)
  update(state: CombatRuntime, profile: AttackProfileDef, aim: Vec2, ctx: CombatContext): void;
}
export interface ConditionModule<C> {
  evaluate(config: C, ent: EnemyLike, age: number, ctx: ConditionContext): boolean;
  isGuaranteedImmediate(config: C): boolean;              // pro B-09 (timeInState: seconds <= 0)
}

// erasure IZOLOVANÁ v define helperu — jediné místo s castem:
export function defineMovementBase<C, S>(entry: {
  descriptor: MovementBaseDescriptor; module: MovementBaseModule<C, S>;
}): MovementBaseEntry {   // MovementBaseEntry interně drží MovementBaseModule<unknown, unknown>
  if (entry.descriptor.cullReference === "moduleAnchor" && !entry.module.getCullAnchorX)
    throw new Error(`[catalog] ${entry.descriptor.type}: moduleAnchor requires getCullAnchorX`);
  return entry as unknown as MovementBaseEntry;
}

// Resolved reprezentace (výstup resolveFsmPreset; deep-frozen; žádný string dispatch za běhu):
export interface ResolvedState {
  id: FsmStateId;
  movement: {
    base: { module: MovementBaseModule<unknown, unknown>; config: unknown;
            cullReference: "entityPosition" | "moduleAnchor" };
    modifiers: ReadonlyArray<{ module: MovementModifierModule<unknown, unknown>; config: unknown }>;
  };
  targeting: { module: TargetingModule<unknown>; config: unknown };
  combat: ResolvedCombat;   // { kind:"disabled" } | { kind:"profile"; profile: AttackProfileDef; policy } — inherit už rozvinutý na def profil při resolve
  enterActions: ReadonlyArray<EnterAction>;
  transitions: ReadonlyArray<{ module: ConditionModule<unknown>; config: unknown; toIndex: number }>;
}

// Per-entity runtime (alokace při spawnu a při state entry, NE per tick):
export interface FsmEntityRuntime {
  preset: ResolvedFsmPreset;        // immutable snapshot zachycený při spawnu
  stateIndex: number;
  age: number;                      // s; sémantika dle E-3
  movementState: unknown;           // slot base modulu (typ zná jen modul)
  modifierStates: unknown[];        // index-aligned
  combatState: CombatRuntime | null;
  movementSuspended: boolean;       // group-controlled (B-01/B-02)
  scratchTarget: MutableVec2;       // sdílený výstupní buffer — nulové per-tick alokace
  diagnostics: { loggedCodes?: Set<string> };
}
```

`unknown` páry (`module` + `config`) jsou konzistentní z konstrukce: vyrábí je výhradně resolver, který config validoval proti descriptoru téhož typu. Mimo resolver a define helper se `unknown`/`any` v novém FSM kódu nevyskytuje.

---

## D. Revised runtime flow

Fázový řád a pozice v Simulation beze změny. Per enemy s FSM (`ent.fsmRuntime`):

```
 0. sanitize pos/vel, posPrev, hit-flash                        (EnemySystem, beze změny)
 1. TRANSITIONS (FsmRuntime.tick):
    a) eval transitions aktivního stavu v pořadí pole, first-match,
       s aktuálním rt.age (= čas aktivity PŘED tímto tickem)
    b) match → interní exit cleanup → stateIndex = toIndex → age = 0
       → movementState/modifierStates = createState(...) (VŽDY nové, B-05)
       → combatState dle runtimePolicy (B-06; reset ⇒ nový, preserveIfSameProfile
         a stejný profileId ⇒ ponechat)
       → enterActions v pořadí pole:
           despawn → store.markKill(ref) → return "killed"
           (entita tento tick už nevykonává movement/combat; commit v Cleanup)
    c) bez matche: nic (age se inkrementuje až v kroku 6)
 2. MOVEMENT:
    a) group-controlled? (ent.group && registry zná skupinu)
         → rt.movementSuspended = true; PŘESKOČ 2b–2c (B-01)
       jinak: byl-li movementSuspended → re-init module states na aktuální pozici,
         movementSuspended = false (B-02)
    b) base.update(dt) → base.getTarget(out: rt.scratchTarget) → false ⇒ hold (vel beze změny)
    c) for mod in modifiers (pořadí pole): mod.apply(..., rt.scratchTarget)
    d) EnemySystem: vel = (scratchTarget − pos)/dt
 3. group cohesion: člen skupiny → applyMemberCohesion píše vel (jediný movement vlastník
    skupinové entity — krok 2 se nekonal, žádný zahozený výpočet)
 4. failsafe + NaN sanitizace                                    (EnemySystem, beze změny)
 5. INTEGRACE pos += vel·dt — výhradně EnemySystem               (beze změny)
 6. rt.age += dt        ← inkrement pro stav, který se v tomto ticku SKUTEČNĚ vykonal (B-07)
 7. COMBAT (CombatResolver):
    disabled → skip; jinak: targeting.resolveAim → aim; combat controller
    (cooldown/windup/fire) s injektovaným aim; projektily zatím přímý spawn
    (dokumentovaná legacy výjimka F-06 — refactor mimo tuto roadmapu)
 8. CULL: anchorX = (base.cullReference === "moduleAnchor")
        ? base.module.getCullAnchorX(state, config) : pos.x
    → mimo band → markKill                                        (EnemySystem, B-11)
```

Runtime chyby: try/catch kolem kroků 2 a 7 v EnemySystem (crash → markKill, jako dnes). Neznámý typ za běhu nemůže nastat (resolve by selhal); defenzivní větev = log-once přes `diagnostics.loggedCodes` + chování hold/disabled. Determinismus: žádný `Math.random`; RNG jen jako injektovaný `ctx.rng01?` (nevyužitý v MVP). Alokace: pouze při spawnu a při přechodu (createState) — přechody jsou řídké události; per-tick nula nových objektů (`scratchTarget`, mutace `rt`).

---

## E. Runtime state policies

### E-1 Movement (B-05)

| Scénář | Chování |
|---|---|
| vstup do jiného stavu | nový movement runtime state (createState na aktuální pozici) |
| návrat do dříve aktivního stavu | nový runtime state — nic se nepamatuje |
| self-transition A → A | plný enter: nový runtime state + enterActions znovu |
| dva stavy se stejným movement typem | každý vstup nový state (kotvy z pozice při vstupu) |
| stejný typ, jiné parametry | totéž — parametry čtou se z configu nového stavu |
| group-controlled | module state vzniká při entry, ale update/getTarget se nevolá (suspenze); po ztrátě membership re-init na aktuální pozici |

Starý runtime state se zahazuje přepsáním slotů v `rt` při přechodu (GC); modifiery se inicializují společně s base, index-aligned. Preview instance se resetuje výhradně respawnem entity (nová entita = nový `FsmEntityRuntime`).

### E-2 Combat (B-06)

| Přechod | combatState |
|---|---|
| → `disabled` | zahozen (null) |
| `disabled`/`inherit` → `profile` | **reset** (nový: cooldown=0, windup dle profilu, shotsFired=0, firing=false) |
| `profile A` → `profile B` (A≠B) | **reset** — preserve mezi různými profily není povolen (ani volbou) |
| `profile A` → `profile A`, policy `reset` (default) | **reset** |
| `profile A` → `profile A`, policy `preserveIfSameProfile` | zachován (cooldown, windup, shotsFired, firing pokračují) |
| self-transition | řídí se stejnou tabulkou (default reset) |
| `inherit` → `inherit` | inherit se při resolve rozvine na konkrétní def profil ⇒ „stejný profil", default reset |

Reset nuluje: `cooldownMs`, `windupMs`, `firing`, `shotsFired`. Fire-on-enter chování: reset + `windupMs` profilu ⇒ první výstřel po windupu od vstupu (dnešní chování prvního vstupu). Parita: v 10 built-in grafech neexistuje profile→profile přechod ⇒ default reset je paritní bez adapteru (B-06).

### E-3 Age a transitions (B-07, B-08)

Invariant: **na začátku ticku `age` = čas, po který byl stav aktivní před tímto tickem.** Increment `age += dt` proběhne po vykonání stavu (krok 6 flow), i v entry ticku.

Příklady (dt = 1/60):

| Případ | Průběh |
|---|---|
| `timeInState ≥ 1.0` | entry v ticku 0 (po vykonání age=dt) … eval v ticku 60 vidí age=60/60=1.0 → match. Starý stav se vykonal přesně v ticích 0–59 = **přesně 1.0 s**. Legacy by přepnul v ticku 61 (stav běžel 61 ticků) — nová sémantika je o 1 tick dřívější (B-08). |
| self-transition `timeInState ≥ 0.5` | match v ticku 30 → plný enter (nové module state, enterActions znovu, age=0) → stav se týž tick vykoná → age=dt. Perioda přesně 30 ticků, enterActions 1× za periodu. |
| podmínka splněná okamžitě po vstupu (např. `hpBelow` už platí, nebo `timeInState ≥ 0`) | vstup v ticku N: stav se v ticku N vykoná (garantovaně ≥ 1 tick), eval v ticku N+1 s age=dt → match → další přechod. Řetěz A→B→C = 2 ticky; B se vykonal přesně 1×. Max 1 přechod/tick drží. |
| terminální stav (`enterActions: [despawn]`) | vstup → markKill během entry → tento tick se movement/combat nevykoná, transitions se už nikdy nevyhodnotí; age irelevantní; slot uvolní Cleanup. |

Dopad na testy: paritní kritérium = identická sekvence stavů; `timeInState` přechody o přesně 1 tick dříve než legacy otisk; poziční (`screenXBelow`, `offscreen`) a `hpBelow` přechody beze změny. Trajektorie uvnitř stavů identické při shodných vstupních podmínkách (kotvy z pozice při vstupu).

---

## F. Validation and normalization

### F-1 Vrstvy (beze změny struktury z Kroku 2, zpřesněné výstupy)

Strukturální → referenční → sémantická → editorová; API `validateFsmPreset(raw: unknown)` v `src/game/enemies/fsm/validate.ts`; `resolveFsmPreset` přijímá výhradně validovaný a normalizovaný vstup a **nikdy tiše neclampuje** (dev assert na rozsahy).

### F-2 Cykly (B-09)

| Klasifikace | Definice | Výstup |
|---|---|---|
| Immediate cycle | cyklus, jehož **každá** hrana má `isGuaranteedImmediate(condition) === true` (MVP: `timeInState.seconds <= 0`) | `E_IMMEDIATE_CYCLE` — hard error (každotickový reset runtime + re-fire enterActions) |
| Timeless cycle | cyklus, jehož **žádná** hrana nemá `timeInState.seconds > 0` (jen poziční/HP/distance podmínky) | `W_TIMELESS_CYCLE` — může oscilovat po herním stavu |
| Časovaný cyklus | aspoň jedna hrana `timeInState.seconds > 0` | bez issue — legitimní patrol/enrage smyčka |

Pozn.: jednotlivý stav s `timeInState: 0` bez cyklu (pass-through pro enterActions) je validní — stav se vykoná přesně 1 tick (E-3).

### F-3 Hodnoty (B-10)

| Kontext | Mimo rozsah (číslo, znám ParamSpec) | Strukturální/referenční problém |
|---|---|---|
| Editor (draft) | `error` v panelu, Save/Preview/Export blokovány; UI clamp při commitu vstupu ⇒ zobrazená == uložená | error, blokace |
| Import | `normalized` issue s `originalValue`/`normalizedValue`; hodnota v importovaném presetu UŽ opravená; souhrnný report uživateli | `error` → **import odmítnut** celý |
| Load z localStorage | jako import (normalized + jednorázový report do konzole/badge) | preset označen invalid, ponechán raw, nelze načíst do preview |
| Runtime resolve | nesmí nastat — dev assert (`E_RESOLVE_UNVALIDATED`) | nesmí nastat |

### F-4 Built-in content (B-13)

| Prostředí | Chování při invalid built-in presetu | Kde se spouští |
|---|---|---|
| Development (Vite dev, `import.meta.env.DEV`) | `FsmPresetRegistry.initBuiltins(..., { failFast: true })` → **throw** při bootu s výpisem issues | `loadContent`/`createGame` |
| CI / test | `FsmBuiltinContent.smoke` validuje všech N built-in presetů, jakýkoli error = failing test | `runSmokes.ts` (registrace před známým pre-existing failure) |
| Production build runtime | fail-soft: preset vyloučen z registru, `console.error` jednou, badge v Enemy Lab, ostatní content běží | registry init s `failFast: false` |
| User preset / import | nikdy neshodí aplikaci; odmítnut (import) nebo invalid badge (storage); konkrétní issues uživateli | store/import pipeline |

---

## G. Final MVP scope

**MVP obsahuje (vertikální řez):**

| Kategorie | Obsah |
|---|---|
| Schema | `FsmPreset` v1 dle C; stabilní state ID; plně expandované params |
| Movement bases | 11 adaptovaných existujících primitiv (`hold, straight, straightLerp, sine, zigzag, loop, invaders, track, align, evade, range, orbitTarget`) — beze změny matematiky |
| Movement modifiers | `sineOffset`, `clampY` — nic dalšího |
| Targeting | `forward`, `atPlayer` |
| Combat | `disabled` / `inherit` / `profile` nad **existujícími** attack profily; `runtimePolicy` |
| Conditions | `timeInState`, `hpBelow`, `screenXBelow`, `offscreen` + `distanceToPlayer` (levná: `playerPos` už v ctx, hypot+porovnání) |
| Lifecycle | `enterActions: [despawn]` — jediná akce |
| Groups | FSM movement suspendován u group-controlled (B-01); žádný blend |
| Validace | 4 vrstvy vč. cycle klasifikace a normalizace; dev fail-fast / prod fail-soft |
| Persistence | localStorage blob, schemaVersion, backup, import/export s normalization reportem |
| Editor | master-detail Enemy Lab editor (Krok 2 M) s revizemi dle H |
| Preview | immutable snapshot, stale/respawn workflow (Krok 2 N + H) |
| Migrace | adapter legacy grafů + konverze built-in contentu na schema v1 |

**MVP neobsahuje (odloženo, aditivní rozšíření):** burst/radial/spread-nové/charge combat controllery; `fixedAngle`, `atPlayerOffset`, delayed/predictive targeting; `speedLimit`, `evadeAxis`, waypoint/stopAndGo movement; `spawnEnemy`/VFX/sound/fireOnce akce; `shotsFired`/`spawnedChildren`/`chance` conditions; `enterPolicy: preserveIfCompatible`; složené podmínky; blend FSM×groups; hot-reload; undo/redo; projectile spawn event refactor (F-06 — samostatný maintenance úkol); mazání mrtvých AI prototypů (samostatný maintenance úkol).

---

## H. Preview and editor implications (jen změny z revize)

Preview model z Kroku 2 N **potvrzen**: draft oddělen od built-in/user; Preview = validovaný immutable snapshot pod klíčem `__draft`; nový spawn používá snapshot; změna draftu běžící entitu nemění; po změně badge „Preview zastaralé" + Respawn/Kill; invalid draft nelze spawnout; zavření editoru odstraní draft registraci a preview entitu — **neuloženy preset se nikdy automaticky nepropíše do user storage** (dirty draft přežívá jen v sessionStorage zrcadle jako recovery, ne jako save).

Revize:
- Movement sekce editoru: kontextový badge pro group-controlled scénář (B-03); preview spawnuje jednotlivce, takže movement editace je v preview vždy účinná — badge se týká group spawn panelu.
- Combat sekce: pole `runtimePolicy` (select reset/preserveIfSameProfile) viditelné jen u `mode: "profile"`.
- Lifecycle sekce: jen seznam enterActions s jedinou nabízenou akcí `despawn` (UI zůstává seznam kvůli budoucím akcím).
- Param inputy: clamp na commit, zobrazená hodnota vždy == draft hodnota (B-10).
- Validation panel: tři severity (error/warning/normalized), normalized s „původní → nová" hodnotou.
- Movement runtime „preserve" volby v UI neexistují (B-05).

---

## I. Revised migration plan

1. **Adapter (in-memory), S2:** `migrateLegacyGraph()` převádí dnešní `behaviorGraphs.json` shape → `FsmPreset` v1. Mapování: `movementPresetId` → expanze přes `EnemyBehaviorPresets` na `movement.base` (plné params, defaulty z descriptorů); `attackProfileId` přítomen → `combat: { mode: "profile", profileId }` (runtimePolicy default reset — paritní, B-06); nepřítomen → `{ mode: "inherit" }` (zachovává dnešní def-level fallback, žádná změna chování); legacy state name → `id` i `label`; transitions 1:1 v pořadí (first-match); `xLessThan` → `screenXBelow`; `offscreen` dostane explicitní `marginPx: 96`.
2. **Prázdné stavy (`"despawn": {}`):** behavior-preserving — movement zkopírován z předchůdce, **žádná despawn akce** (enemy odjíždí do cull bandu jako dnes). Pozn. k paritě: kopie movementu znamená nový entry (re-anchor) — pro lineární movementy (`straight.*`, `diagonal.*`) bitově identická trajektorie (konstantní rychlost je invariantní vůči re-anchoru); pro `sine.evade` (`fsm.hover` retreat→despawn) se resetuje fáze po vstupu do despawn stavu — entita je v tom okamžiku už offscreen (podmínka vstupu) a rozdíl ovlivní jen přesný tick cullnutí. Paritní kritérium: shodná sekvence stavů + shodné trajektorie do vstupu do migrovaného prázdného stavu + cull do N ticků poté.
3. **Zánik `fsmAppliedMovementPresetId`:** enter/re-entry řídí identita stavu; `resetMovementOnReenter: false` pojistka z Kroku 2 **zrušena** (B-05) — v 10 built-in grafech po sobě nejdou dva stavy se stejným presetem (audit), jediný případ „pokračování" jsou prázdné stavy řešené bodem 2.
4. **Časová sémantika:** migrace **nemění** hodnoty `seconds` — přijatý −1 tick posun (B-08) platí i pro built-in grafy; paritní testy s ním počítají.
5. **Konverze contentu (S7):** `behaviorGraphs.json` se přepíše do schema v1 (`schemaVersion: 1`), prázdné jmenné `despawn` stavy nahradí explicitní terminální stavy (`enterActions: [despawn]` + `offscreen` transition, kde odpovídá dnešnímu cull chování; u `fsm.charge` zůstane dojezd movementem, aby enemy nemizel na obrazovce). Vizuální kontrola přes existující spawn panel (FSM typy jsou spawnovatelné bez editoru). Adapter poté zůstává jen jako detekce legacy shape (`initial` bez `schemaVersion`) pro případné externí soubory; interní content už ho nepoužívá.
6. **Enemy typ binding:** `enemyTypes.json.behaviorGraphId` beze změny (interně mapováno na preset klíč) — žádná migrace enemy typů.
7. **Ne-FSM enemy:** legacy větev (`behaviorPresetId` → `EnemyBehaviorDB`) nedotčena celou roadmapou.

---

## J. Revised Codex sessions

Validace každé session minimálně: `npm run typecheck`, `npm run build`, uvedené smoky přímo přes `npx tsx`; `npm run smoke` s vědomím pre-existing BombExplosionChain failure (AGENTS §8) — nové smoky registrovat PŘED něj.

| # | Session | Cíl | Závislosti | Dotčené moduly | Non-goals | Acceptance criteria | Rizika |
|---|---|---|---|---|---|---|---|
| S1 | `feat(fsm): target schema, descriptors, validation` | Typy z C, ParamSpec descriptory (11 bases, 2 modifiery, 2 targeting, 5 conditions, despawn akce), `validate.ts` se 4 vrstvami vč. cycle klasifikace (F-2) a normalization (F-3), `defineMovementBase` helpery s dev asserty | — | `fsm/FsmTypes`, `catalog/*` (descriptory + define helpery, bez runtime přepojení), `fsm/validate` + `FsmValidate.smoke` | žádné runtime změny, žádné UI | typecheck+build zelené; smoke pokrývá: dangling→E, duplicate id→E, unknown type→E, immediate cycle→E, timeless cycle→W, časovaný cyklus→bez issue, mimo rozsah→normalized s original/normalized, valid preset→ok; hra beze změny chování | nízké — aditivní |
| S2 | `feat(fsm): built-in migration + resolved registry` | `migrate.ts` (I-1, I-2), `FsmPresetRegistry` (built-in vrstva, resolve s deep-freeze, `failFast` politika F-4), zapojení do `loadContent`; runtime dál čte staré `BEHAVIOR_GRAPHS` | S1 | `fsm/migrate`, `fsm/FsmPresetRegistry`, `content/loadContent`, `content/CONTENT` + `FsmMigrate.smoke`, `FsmBuiltinContent.smoke` | žádná nová lifecycle logika, žádné přepojení EnemySystem | 10/10 grafů migruje s 0 errors; registr resolvable; dev failFast throw ověřen na záměrně rozbitém fixture; hra beze změny | nesoulad legacy shape — kryto smoke |
| S3 | `refactor(fsm): runtime snapshot + graph resolution` | Per-entity snapshot (`ent.fsmRuntime.preset` při spawnu), odstranění per-tick lookupu `BEHAVIOR_GRAPHS[graphId]` (`EnemySystem.ts:126-129`) a per-tick `ensureFsm` alokace (F-18); **transitions běží přes resolved reprezentaci s LEGACY sémantikou age** (bitová parita); zlatý otisk zachycen PŘED změnou | S2 | `systems/EnemySystem` (jen FSM větev), `systems/SpawnSystem`, `fsm/FsmRuntime` (transitions část) + `FsmRuntimeParity.smoke`, `FsmDeterminism.smoke` | žádná nová entry sémantika, žádné combat modes, žádná kompozice | parita: 3+ grafy bitově shodné trajektorie a časy přechodů vs. otisk; determinismus 2 běhů; multi-entity test (5 entit nezávislé runtime); ne-FSM enemy nedotčeni | **rizikové** — malý diff, legacy větev neměnit |
| S4 | `feat(fsm): state entry, runtime reset, combat modes` | Sémantika E-1/E-2/E-3 (nová age logika, vždy-reset movement, combat disabled/inherit/profile + runtimePolicy), zánik `applyStateBehavior` + `fsmAppliedMovementPresetId` + mrtvých logů (F-05); base moduly voláné přes adaptér nad stávajícím `EnemyBehaviorDB` (plná adaptace signatur až S5) | S3 | `fsm/FsmRuntime`, `systems/EnemySystem`, `enemies/runtime/moduleState` + `FsmLifecycle.smoke`, `FsmCombatModes.smoke`, aktualizace parity otisků (−1 tick na timeInState, dokumentováno v testu) | movement modifiery, nové akce | E-3 příklady jako testy (přesné ticky); combat tabulka E-2 kompletně pokryta (disabled tichý i s def profilem; inherit střílí; preserveIfSameProfile drží cooldown); self-transition re-fire; parity s dokumentovaným posunem | změna sémantiky — největší testová hustota |
| S5 | `feat(fsm): movement composition + cull capability` | `MovementResolver` (D kroky 2a–2d), adaptace 11 primitiv na `(state, config)` signatury, `sineOffset` + `clampY`, group suspenze (B-01/B-02), `cullReference` capability + smazání `EnemyCullReference.ts` | S4 | `enemies/runtime/MovementResolver`, `catalog/movementBases+movementModifiers`, `systems/EnemySystem` (cull řádky), `enemies/EnemyGroups` (cull ref volání) + `MovementComposition.smoke`, `FsmGroupSuspend.smoke` | targeting/combat změny | kompozice: analytická shoda straight+sineOffset; pořadí modifierů mění výsledek; 0 modifierů == čistý base bitově; group člen: vel == cohesion výpočet a base.update se nevolá (spy/counter); cull parita sine/loop/orbit (`EnemyCulling.smoke` zelený); parity smoke zelený | adaptace signatur — mechanická, krytá paritou |
| S6 | `feat(fsm): explicit despawn lifecycle` | `enterActions` exekuce v FsmRuntime, akce `despawn` (markKill→Cleanup), terminal validace (transitions po despawn = W), runtime ochrana proti re-fire (akce právě 1× na vstup) | S4 | `fsm/FsmRuntime`, `fsm/validate` (W_TRANSITIONS_AFTER_DESPAWN) + `FsmDespawn.smoke` | jiné akce, content konverze | despawn v ticku vstupu: pendingKill=true, movement/combat se nevykoná, slot mrtvý po cleanup; self-transition s despawn = 1 kill; validace W | nízké |
| S7 | `content(fsm): built-in conversion to schema v1` | Přepis `behaviorGraphs.json` na v1 (I-5): explicitní terminály, konec jmenné konvence; adapter zůstává jen pro legacy-shape detekci | S6 (+S5 kvůli plné exekuci) | `content/behaviorGraphs.json`, `fsm/migrate` (detekce), parity otisky | UI, gameplay tuning | validate 0 errors + failFast boot projde; parity: sekvence stavů shodná, dokumentované diffy (terminal despawn vs. cull) vizuálně ověřeny spawnem FSM typů z existujícího panelu; `FsmBuiltinContent.smoke` zelený | jediná session měnící pozorovatelné chování — malý popsaný diff |
| S8 | `feat(fsm): user preset store + import/export` | `UserPresetStore` (blob `cm.fsm.user.v1`, backup, corrupt→rename, quota fail hláška), import s normalization reportem (F-3), export single/bundle; `src/dev` do tsconfig include | S1 (registry napojení S2) | `enemies/store/UserPresetStore`, `fsm/FsmPresetRegistry` (user vrstva), tsconfig + `FsmSerialization.smoke` | UI | roundtrip preset i bundle; import kolize ID → suffix; import s E → odmítnut celý; import s normalized → opravené hodnoty + report; corrupt blob přejmenován, start prázdný; mock-storage quota fail bez pádu | tsconfig rozšíření může odkrýt chyby v src/dev — opravit jen blokující |
| S9 | `feat(dev): Enemy Lab editor foundation` | `src/dev/enemylab/`: EditorStore (čisté `applyEdit`), PresetToolbar, built-in/user/draft rozlišení, explicit save, dirty state + sessionStorage recovery, create/duplicate/delete/rename meta; **žádný autosave** | S8 | `dev/enemylab/*`, `dev/DevSummoner` (mount + zeštíhlení) | state editace, preview | build zelený; UI scénáře: duplicate built-in→user kopie, built-in read-only, save/reload persistence, delete s potvrzením; spawn panel beze změny chování | objem UI kódu — malé moduly |
| S10 | `feat(dev): state, movement and combat editor` | StateList (stable ID, rename=label, initial state), StateDetail: movement base+modifier editor, targeting, combat modes + runtimePolicy, metadata-driven inputy (clamp-on-commit B-10), ValidationPanel s fokusem přes `location`; group badge (B-03); FSM-typ spawn hint (F-20) | S9 | `dev/enemylab/*` | transitions UI, preview | UI scénáře: create/duplicate/remove state, rename nemění `to` (ověřeno exportem), invalid hodnota→error+Save blokován, normalized report při importu zobrazen | UX iterace — scope na funkčnost |
| S11 | `feat(dev): transitions, lifecycle and preview editor` | TransitionsEditor (condition editor, target select, reorder), lifecycle sekce (despawn), preview workflow: `fsmPresetKey` v SPAWN_ENEMY payloadu, `registerDraft`/`unregisterDraft`, snapshot capture v SpawnSystem, Spawn/Respawn/Kill, stale badge, zavření editoru = úklid | S10 (payload část technicky po S3) | `dev/enemylab/*`, `engine/core/events` (+1 volitelné pole), `systems/SpawnSystem`, `fsm/FsmPresetRegistry` | hot-reload, group preview režimy | preview scénáře: invalid draft→spawn disabled; změna draftu→stale badge, běžící entita beze změny; respawn→nové chování; zavření→draft pryč + entita killed; determinismus smoke zelený | zásah do events.ts — aditivní pole |
| S12 | `test(fsm)+docs: focused stabilization` | Integrační smoke průchod (preset→save→load→spawn→transitions→despawn), registrace všech FSM smoků do `runSmokes.ts`, dokumentace cílového schema (docs/), AGENTS §6 aktualizace zdrojů, cleanup POUZE nového FSM kódu | vše | `smoke/runSmokes`, `docs/`, AGENTS | **ne**: mazání ai/controller prototypů, projectile event refactor, nesouvisející dev UI opravy (samostatné maintenance úkoly) | `npm run smoke` selže pouze na pre-existing BombExplosionChain; docs odpovídají kódu; žádný TODO v novém FSM kódu bez odkazu | nízké |

Princip pořadí zachován: schema+validace (S1) → resolved runtime (S2–S3) → lifecycle+kompozice (S4–S6) → kanonický content (S7) → persistence (S8) → editor (S9–S11) → stabilizace (S12). Slučovat lze S6 do S4 (pokud S4 vyjde malá) a S9 s S10 (pokud foundation bude tenká); neslučovat S3 a S4 (parita vs. změna sémantiky musí být oddělené commity) a S7 vždy samostatně (content diff).

---

## K. Remaining open questions

1. **Má preview enemy žít v normální hře (kolize, damage, skóre)?** Nelze odvodit z kódu, čistě produktová volba. *Výchozí doporučení:* ano, normální hra (nulová dodatečná složitost; skóre dopad v dev kontextu bezvýznamný); „ghost" režim případně později.
2. **Blokují warnings Save?** *Výchozí doporučení:* ne — Save blokují jen errors; warnings a normalized jsou informativní (jinak by W_TIMELESS_CYCLE bránil legitimním návrhům).
3. **Má se po S7 přejmenovat `behaviorGraphs.json` (např. `fsmPresets.json`)?** Kosmetika vs. kanonické názvy v AGENTS §6. *Výchozí doporučení:* ponechat název, změnit obsah — méně dotčených míst; případný rename až se změnou AGENTS v S12.
4. **Kompenzovat −1 tick posun `timeInState` úpravou hodnot v S7 konverzi (např. 5.0 → 5.0166)?** *Výchozí doporučení:* ne — hodnoty nechat s autorským významem, posun je fix off-by-one, ne regrese; paritní testy ho dokumentují.

---

## Finální kontrola (odpovědi na §17 zadání)

- **FSM movement u group-controlled enemy:** neaktivní — MovementResolver se nevolá, vel vlastní výhradně cohesion; FSM dál řídí transitions/targeting/combat/lifecycle (B-01, D krok 2a).
- **Nový movement runtime state vzniká:** při každém skutečném vstupu do stavu — jiný stav, návrat, self-transition, stejný module type (E-1).
- **Self-transition:** plný enter — nové module states, enterActions znovu, age=0, combat dle runtimePolicy (default reset) (E-1, E-2, E-3).
- **Combat reset:** vždy kromě jediné výjimky; **zachování možné jen** explicitním `preserveIfSameProfile` mezi stavy se stejným profileId (E-2).
- **Age se zvyšuje:** o dt po vykonání stavu v daném ticku, včetně entry ticku; na začátku ticku age = čas před tímto tickem (E-3).
- **Nový state po přechodu se vykoná:** tentýž tick (movement/targeting/combat); po prvním vykonání age = dt (E-3).
- **Hard error u cyklů:** cyklus složený výhradně z guaranteed-immediate hran (`timeInState ≤ 0`); timeless cykly = warning; časované cykly validní (F-2).
- **Hodnota mimo rozsah:** editor = error + blokovaný Save (zobrazená == uložená); import = explicitní normalizace s reportem a přepsanou hodnotou; runtime nikdy tiše neclampuje (F-3).
- **Invalid built-in vs. user:** built-in = dev/CI fail-fast, prod fail-soft s log-once; user/import = nikdy pád, odmítnutí nebo invalid badge s konkrétními issues (F-4).
- **Typová nejistota registru:** izolována v `define*` helperech a resolveru; resolved reprezentace nese přímé module reference + validované configy, žádný per-tick string dispatch (C, B-14).
- **MVP:** přesný výčet v G (11 bases, 2 modifiery, 2 targeting, 3 combat modes, 5 conditions, despawn, store, editor, preview).
- **Built-in konverze:** S7 — po lifecycle (S6), před plným UI (S9+); vizuální kontrola přes existující spawn panel (J, I-5).
- **Editor začíná:** S9 (foundation), po persistence vrstvě S8 (J).
- **Preview po změně draftu:** běžící entita beze změny (immutable snapshot), badge „stale", uživatel dá Respawn; invalid draft nelze spawnout; zavření editoru uklidí draft i preview entitu bez zápisu do storage (H).

---

**Potvrzení stavu session:** Návrh byl pouze revidován — žádné změny zdrojového kódu projektu, žádný commit ani PR v rámci návrhové práce; jediným výstupem je tento dokument (`FSM_architecture_final.md`), exportovaný dle explicitního pokynu zadání vedle `fsm-audit.md` a `FSM_architecture_proposal.md`. Working tree před exportem: čistý (HEAD `403aa4a`).
