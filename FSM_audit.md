# FABLE — FSM ARCHITECTURE, KROK 1: AUDIT SOUČASNÉHO STAVU

## A. Executive summary

Současná FSM je **minimalistická, data-driven vrstva nad staršími „behavior presety"**. Graf (JSON) = pojmenované stavy, každý stav odkazuje na max. 1 movement preset + max. 1 attack profile a má seznam transitions (4 druhy triggerů). Runtime je jediná čistá funkce `updateFsm()` (~25 řádků logiky) volaná z `EnemySystem` uvnitř Simulation fáze; stav se ukládá přímo na entitu (`ent.fsm = {current, age}`).

**Co reálně umí (Confirmed):** lineární stavové řetězce (enter → attack/hold → retreat → „despawn"), přepínání movement presetu a attack profilu podle stavu, 4 trigger druhy (`timeInState`, `hpBelow`, `xLessThan`, `offscreen`), max. 1 přechod za tick, first-match priorita. 10 built-in grafů, 26 movement presetů nad 11 primitivy, 5 attack profilů (single/aimed/spread).

**Zralost:** Runtime jádro je malé, deterministické a zdravé. Chybí ale jakákoli validace grafů (načítají se raw `as` castem), lifecycle hooky (onEnter/onExit), sémantika terminálního stavu a testy FSM runtime. **UI není editor** — Enemy Lab (DevSummoner) je pouze spawn panel + read-only debug náhled běžícího FSM. Grafy lze měnit jen ruční editací JSON.

**5 nejdůležitějších zjištění:**
1. `behaviorGraphs.json` se načítá **bez jakékoliv strukturální validace** — dangling `goto`, chybějící `initial` i neexistující preset/profil ID projdou tiše (H/F-01, F-02).
2. Stav `despawn` je **jen jmenná konvence** — žádný kód ho neinterpretuje; odstranění entity zajišťuje až horizontální culling v `EnemySystem` (F-03).
3. Enemy Lab umožňuje jen spawn a pozorování; **neexistuje žádná editace states/transitions/parametrů** a UI si buduje vlastní taxonomii z prefixů preset ID (F-09, F-20).
4. FSM nemá žádné testy runtime přechodů; jediný FSM-related test ověřuje pouze existenci ID v contentu a není v `npm run smoke` seznamu (F-11).
5. Attack profil na úrovni enemy typu **nelze stavem vypnout** (`fsmAttackProfile ?? def.attackProfile`) — latentní past pro budoucí grafy (F-04).

---

## B. Repository state

| Položka | Hodnota |
|---|---|
| Repo | `/home/user/MGoD` (origin `catsystemexe/MGoD`) |
| Lokální branch | `claude/fable-fsm-audit-step1-qbcgus` — **syntetický název session**; HEAD je identický s `origin/work` |
| HEAD | `0a1a590` „Merge pull request #63 … gamepad support" = `origin/work` (Confirmed) |
| Working tree | **čistý na začátku i na konci** (`git status --porcelain` prázdný; vytvořeny jen gitignored `node_modules`, `dist`) |
| AGENTS.md | plně aplikováno: audit-only režim (§17), validační matice (§13–14), známé selhání smoke (§8), FSM/behavior kontrakty (§6, §7.11) |

**Spuštěné ověřovací příkazy:**

- ✅ `npm run typecheck` — OK (pozn.: nepokrývá `src/dev`, `src/ui`, `src/render`, `src/audio`, `*.smoke.ts` — viz `tsconfig.json` include)
- ✅ `npm run test` — `EnemySpriteSelection` smoke OK
- ✅ `npm run build` — Vite build OK
- ❌ `npm run smoke` — selhal na `BombExplosionChain.smoke.ts` / `DamageSystem.rules.onExplosion` — **přesně známé pre-existující selhání dokumentované v AGENTS.md §8, nesouvisí s FSM**. Runner se zastaví, takže pozdější smoky v seznamu (vč. `EnemyGroups`) v rámci suite neproběhly.
- ✅ přímo: `npx tsx src/game/enemies/MovementPresetNormalization.smoke.ts` — OK
- ✅ přímo: `npx tsx src/game/enemies/EnemyGroups.smoke.ts` — OK
- `lint` skript v projektu neexistuje.

---

## C. Mapa souborů a odpovědností

| Soubor / modul | Odpovědnost | Klíčové symboly | Vazby |
|---|---|---|---|
| `src/game/enemies/fsm/FsmTypes.ts` | Typy FSM | `BehaviorGraph`, `BehaviorState`, `Transition`, `Trigger`, `FsmState` | konzumuje `EnemySystem`, `loadContent`, `CONTENT` |
| `src/game/enemies/fsm/FsmController.ts` | Runtime vyhodnocení | `updateFsm`, `evalTrigger`, `ensureFsm`, `getState` | volá jen `EnemySystem.ts:131` |
| `src/game/content/behaviorGraphs.json` | 10 built-in grafů | `fsm.turret` … `fsm.smart_orbit_repeat` | referencováno z `enemyTypes.json.behaviorGraphId` |
| `src/game/content/behaviorPresets.json` | 26 movement presetů | `straight.basic`, `smart.track.soft`… | → `EnemyBehaviorPresets` |
| `src/game/content/attackProfiles.json` | 5 attack profilů | `single_basic`, `spread_test_*`… | → `EnemyDefs.getAttackProfile`, `AttackController` |
| `src/game/content/enemyTypes.json` | 21 enemy typů (10 s grafem) | `fsm_turret`… | → `ENEMY_DEFS` |
| `src/game/content/loadContent.ts` | Validace + cross-ref contentu | `loadContent`, `validateBehaviorPresets` | **grafy nevaliduje strukturálně** (ř. 85) |
| `src/game/content/CONTENT.ts` | Content singleton | `CONTENT`, `BEHAVIOR_GRAPHS` (raw cast) | duální export grafů |
| `src/game/enemies/EnemyBehaviorTypes.ts` | Kontrakt Behavior V1 | `EnemyBehaviorId` union, `ENEMY_BEHAVIOR_IDS`, `isEnemyBehaviorId`, `EnemyBehavior` | „single source of truth" pro primitive IDs |
| `src/game/enemies/EnemyBehaviorDB.ts` | Registr 11 primitiv | `EnemyBehaviorDB` | statický importní registr |
| `src/game/enemies/EnemyBehaviorPresets.ts` | Preset DB z contentu | `EnemyBehaviorPresets` (IIFE) | fallback `none.hold` |
| `src/game/enemies/behaviors/*.ts` | 11 movement primitiv | `init/update/getTarget` | čisté, target-based |
| `src/game/enemies/AttackController.ts` | Data-driven střelba | `updateAttack`, `spawnEnemyProjectile`, `AttackProfileDef` | **přímý `store.spawn`** |
| `src/game/systems/EnemySystem.ts` | Orchestrace enemy ticku | `EnemySystem.update`, `applyStateBehavior` | jediné místo integrace FSM |
| `src/game/systems/SpawnSystem.ts` | Materializace entit | `spawnEnemy` | FSM **neinicializuje** (lazy) |
| `src/game/enemies/EnemyGroups.ts` | Skupiny/formace | `EnemyGroupRegistry`, `applyMemberCohesion` | přepisuje `vel` po behavioru |
| `src/game/enemies/EnemyCullReference.ts` | Cull reference X | `resolveMovementCullReferenceX` | hardcoded per-behavior větve |
| `src/dev/DevSummoner.ts` | Enemy Lab (dev UI) | `DevSummoner`, `renderFsmGraphView`, `getFsmRuntimeDebug`, `buildMovementGroups` | čte `window.__CM.store`; mimo typecheck |
| `src/game/enemies/ai/*`, `controller/*`, `data/behaviors.mvp.json` | **mrtvý prototyp** AI overlay | `AiDB`, `resolveVel` | 0 importů mimo vlastní adresář (Confirmed grep) |

---

## D. Současná architektura

### Konfigurační model (Confirmed)
- **Definice FSM** (`FsmTypes.ts:15-18`): `BehaviorGraph { initial: string; states: Record<string, BehaviorState> }`.
- **State** (`FsmTypes.ts:1-5`): `{ movementPresetId?; attackProfileId?; transitions? }` — nic víc. Žádné akce, žádné hooky, žádné vnořené parametry.
- **Transition** (`FsmTypes.ts:6-9`): `{ when: Trigger; goto: string }` — `goto` je nevalidovaný string.
- **Trigger** (`FsmTypes.ts:10-14`): discriminated union 4 druhů (viz katalog E).
- **Initial state**: pole `initial` grafu; použito při lazy initu (`ensureFsm`, `FsmController.ts:41-49`) a jako fallback pro neznámé state ID (`getState`, ř. 50-52).

### Runtime model (Confirmed)
- Runtime stav: `ent.fsm = { current: string, age: number }` — **vytvářen znovu každý tick** v `ensureFsm` (alokace + ztráta identity objektu; F-18).
- Změna stavu (`updateFsm`, `FsmController.ts:53-77`): projdi `transitions` aktuálního stavu **v pořadí pole**, první splněný trigger vyhraje → `current = goto`, `age = 0`, návrat. Bez přechodu `age += dt`.
  - **Max. 1 přechod za tick** (okamžitý return) — vícenásobný řetěz trvá N ticků.
  - **Priorita = pořadí v poli**; žádný jiný mechanismus.
  - **onEnter/onUpdate/onExit neexistují.** Jediný „enter side-effect" je `applyStateBehavior` v `EnemySystem.ts:29-52`: pokud se `movementPresetId` liší od naposledy aplikovaného (`e.fsmAppliedMovementPresetId`), přepne `behaviorId/behavior`, resetuje `bState = {t:0}` (zachová `bState.attack`), pro `none` vynuluje `vel`, zavolá `behavior.init(e)`.
  - **Časování**: pouze `age` (sekundy, akumulace fixed dt 1/60 — `Loop.ts:31`, `Time.ts:1`). Deterministické, FPS-nezávislé (fixed-step, MAX_STEPS=6 clamp).
  - **Eventy**: žádné — čistě polling podmínek.
  - **Náhodnost**: v FSM ani v behaviors žádná (`Math.random` jen v DEV logu SpawnSystem.ts:324, nemění simulaci; tie-breaky v `evade`/`range`/`orbitTarget` jsou deterministické přes `spawnOrdinal`). Confirmed grepem.
  - **Neplatný/chybějící state**: `getState` tiše fallbackne na stav `initial` (příp. `{}`), ale `fsm.current` zůstane neplatné ID — bez warningu (F-02).

### Execution flow FSM ↔ systémy
FSM **nespouští systémové akce přes eventy** — přímo mutuje entity fields (`fsm`, `behaviorId`, `behavior`, `bState`) a vybírá attack profil, který `AttackController` vykoná **přímým** `store.spawn` (obchází SPAWN_* intent chain; legacy výjimka vůči AGENTS §7.4). Movement vlastní `EnemySystem` (jediná integrace `pos += vel*dt`, `EnemySystem.ts:232-233`); behaviors vracejí pouze analytický target (kontrakt V1 dodržen ve všech 11 primitivech — Confirmed čtením).

---

## E. Katalog podporovaných prvků

### Transition conditions (Confirmed, `FsmController.ts:23-40`)

| Kind | Parametry | Jednotky/sémantika | Poznámka |
|---|---|---|---|
| `timeInState` | `seconds` | s; splněno při `age >= seconds` | `age` se nuluje při přechodu |
| `hpBelow` | `ratio` | podíl 0–1; striktní `<`; čte `hp`/`maxHp` (toleruje i `hp.value/hp.max`) | HP se mění v Impact fázi → reakce následující tick |
| `xLessThan` | `x` | **screen-space px**: `pos.x − scrollX < x` | v grafech hodnoty 650–760 |
| `offscreen` | `side: left\|right` | screen-space s **hardcoded marginem 96 px** | `FsmController.ts:18-22` |

Neznámý `kind` → `false` (bezpečný default).

### Movement primitivy (11; registr `EnemyBehaviorDB.ts`)

| ID | Kategorie | Parametry (defaulty v kódu) | Player-aware | Použití v presetech |
|---|---|---|---|---|
| `none` | hold | — (getTarget → null; vel zachována, FSM `none` nuluje) | ne | `none.hold` |
| `straight` | movement | `speedX`(0), `speedY`(40), volitelně `speedXStart/End`,`speedYStart/End`,`duration` (lerp) | ne | 6 presetů + diagonal.* |
| `sine` | movement | `speedX`,`speedY`(35),`ampX`(0),`ampY`(0),`freq`(0.8 Hz),`driftX`,`phaseStep`(0.35, fáze z `spawnOrdinal`) | ne | 5 presetů |
| `zigzag` | movement | `speedX`(−150),`speedY`,`ampY`(70),`period`(0.75 s, min 0.1) | ne | `zigzag.sharp` |
| `loop` | movement | `speedX`(−95),`speedY`,`radiusX/Y`(56),`duration`/`turns`/`angularSpeed`,`direction`,`repeat` | ne | `loop.single/.repeat` |
| `invaders` | movement (pack) | `speedX`,`speedY`(14),`ampX`(26),`freq`(0.55),`phaseStep` | ne | `invaders.pack` |
| `track` | targeting-movement | `speedX`(−110),`response`(2.4),`maxSpeedY`(70),`deadZoneY`(12),`offsetY` | ano (Y) | `smart.track.*` |
| `align` | targeting-movement | `speedX`(−70),`alignSpeedY`(130),`toleranceY`(8),`offsetY` | ano (Y) | `smart.align.attack` |
| `evade` | reactive | `speedX`(−115),`triggerBandY`(44),`evadeSpeedY`(150),`evadeDuration`(0.75),`cooldown`(0.45),`paddingY`(24, clamp na logicH) | ano | `smart.evade.axis` |
| `range` | targeting-movement | `preferredDistance`(180),`tolerance`(16),`response`(3),`maxSpeed`(120),`fallbackSpeedX/Y`,`targetOffsetX/Y` | ano (2D) | `smart.range.*` |
| `orbitTarget` | targeting-movement | `radiusX/Y`(96/72),`angularSpeed`(π),`arcRadians`(2π),`arcCenterAngle`,`direction`,`repeat`,`pingPong`,`radialResponse`,`maxRadialSpeed`,`centerResponse`,`maxCenterSpeed`,offsety,fallbacky | ano | `smart.orbit.*` |

Všechny: použitelné samostatně, **nekombinovatelné** (1 behavior na entitu), parametry netypované (`Record<string, any>`), jednotky px/s, s, Hz, rad — nikde nedokumentované. Serializace: OK (plain JSON). Testy: pouze normalizační smoke (obsah contentu), ne pohybová matematika.

### Combat / firing (`AttackController.ts`, Confirmed)

| Pattern | Chování | Parametry |
|---|---|---|
| `none` | nic | — |
| `single` | výstřel doleva (−x) | `fireRateMs`,`damage`,`projectileSpeed`,`projectileRadius`(4),`windupMs`,`onlyWhenVisible` |
| `aimed` | směr na hráče v okamžiku výstřelu | dtto |
| `spread` | vějíř kolem 180° | + `spreadCount`(3), `spreadAngleDeg`(30) |

Attack state (`bState.attack = {cooldownMs, windupMs, firing}`) **přežívá přechody FSM** (záměrně zachováván v `applyStateBehavior:38,43`). Projektil má hardcoded `ttl 4.0` a render (červený orb).

### Spawning / summoning, defensive, lifecycle actions
**Neexistují jako FSM prvky.** FSM neumí spawnovat, healovat, měnit HP, přehrát VFX ani explicitně despawnovat. Jediné „akce" stavu jsou movement preset + attack profil.

### Built-in grafy (10)
Všechny jsou lineární řetězy 3–5 stavů zakončené prázdným stavem `despawn`: `fsm.turret`, `fsm.hover`, `fsm.charge`, `fsm.zigzag`, `fsm.smart_tracker`, `fsm.smart_aligner` (jediný se 2 attack stavy v řetězu), `fsm.smart_evader`, `fsm.smart_ranger`, `fsm.smart_orbit_half`, `fsm.smart_orbit_repeat`. Používá je 10 enemy typů `fsm_*`; **žádná wave v `directorWaves.json` FSM typ nepoužívá** — FSM enemies jsou dosažitelné jen ručním spawnem z Enemy Lab (Confirmed grep enemyTypeId).

---

## Sekce 5 — Kompozice behaviorů (odpovědi)

- **Více behaviorů v jednom state:** ne. Přesně 1 movement + 0–1 attack.
- **Oddělení movement/targeting/combat:** movement a targeting jsou sloučené v primitivech (`track`/`range`/… si samy čtou `playerPos`); combat je oddělený (AttackController), ale míří nezávisle na movementu (aimed si počítá vlastní směr).
- **Zápis do stejné hodnoty / vlastnictví:** `pos` integruje výhradně `EnemySystem` (ř. 232-233); `vel` odvozuje `EnemySystem` z targetu, ale přepisují ji postupně: ① `applyStateBehavior` (nulování pro `none`), ② derivace z `getTarget`, ③ `applyMemberCohesion` skupin (kompletní přepis, `EnemyGroups.ts:219-250`), ④ failsafe `vel.y=40` (ř. 227-229). Poslední zapisující vyhrává — pořadí je implicitní pravidlo. `rotation`/`aim direction` jako koncepty neexistují; fire intent vlastní AttackController.
- **Pipeline/prioritizace:** ne, jen pevné pořadí kódu v `EnemySystem.update`.
- **Intent vs. přímá mutace:** behaviors vracejí intent (target) — dobré; FSM ale mutuje entitu přímo a attack spawnuje přímo.
- **Nevalidní kombinace:** nelze vytvořit z UI; ručně v JSON ano (graf odkazující na neexistující preset → tichý fallback `none.hold` v `applyStateBehavior:33`).
- **Přidání nového behavior typu bez centrálního switche:** částečně — dispatch je přes registry (`EnemyBehaviorDB`), ale je nutné editovat: union + `ENEMY_BEHAVIOR_IDS` (`EnemyBehaviorTypes.ts:17-70`), DB import (`EnemyBehaviorDB.ts`), případně **hardcoded větve v `EnemyCullReference.ts` (loop/sine/orbitTarget)** a UI seznam `KNOWN_PRIMITIVE_ORDER` (`DevSummoner.ts:98`). Stringové identifikátory všude (preset ID, graph ID, state name, profile ID).

---

## Sekce 6 — Napojení na enemy systém

| Vazba | Směr | Mechanismus | Explicitní? | Riziko |
|---|---|---|---|---|
| enemy definice → FSM | def→FSM | `ENEMY_DEFS[typeId].behaviorGraphId` čtený každý tick (`EnemySystem.ts:126-129`) | ano | nízké |
| SpawnSystem → FSM | žádná | spawn FSM **neinicializuje**; `ent.fsm` vzniká lazy při 1. ticku | skrytá | preset z payloadu je 1. tick platný, pak přepsán FSM (UX past F-20) |
| Director/waves → FSM | žádná | waves posílají jen `behaviorPresetId`; graf jde vždy z typu | — | graf nelze per-wave přepnout |
| FSM → movement | FSM→ | výměna `behaviorId/behavior/bState` | ano | reset `bState` = ztráta kotvy |
| FSM → weapons | FSM→ | `fsmAttackProfile ?? def.attackProfile` (`EnemySystem.ts:236`) | ano | F-04: stav nemůže střelbu vypnout |
| FSM → projectile | nepřímo | AttackController přímý `store.spawn` v Simulation | skrytá (mimo SPAWN_* chain) | výjimka §7.4; projektil zpracován ProjectileSystem až další tick (pořadí v `createGame.ts:553-554`) |
| health/damage → FSM | ←FSM čte | `hpBelow` čte `hp/maxHp`; damage zapisuje `DamageSystem` (Impact) | ano | 1-tick latence (by design) |
| groups ↔ FSM | konflikt | cohesion přepíše `vel` **po** behavioru (`EnemySystem.ts:212`) | skrytá | FSM+group kombinace by pohyb FSM ignorovala (Likely; content ji dnes nevytváří) |
| lifecycle/despawn | žádná FSM vazba | cull podle `resolveMovementCullReferenceX` + xBand 160 px (`EnemySystem.ts:249-267`) | skrytá | „despawn" stav funguje jen díky tomu, že poslední movement jede doleva |
| animation/sprite, VFX, audio | žádná | FSM stav nijak neovlivňuje vzhled/zvuk | — | budoucí požadavek |
| AI overlay (`ai/`, `controller/`) | mrtvé | `aiWeight` smoothing běží (`EnemySystem.ts:113-123`), ale na `vel` nemá vliv; `resolveVel` 0 volajících | — | matoucí paralelní koncept |

---

## Sekce 7 — Runtime průchod jednoho enemy během ticku

Fáze ticku: Input → Director → **Simulation** → Collision → Impact → Flow → Audio → Cleanup (`Loop.ts:114-121`). Uvnitř Simulation (`createGame.ts:504-556`): respawn → pickups → player → worldScroll → weapon → directorPhase (emituje SPAWN_* přes `emitNext` = příští tick) → **SpawnSystem** (konzumuje SPAWN_* z minulého ticku) → ProjectileSystem → **EnemySystem** → particles.

V `EnemySystem.update` pro každou enemy (ř. 81-268):
1. sanitizace pos/vel, snapshot `posPrev`, hit-flash timer, AI-weight smoothing (bez efektu);
2. čtení `behaviorGraphId` z defu + `updateFsm` — **transitions se vyhodnocují nad stavem světa z konce minulého ticku** (pozice před pohybem, HP z minulé Impact fáze);
3. `applyStateBehavior` — nový stav působí **tentýž tick** (žádné 1-frame zpoždění na straně akcí);
4. behavior `update` + `getTarget` → `vel = (target − pos)/dt` (try/catch, crash → markKill);
5. group cohesion (případný přepis vel);
6. sanitizace, failsafe, **integrace pos**;
7. `updateAttack` — případný přímý spawn `enemyProjectile` (viditelný pro ProjectileSystem/Collision až další tick);
8. cull check → `markKill` (commit v Cleanup; dvoustupňové, bezpečné vůči iteraci).

**Determinismus:** Confirmed na úrovni statické analýzy — fixed dt, žádná náhodnost v cestě FSM/behavior, fáze deterministické. FPS-nezávislost: ano (fixed-step akumulátor). **Hot-path alokace (relevantní pro škálování FSM):** `ensureFsm` tvoří nový objekt každý tick (`FsmController.ts:44`), `behaviorCtx` spread `{...ctx}` na enemy/tick (`EnemySystem.ts:187-192`), `getTarget` vrací nové objekty, `FsmUpdateResult` nový objekt/tick. Dnes neškodné, při stovkách entit měřitelné (Likely).

---

## F. UI audit (Enemy Lab / DevSummoner)

**Workflow (Confirmed):** panel vpravo nahoře; Spawn Mode Single/Group → výběr Type (všech 21 typů) → Movement class Dumb/Smart → Primitive → Preset → Y slider → RELEASE (emituje `SPAWN_ENEMY`/`SPAWN_ENEMY_GROUP` přes `emitNext`). Pod tím read-only „lab" blok: pro poslední ručně spawnutou FSM enemy zobrazuje Type/Beh/Atk/HP/State/Age + pozice + výpis celého grafu (aktivní stav ▶, mov/atk/next na stav). Refresh polling 250 ms přes `window.__CM.store` (`DevSummoner.ts:1042,1079-1092`).

**Editor state:** žádný trvalý — jen lokální proměnné v closure `init()`. **Vytváření states, přidávání behaviorů do stavů, editace parametrů, definice transitions, výběr initial state: neexistuje.** Konfigurace se do runtime dostává výhradně z JSON contentu při buildu (statický import). Živé změny: ne. Preview: jen textový výpis grafu. Validace: pouze spawn payload (`createDevSummonerGroupSpawnPayload`, ř. 470-495); grafy nevaliduje nic. Smazání používaného state / neplatné reference: UI je nemůže způsobit (needituje), JSON ano.

**Typový model:** UI čte stejné runtime objekty (`ENEMY_DEFS`, `EnemyBehaviorPresets`, `BEHAVIOR_GRAPHS`) — žádné duplicitní mapování dat, ale **duplicitní taxonomie**: třída „dumb/smart" = prefix `smart.` v preset ID; „primitive" = první segment ID (`getPrimitiveFromPresetId`, ř. 386-389) → vzniká UI pojem `diagonal` a `orbit`, které jako behaviorId neexistují (`straight`, `orbitTarget`); pořadí v `KNOWN_PRIMITIVE_ORDER` (ř. 98) je ručně udržovaný seznam.

**UX problémy (Confirmed):**
- Pro FSM typy je zvolený Movement preset **fakticky ignorován** — FSM ho 1. tick přepíše initial stavem; UI to nijak nesignalizuje (F-20).
- Chybí jednotky, rozsahy a nápověda u movement presetů (vidíte jen ID); parametry presetů nejsou vidět vůbec.
- Debug výpis odhaluje interní ID (preset/profile stringy).
- `src/dev` není v typecheck include — chyby v UI odhalí až build/runtime.
- Přehledné naopak: graf-view s aktivním stavem, group parametry mají limity + steppery (dobrý vzor: `ENEMY_GROUP_PARAM_LIMITS`).

---

## G. Persistence audit

- **Serializovatelnost:** konfigurační model (grafy, presety, profily, typy) je čistý JSON — žádné funkce, class instance, Map/Set (Confirmed). Runtime-only data (`ent.fsm`, `bState`) žijí odděleně na entitě — dobrý základ.
- **Schema/verze:** neexistuje žádná `schemaVersion`, žádné migrace.
- **Identifikátory:** state names jsou zároveň reference (`goto`) — **přejmenování state rozbije transitions tiše** (žádná validace `goto`; F-01/F-02). Preset/profile ID jsou stabilní stringy, validace existuje jen částečně (presety ano — `loadContent.ts:50-60` + cross-ref typů; grafy interně ne).
- **Built-in presety:** ano, v `src/game/content/*.json`, bundlované do buildu. **User-created konfigurace, localStorage, import/export: neexistují** (localStorage používá jen `BgLabUI` pro pozadí — Confirmed grep).
- **Neznámý behaviorId:** v presetech → hard fail loadu (assert); v runtime fallback na `none` s warningem (dvojitá ochrana). Neznámý graf tvar → žádná detekce.
- **Překážky pro user presety (dnes):** ① není kam ukládat (žádná persistence vrstva), ② není editor, ③ není strukturální validátor grafu (nutný pro bezpečný load cizích dat), ④ chybí schema verze pro budoucí migrace, ⑤ content je statický import — runtime nelze doplnit nový graf bez rebuild (`CONTENT` je modul-level IIFE), ⑥ jmenné reference stavů bez ID činí rename/duplikaci křehkou.

---

## H. Zjištěné problémy

| ID | Závažnost | Typ | Důkaz | Chování / dopad | Jistota |
|---|---|---|---|---|---|
| F-01 | **high** | typing/persistence | `CONTENT.ts:6`, `loadContent.ts:85` (raw `as` cast) | grafy bez strukturální validace: chybějící `initial`, dangling `goto`, neznámé preset/profile ID v grafu projdou tiše; blokuje bezpečný save/load | confirmed |
| F-02 | medium | bug | `FsmController.ts:50-52` | dangling `goto`: `fsm.current` = neplatné ID, chování tiše spadne na initial stav, bez warningu | confirmed (staticky) |
| F-03 | medium | architecture | `behaviorGraphs.json` (`"despawn": {}`), grep `despawn` = 0 v kódu | terminální stav nemá sémantiku; odstranění závisí na tom, že poslední movement odjede doleva do cull bandu | confirmed |
| F-04 | medium | coupling | `EnemySystem.ts:236` | stav bez `attackProfileId` nemůže potlačit def-level `attackProfile`; latentní (žádný FSM typ dnes def-level profil nemá) | confirmed (latentní) |
| F-05 | low | debt | `EnemySystem.ts:139-165` | 2× duplikovaný console.log pro neexistující `typeId "turret_fsm_test"` — mrtvý debug v hot path | confirmed |
| F-06 | medium | architecture | `AttackController.ts:46-58` | enemy projektily přes přímý `store.spawn` v Simulation, mimo SPAWN_* intent chain (§7.4); spawn probíhá během `debugForEachAlive` iterace | confirmed; bezpečnost iterace: uncertain |
| F-07 | medium | typing | `FsmTypes.ts:24` (`ent: any`), `EnemyBehaviorTypes.ts:31` | parametry behaviorů `Record<string, any>`, entita `any` — žádná typová kontrola parametrů per primitiv | confirmed |
| F-08 | low | debt | `behaviors/*.ts` vs `behaviorUtils.ts`/`smartContext.ts` | `num()`/`clamp()` definovány 6×; defaulty parametrů duplikovány mezi kódem a JSON presety | confirmed |
| F-09 | medium | UX/duplicita | `DevSummoner.ts:98, 386-389, 497-512` | UI taxonomie odvozená z konvence preset ID stringů; ruční pořadí; pojmy nesouhlasí s behaviorId | confirmed |
| F-10 | low | debt | `CONTENT.ts:5-6` + `loadContent.ts:4,85` | grafy exportovány dvěma cestami (`CONTENT.behaviorGraphs`, `BEHAVIOR_GRAPHS`); tentýž objekt, ale dvě API | confirmed |
| F-11 | medium | testing | `runSmokes.ts` (bez FSM), `MovementPresetNormalization.smoke.ts:554-683` | žádný test runtime přechodů/timingů/determinismu FSM; content test není v suite | confirmed |
| F-12 | low | architecture | fázový řád + `DamageSystem` (Impact) | `hpBelow` reaguje o 1 tick později než zásah; deterministické, ale nedokumentované | confirmed |
| F-13 | low | typing | `FsmController.ts:18-22, 33-34` | screen-space sémantika `xLessThan` a margin 96 px hardcoded, bez dokumentace/konfigurace | confirmed |
| F-14 | medium | architecture | `EnemySystem.ts:31` | de-dupe přes `fsmAppliedMovementPresetId`: přechod A→B se **stejným** presetem nere-inicializuje behavior (nepře-ukotví baseX/baseY) — chybějící onEnter sémantika | confirmed (staticky); záměr: uncertain |
| F-15 | low | debt | `ai/*`, `controller/*`, `data/behaviors.mvp.json`, `_patch/`, `_dump_invaders_before_fix.ts`, `src/smoke/runSmokes,ts`, `*.bak*` | mrtvý prototyp AI overlay (0 importů), nepoužitá data, artefakty v rootu, překlepový duplikát runneru | confirmed |
| F-16 | low | coupling | `EnemyCullReference.ts` | cull reference má hardcoded větve pro `loop/sine/orbitTarget`; nový behavior s cyklickým X musí tento soubor znát — skrytý kontrakt | confirmed |
| F-17 | low | perf | `EnemySystem.ts:187`, `FsmController.ts:44` | alokace v hot path (ctx spread, nový `ent.fsm` každý tick) — relevantní až při škálování | confirmed |
| F-18 | low | UX | `SpawnSystem.ts:348-352` + `EnemySystem.ts:169` | behaviorPresetId z UI/wave platí pro FSM typ jen do 1. ticku; matoucí interakce | confirmed |

---

## I. Reusable části

**Zdravé, lze zachovat/rozšířit (není nutné přepisovat):**
- `updateFsm` jádro — malé, čisté, deterministické; sémantika first-match + 1 přechod/tick je rozumný základ.
- **Behavior V1 kontrakt** (target-based, single integration authority v EnemySystem) — dodržený všemi 11 primitivy, dobře odděluje výpočet od aplikace pohybu.
- Content pipeline `loadContent` (assert + cross-ref vzor) — jen potřebuje rozšířit o grafy.
- `AttackController` datový model profilů (kromě přímého spawnu).
- `EnemyBehaviorDB`/`EnemyBehaviorPresets` registry + fallback `none.hold`.
- Vzor `ENEMY_GROUP_PARAM_LIMITS` (min/max/default/step per parametr) — hotová šablona pro budoucí popis parametrů behaviorů v UI.
- Fixed-step determinismus, dvoustupňový kill lifecycle, `emitNext` spawn routing.

## J. Rizikové oblasti pro budoucí změny

1. **`EnemySystem.update`** — monolitický blok, kde se potkává FSM, behavior, groups, failsafe, integrace, attack i culling; každé rozšíření FSM tudy projde. Implicitní pořadí zápisů do `vel`.
2. **`fsmAppliedMovementPresetId` de-dupe** — jakákoli budoucí onEnter/re-entry sémantika s ním koliduje (F-14).
3. **`fsmAttackProfile ?? def.attackProfile`** — přidání def-level profilu k FSM typu změní chování všech jeho stavů (F-04).
4. **`EnemyCullReference` + xBand 160 / offscreen 96** — tři nezávislé „okrajové" konstanty; nový movement pattern (např. orbit kolem hráče vpravo) může být falešně cullnut.
5. **Groups × FSM** — cohesion přepisuje vel po behavioru; kombinace zatím obsahem nevzniká, ale nic jí nebrání.
6. **UI string-taxonomie preset ID** — nové pojmenování presetů rozbije skupiny v Enemy Lab.
7. **Statický import contentu** — runtime editace/loading grafů vyžaduje změnu inicializace `CONTENT` (modul-level IIFE, stabilní reference dle §7.6).

## K. Otevřené otázky (vyžadují rozhodnutí mimo repozitář)

1. **Cíl editoru:** má být FSM editor runtime nástroj ve hře (živé úpravy běžících enemy), nebo authoring nástroj produkující content JSON? Ovlivňuje persistence, validaci i vztah k `CONTENT`. → produktové rozhodnutí uživatele.
2. **Cílové úložiště presetů:** localStorage vs. export/import souborů vs. commit do `src/game/content`. Ovlivňuje schema, migrace, validaci cizích dat. → uživatel.
3. **Rozsah akcí stavu:** mají stavy získat další action typy (spawn/summon, VFX, zvuk, explicitní despawn, změna vzhledu)? Určuje, zda zůstane model „preset+profil", nebo vznikne action list. → uživatel (návrhová session může doporučit).
4. **Sémantika terminálního stavu:** má `despawn` být explicitní akce (markKill / event), nebo zůstat konvencí? → návrhová session může doporučit, potvrdí uživatel.
5. **Náhodnost v trigger/behavior vrstvě:** budou potřeba pravděpodobnostní přechody? Pokud ano, je nutné rozhodnout injektovaný seedovaný RNG (dle §7.13). → návrhová session.
6. **Groups × FSM:** má FSM řídit skupinu (anchor), člena, nebo být kombinace zakázaná? → uživatel/produkt.
7. **Zpětná kompatibilita `behaviorPresetId` na typu:** zůstane jako fallback pro ne-FSM typy, nebo se vše migruje na grafy? → návrhová session může doporučit.

## L. Podklady pro Krok 2 (ověřená fakta a omezení)

1. FSM = `{initial, states{movementPresetId?, attackProfileId?, transitions[{when,goto}]}}`; runtime stav `{current, age}` na entitě; 1 přechod/tick, first-match, bez hooků, bez eventů, bez náhodnosti. (Confirmed)
2. 4 trigger druhy; jednotky: s, hp ratio 0–1, screen-px; offscreen margin 96 px hardcoded. (Confirmed)
3. 11 movement primitiv s netypovanými parametry; kontrakt V1: behavior nesmí psát pos/vel (AGENTS §7.11 — závazné i pro návrh). (Confirmed)
4. Attack: 4 patterny, stav přežívá přechody, spawn projektilů dnes přímý (legacy výjimka §7.4 — návrh nesmí kopírovat). (Confirmed)
5. Content: 4 JSON zdroje jsou kanonické (AGENTS §6); presety+typy validované, **grafy ne**; žádná schema verze, žádná user persistence, žádný import/export. (Confirmed)
6. UI: žádný editor — jen spawn + read-only debug; `src/dev` mimo typecheck. (Confirmed)
7. Simulace: fixed-step 60 Hz, fázový řád pevný (§7.2), SPAWN_* jen `emitNext`, kill jen `markKill`+cleanup. (Confirmed)
8. Testy: nulové pokrytí FSM runtime; smoke suite má známé selhání mimo FSM; `npm run test` je jediný sprite test. (Confirmed)
9. Mrtvé vrstvy k ignorování v návrhu: `ai/`, `controller/`, `behaviors.mvp.json`, `*.bak*`, `_patch/`. (Confirmed)
10. Předběžná poznámka (ne doporučení): model „stav = 1 preset + 1 profil" pravděpodobně nebude škálovat na kompozice; hranici vlastnictví `vel` (FSM vs. groups vs. failsafe) bude nutné v návrhu vyřešit explicitně; pro persistenci existují dvě zjevné cesty (validovaný content-JSON se schema verzí vs. oddělené user-preset úložiště), které je třeba porovnat v Kroku 2.

---

**Potvrzení:** Nebyly provedeny žádné změny souborů, žádný commit, žádná branch, žádný PR. Working tree je ve stejném (čistém) stavu jako na začátku auditu — ověřeno `git status --porcelain` na začátku i na konci (vytvořeny pouze gitignored `node_modules/` a `dist/` běžnou validací `npm ci` / `npm run build`).
