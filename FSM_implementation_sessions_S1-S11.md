# CAPTAIN MEOW — FSM IMPLEMENTATION SESSIONS S1–S11

## Status dokumentu

Tento dokument převádí schválený návrh `FSM_arch_final.md` do závazné implementační roadmapy pro Codex.

Dokument neurčuje neměnný přesný diff. Před zahájením každé session musí být její kapitola převedena do aktuálního operačního promptu podle skutečného HEAD, výsledku předchozích sessions a aktuální struktury repozitáře.

Architektonické kontrakty, pořadí závislostí, acceptance criteria a non-goals jsou závazné. Zásadní změna těchto bodů vyžaduje vědomé architektonické rozhodnutí, ne improvizaci během implementace.

Zdrojové dokumenty:

- `FSM_audit.md`
- `FSM_ arch_proposal.md`
- `FSM_arch_final.md`
- projektový `AGENTS.md`

---

# 0. Společná pravidla všech sessions

## 0.1 Pracovní režim

Každá session je jeden soustředěný implementační celek:

1. audit aktuálního repository state,
2. kontrola `AGENTS.md`,
3. ověření výsledku předchozí session,
4. implementace pouze daného scope,
5. typecheck, build a relevantní smoke testy,
6. kontrola diffu a working tree,
7. jeden commit,
8. jeden PR do aktuální FSM feature branche, pokud není výslovně určeno jinak,
9. handoff pro následující session.

Codex nesmí automaticky pokračovat do další session.

## 0.2 Povinný úvodní audit

Před změnami vždy ověřit:

```bash
pwd
find .. -name AGENTS.md -print
git status --short --branch
git branch -vv
git log -8 --oneline --decorate
git remote -v
```

Dále podle potřeby:

```bash
rg -n "BehaviorGraph|BehaviorState|FsmState|updateFsm|EnemyBehaviorDB|behaviorPresetId|attackProfileId|fsmRuntime|BEHAVIOR_GRAPHS" src
```

Pokud working tree není čistý:

- nic nerevertovat,
- nic nestashovat bez výslovného pokynu,
- identifikovat vlastnictví změn,
- zabránit jejich přepsání,
- pokud nelze session bezpečně dokončit, zastavit před patchem a přesně popsat překážku.

## 0.3 Globální architektonické invarianty

Následující pravidla platí ve všech sessions:

- Behavior nesmí přímo integrovat `pos` ani zapisovat finální `vel` mimo určený movement pipeline.
- Finální integrace pohybu zůstává v jednom autoritativním místě.
- FSM zůstává deterministická; žádný přímý `Math.random()` v simulaci.
- Maximálně jeden transition za tick.
- Ordered transitions zachovávají first-match prioritu.
- Runtime nikdy tiše nepoužívá jinou hodnotu než hodnotu uloženou ve validované konfiguraci.
- Built-in content v developmentu a CI selhává fail-fast.
- User/import content nesmí shodit aplikaci.
- Runtime používá resolved moduly a validované konfigurace; žádný opakovaný per-tick string dispatch.
- Built-in, user a draft presety jsou oddělené vrstvy.
- Existující entity používají immutable snapshot presetu zachycený při spawnu.
- Preview nepoužívá live hot-reload existujících entit.
- Despawn používá `markKill` a standardní Cleanup lifecycle.
- Spawn/summon akce nejsou součástí S1–S11.
- Obecný node editor, behavior tree, hierarchická FSM a scripting nejsou součástí tohoto projektu.

## 0.4 Finální cílový state model

```text
FSM state
├── movement
│   ├── právě jeden base movement
│   └── 0–3 ordered movement modifiers
├── targeting
│   └── právě jeden targeting mode
├── combat
│   └── disabled | inherit | profile
├── lifecycle
│   └── enterActions; MVP pouze despawn
└── ordered transitions
```

## 0.5 Finální runtime pravidla

- Každý skutečný vstup do state vytváří nový movement runtime state.
- Self-transition je plný exit/enter.
- Combat runtime má default politiku `reset`.
- `preserveIfSameProfile` je povolen pouze explicitně a jen pro stejný `profileId`.
- Initial state při spawnu se považuje za první vstup do state:
  - vytvoří movement runtime,
  - vytvoří nebo nastaví combat runtime,
  - spustí `enterActions` právě jednou,
  - teprve potom proběhne první standardní state execution.
- Group-controlled entity nevykonává individuální FSM movement.
- Ztráta group membership znovu inicializuje movement runtime na aktuální pozici.

## 0.6 Povinné ověření

Minimálně:

```bash
npm run typecheck
npm run build
```

Relevantní smoke testy spouštět přímo přes `npx tsx`, pokud centrální `npm run smoke` obsahuje známé pre-existing selhání.

Nové smoke testy registrovat před známým `BombExplosionChain` failure podle `AGENTS.md`.

## 0.7 Commit a handoff

Každý commit má být zaměřený pouze na danou session. Doporučený formát je uveden u jednotlivých etap.

Handoff musí obsahovat:

- branch a HEAD,
- commit hash,
- shrnutí změn,
- seznam nových nebo změněných modulů,
- přesné spuštěné příkazy a výsledky,
- známá omezení,
- odchylky od této roadmapy,
- potvrzení čistého working tree,
- konkrétní vstupní fakta pro další session.

---

# S1 — Target schema, descriptors and validation

## 1. Cíl

Vytvořit aditivní cílový datový model FSM schema v1, centrální katalog descriptorů a validační/normalizační vrstvu bez jakékoli změny současného runtime chování.

S1 musí vytvořit stabilní jazyk, nad kterým budou stavět všechny další sessions.

## 2. Závislosti

Žádné implementační závislosti. Vychází přímo z finální architektury a aktuálního legacy modelu.

## 3. Výchozí stav, který je nutné ověřit

- současné typy `BehaviorGraph`, `BehaviorState`, `Transition`, `Trigger`, `FsmState`,
- legacy shape `behaviorGraphs.json`,
- movement registry a preset metadata,
- attack profile reference,
- současné condition typy,
- zda již existují pomocné validační utility,
- zda `src/dev` je nebo není zahrnutý v hlavním typechecku.

## 4. Požadované změny

### 4.1 Schema v1

Zavést typy minimálně pro:

- `FsmPresetSchemaV1`,
- `FsmPresetMetadata`,
- `FsmGraphDefinition`,
- `FsmStateDefinition`,
- branded nebo jasně oddělené `FsmStateId`,
- state `label` oddělený od stabilního ID,
- `MovementConfig`,
- `MovementBaseConfig`,
- `MovementModifierConfig`,
- `TargetingConfig`,
- `CombatConfig`,
- `LifecycleConfig`,
- `EnterAction`,
- `TransitionConfig`,
- `ConditionConfig`,
- `ValidationIssue`,
- schema/version/source metadata.

Cílové MVP uniony:

```ts
type TargetingConfig =
  | { type: "forward" }
  | { type: "atPlayer" };

type CombatConfig =
  | { mode: "disabled" }
  | { mode: "inherit" }
  | {
      mode: "profile";
      profileId: string;
      runtimePolicy?: "reset" | "preserveIfSameProfile";
    };

type EnterAction =
  | { type: "despawn" };
```

Movement modifier MVP:

- `sineOffset`,
- `clampY`.

Conditions:

- všechny současné potvrzené conditions,
- `distanceToPlayer`, pokud byl finálně schválen ve schema dokumentu.

### 4.2 Descriptor katalog

Zavést metadata oddělená od dev UI komponent:

- stabilní `type`,
- label,
- description,
- category,
- ParamSpec,
- default values,
- min/max/step,
- jednotky,
- capability metadata,
- compatibility metadata pouze tam, kde má konkrétní runtime význam.

Descriptor nesmí importovat UI framework ani dev komponenty.

Prefix ID nesmí být zdrojem kategorie nebo významu.

### 4.3 Modulové kontrakty

Zavést generická rozhraní a `define*` helpery:

- `MovementBaseModule<C, S>`,
- `MovementModifierModule<C, S>`,
- `TargetingModule<C>`,
- `ConditionModule<C>`,
- případně descriptor/module entry typy.

`unknown` nebo type erasure musí být izolované v helperu a resolver boundary. Tato session ale nepřepojuje runtime.

Capability pro culling:

```ts
cullReference: "entityPosition" | "moduleAnchor"
```

Pokud je `moduleAnchor`, helper musí v developmentu ověřit existenci `getCullAnchorX`.

### 4.4 Validace

Implementovat samostatné API pro:

- strukturální validaci,
- referenční validaci,
- sémantickou validaci,
- normalizaci bezpečně opravitelných numerických hodnot.

Povinné kontroly:

- schema version,
- duplicate state IDs,
- initial state existence,
- transition target existence,
- známé module/condition/action typy,
- attack profile reference, pokud lze validovat bez runtime napojení,
- parameter types,
- parameter ranges,
- modifier count,
- neplatné nebo konfliktní kombinace,
- immediate cycle,
- timeless cycle,
- transitions po terminal/despawn action jako warning nebo budoucí připravený kód.

### 4.5 Cycle klasifikace

- `E_IMMEDIATE_CYCLE`: cyklus složený pouze z guaranteed-immediate hran.
- `W_TIMELESS_CYCLE`: potenciálně oscilující cyklus bez kladné time boundary.
- cyklus s kladnou časovou hranou je validní.

Není cílem obecný theorem prover.

### 4.6 Normalizace

`ValidationIssue` musí podporovat:

```ts
severity: "error" | "warning" | "normalized"
originalValue?: unknown
normalizedValue?: unknown
```

Pravidla:

- runtime validator nikdy tiše neclampuje,
- import normalizer může bezpečně opravit numerický rozsah,
- výsledný normalizovaný preset musí obsahovat skutečně opravenou hodnotu,
- strukturální nebo významově nejasné chyby se neopravují automaticky.

## 5. Dotčené moduly

Přesné cesty ověřit auditem. Očekávané oblasti:

- `src/game/enemies/fsm/FsmTypes.ts`,
- nové `src/game/enemies/fsm/schema.ts`,
- nové `src/game/enemies/fsm/validate.ts`,
- nové `src/game/enemies/catalog/*`,
- nové smoke testy.

Neprovádět masové přejmenování legacy souborů.

## 6. Co je mimo scope

- runtime použití nových typů,
- `EnemySystem`,
- `SpawnSystem`,
- migrace built-in contentu,
- user store,
- UI,
- movement execution,
- combat execution,
- přepis legacy JSON.

## 7. Acceptance criteria

- Projekt typecheckuje a buildí.
- Současná hra se chová beze změny.
- Validní fixture projde bez errors.
- Dangling transition vrátí hard error.
- Duplicate state ID vrátí hard error.
- Unknown type vrátí hard error.
- Immediate cycle vrátí `E_IMMEDIATE_CYCLE`.
- Timeless cycle vrátí warning.
- Časovaný cyklus nemá cycle issue.
- Hodnota mimo range se při explicitní normalizaci opraví a reportuje original/normalized.
- Bez normalizačního režimu invalidní hodnota zůstane error, ne skrytě změněný runtime input.
- `defineMovementBase` odmítne `moduleAnchor` bez `getCullAnchorX` v developmentu/testu.

## 8. Povinné testy

Minimálně nový smoke:

- `FsmValidate.smoke.ts`.

Doporučené příkazy:

```bash
npx tsx <path>/FsmValidate.smoke.ts
npm run typecheck
npm run build
```

## 9. Rizika

- duplicita legacy a target typů,
- UI metadata prosakující do core runtime,
- příliš obecný ParamSpec systém,
- nekonzistentní defaulty mezi descriptor a schema,
- cycle detector označující legitimní grafy.

Mitigace: aditivní změna, malé fixture grafy, žádné runtime přepojení.

## 10. Očekávaný commit

```text
feat(fsm): add target schema descriptors and validation
```

## 11. Handoff pro S2

Musí potvrdit:

- definitivní exportované typy,
- validační API,
- normalizační API,
- descriptor lookup API,
- seznam aktuálně podporovaných legacy behavior/condition IDs,
- zda existují odchylky proti `FSM_arch_final.md`.

---

# S2 — Built-in migration and resolved registry

## 1. Cíl

Vytvořit převod legacy built-in grafů do schema v1, validovaný resolved registry a dev/production error policy. Současný runtime však nadále čte legacy cestu a nesmí změnit chování.

## 2. Závislosti

- S1 dokončena a sloučena do pracovní feature branche.
- Target schema a validace jsou stabilní.

## 3. Požadované změny

### 3.1 Legacy migrace

Implementovat čistou migraci:

```text
legacy behavior graph
→ target schema v1
→ validate/normalize
→ resolved preset
```

Migrace musí:

- mapovat legacy state name na stabilní state ID,
- zachovat ordered transitions,
- mapovat `movementPresetId` na movement base config,
- mapovat `attackProfileId` na combat mode `profile`,
- mapovat absenci attack profilu podle explicitního migračního pravidla,
- zachovat legacy trigger parametry,
- rozpoznat jmenný terminal/despawn stav, ale zatím neměnit runtime,
- generovat deterministická IDs.

### 3.2 Built-in preset registry

Vytvořit registry vrstvu:

- built-in raw source,
- migrated schema definition,
- validation result,
- resolved immutable preset,
- lookup podle preset ID,
- metadata o source.

Resolved preset musí:

- používat přímé module/condition references,
- mít vyřešené state indexy,
- mít rozvinuté `inherit` reference, pokud je možné bez entity definition; jinak jasně oddělit pozdější spawn resolve,
- být deep-frozen nebo ekvivalentně immutable.

### 3.3 Error policy

Development a CI:

- invalid built-in content musí vyvolat explicitní failure.

Production:

- invalid preset se vyřadí,
- chyba se zaloguje jednou,
- zbytek validního registry může fungovat.

### 3.4 Zapojení do content load

Registry musí být vytvořené při načtení contentu, ale nesmí zatím ovlivnit `EnemySystem` runtime execution.

Legacy `BEHAVIOR_GRAPHS` zůstává dočasně dostupné pro starý runtime.

## 4. Dotčené moduly

Očekávané:

- `fsm/migrate.ts`,
- `fsm/FsmPresetRegistry.ts`,
- `content/loadContent.ts`,
- `content/CONTENT.ts`,
- smoke fixtures/tests.

## 5. Co je mimo scope

- přepojení spawn entity na snapshot,
- změna transition timing,
- state entry lifecycle,
- movement composition,
- editace JSON contentu,
- user presets,
- UI.

## 6. Acceptance criteria

- Všechny současné built-in grafy se migrují bez hard errors.
- Počet migrovaných presetů odpovídá počtu legacy grafů.
- Každý preset je resolvable podle ID.
- State a transition pořadí zůstává deterministické.
- Development fail-fast je ověřen záměrně rozbitou fixture.
- Production fail-soft je otestovaný bez pádu procesu.
- Runtime gameplay zůstává beze změny.
- Legacy a target registry nejsou zaměněné zdroje pravdy pro současný runtime.

## 7. Povinné testy

- `FsmMigrate.smoke.ts`,
- `FsmBuiltinContent.smoke.ts`.

```bash
npx tsx <path>/FsmMigrate.smoke.ts
npx tsx <path>/FsmBuiltinContent.smoke.ts
npm run typecheck
npm run build
```

## 8. Rizika

- legacy ID nemá jednoznačné target metadata,
- migrace odlišně interpretuje absent attack profile,
- dva názvy stavů generují stejné ID,
- deep-freeze rozbije objekt očekávaný jako mutable,
- built-in load failure proběhne příliš pozdě.

## 9. Očekávaný commit

```text
feat(fsm): add built-in migration and resolved preset registry
```

## 10. Handoff pro S3

Musí obsahovat:

- přesnou podobu resolved preset API,
- migrační mapování všech legacy polí,
- výsledky všech built-in presetů,
- potvrzení, že runtime stále používá legacy graph path,
- seznam míst, která S3 musí přepojit.

---

# S3 — Runtime snapshot and graph resolution

## 1. Cíl

Přepojit FSM entity na resolved immutable preset snapshot zachycený při spawnu a odstranit per-tick lookup/raw graph resolution. Zachovat legacy transition a age sémantiku pro přesnou parity kontrolu.

S3 je čistý runtime refaktor. Nesmí vědomě měnit gameplay sémantiku.

## 2. Závislosti

- S2 registry je stabilní.
- Built-in migration smoke je zelený.

## 3. Povinná příprava před patchem

Před změnou vytvořit nebo potvrdit zlatý runtime otisk současné implementace minimálně pro:

- jednoduchý time transition graph,
- position/screen transition graph,
- graf s attack state,
- více entit současně.

Otisk musí obsahovat podle vhodnosti:

- state sequence,
- transition ticks,
- position/velocity sequence,
- attack fire ticks,
- final state.

## 4. Požadované změny

### 4.1 Per-entity runtime snapshot

Při spawnu FSM entity:

- resolve preset key,
- získat immutable resolved preset,
- uložit referenci do `ent.fsmRuntime.preset`,
- inicializovat state index a legacy-compatible runtime data.

Snapshot musí zůstat stabilní, i když registry později změní draft/user preset.

### 4.2 Odstranění per-tick lookupu

Odstranit z hot path:

- lookup `BEHAVIOR_GRAPHS[graphId]`,
- opakovaný raw graph parsing,
- per-tick `ensureFsm` alokace,
- string lookup target state při každém transition.

Transitions mají používat resolved state indexy a module references.

### 4.3 Legacy parity

V této session zachovat:

- legacy age increment timing,
- legacy state application semantics,
- legacy combat behavior,
- legacy movement behavior.

Pokud je pro parity nutný dočasný compatibility adapter, musí být explicitně označený a určený k odstranění v S4/S5.

### 4.4 Více entit

Každá entity musí mít vlastní mutable runtime state. Resolved preset je sdílený immutable objekt.

## 5. Dotčené moduly

Očekávané:

- `systems/SpawnSystem.ts`,
- `systems/EnemySystem.ts`,
- `fsm/FsmRuntime.ts`,
- entity/runtime typy,
- parity smoke testy.

## 6. Co je mimo scope

- nové state entry semantics,
- initial state jako nový lifecycle enter,
- movement reset policy,
- combat modes,
- movement modifiers,
- lifecycle actions,
- změna built-in JSON.

## 7. Acceptance criteria

- Všechny FSM entity používají resolved preset snapshot.
- Per-tick lookup raw graphu je odstraněný.
- Runtime nealokuje nový FSM graph/state wrapper každý tick.
- Zlaté otisky jsou bitově nebo přesně dle definovaných polí shodné.
- Dva identické běhy mají totožný výsledek.
- Pět entit se stejným presetem má nezávislý runtime state.
- Ne-FSM enemies se nezmění.
- Registry změna po spawnu nemění již existující entitu.

## 8. Povinné testy

- `FsmRuntimeParity.smoke.ts`,
- `FsmDeterminism.smoke.ts`,
- multi-entity case v jednom z nich.

```bash
npx tsx <path>/FsmRuntimeParity.smoke.ts
npx tsx <path>/FsmDeterminism.smoke.ts
npm run typecheck
npm run build
```

## 9. Rizika

- skrytá změna age boundary,
- sdílení mutable runtime objektu,
- resolved preset drží neimmutable config,
- spawn path nezná enemy definition potřebnou pro `inherit`,
- parity test zachytí příliš málo.

## 10. Očekávaný commit

```text
refactor(fsm): use resolved runtime snapshots
```

## 11. Handoff pro S4

Musí přesně uvést:

- dočasné compatibility části,
- aktuální initial state initialization path,
- současný runtime shape,
- parity baseline,
- místa, kde S4 vědomě změní sémantiku.

---

# S4 — State entry, runtime reset and combat modes

## 1. Cíl

Zavést finální state entry/re-entry model, nový age/transition timing, movement runtime reset policy a explicitní combat modes.

Tato session je první vědomá změna FSM runtime sémantiky.

## 2. Závislosti

- S3 parity refaktor dokončen.
- Zlaté legacy otisky existují.

## 3. Požadované změny

### 3.1 Initial state jako první entry

Při spawnu entity:

- initial state se musí považovat za skutečný vstup,
- `age = 0`,
- vytvořit nový movement base runtime state,
- vytvořit runtime states modifierů,
- inicializovat combat runtime podle resolved combat config,
- vykonat `enterActions` právě jednou,
- teprve potom dovolit první standardní execution tick.

V S4 ještě `despawn` action nemusí být aktivní, ale lifecycle entry pipeline musí mít správný extension point.

### 3.2 Transition timing

Finální flow:

1. vyhodnotit ordered transitions s current age,
2. first match maximálně jeden,
3. interní exit cleanup,
4. změnit state,
5. `age = 0`,
6. vytvořit nové module runtime states,
7. nastavit combat runtime,
8. vykonat entry actions,
9. vykonat aktuální state,
10. `age += dt` pro state skutečně vykonaný v tomto ticku.

Nový state se vykoná v ticku přechodu.

### 3.3 Movement reset

Každý vstup:

- jiný state,
- návrat,
- self-transition,
- stejný movement type,
- stejné parametry,

vždy vytvoří nový movement runtime state.

Žádné `resetMovementOnReenter` a žádné preserve policy v MVP.

### 3.4 Combat modes

Implementovat:

- `disabled`,
- `inherit`,
- `profile`.

Pravidla:

- default `runtimePolicy = reset`,
- různý profil vždy reset,
- self-transition default reset,
- preserve pouze explicitně a jen stejný profile ID,
- disabled nemůže nechtěně spadnout na enemy default profile,
- inherit se resolve na konkrétní enemy/default profile.

Reset zahrnuje relevantní runtime pole:

- cooldown,
- windup,
- firing flag,
- shots fired,
- další potvrzený state controlleru.

### 3.5 Odstranění legacy aplikace state

Odstranit nebo nahradit:

- `applyStateBehavior`,
- `fsmAppliedMovementPresetId`,
- související mrtvé debug logy,
- implicitní attack fallback.

Mechanická movement execution může zatím používat adapter nad stávajícím movement DB; plná module adaptace je S5.

## 4. Dotčené moduly

Očekávané:

- `fsm/FsmRuntime.ts`,
- `systems/EnemySystem.ts`,
- runtime state types,
- attack/combat controller integration,
- lifecycle a combat smoke tests.

## 5. Co je mimo scope

- movement modifiers,
- group suspension,
- cull capability,
- aktivní `despawn`,
- content JSON conversion,
- user store,
- UI.

## 6. Acceptance criteria

- Initial state entry vytvoří runtime a proběhne právě jednou.
- New state executes same tick as transition.
- Po prvním execution má nový state `age = dt`.
- `timeInState` boundary odpovídá finálním příkladům.
- Self-transition je plný re-entry.
- Movement runtime je při každém entry nově vytvořený.
- `disabled` je skutečně tichý i u enemy s default attack profilem.
- `inherit` použije default profile.
- `profile A → profile A` default resetuje.
- `preserveIfSameProfile` zachová potvrzený combat runtime.
- `profile A → B` nelze zachovat.
- Legacy parity test má pouze explicitně dokumentovaný −1 tick rozdíl time transitions.

## 7. Povinné testy

- `FsmLifecycle.smoke.ts`,
- `FsmCombatModes.smoke.ts`,
- aktualizovaný `FsmRuntimeParity.smoke.ts`.

Pokrýt přesné tick boundaries, initial entry, self-transition a combat policy tabulku.

## 8. Rizika

- dvojí initial entry,
- entry action spuštěná před úplnou inicializací entity,
- combat inherit není možné resolve při preset load a musí být spawn-dependent,
- nový state dostane age increment dvakrát,
- self-transition se omylem optimalizuje jako no-op.

## 9. Očekávaný commit

```text
feat(fsm): add state entry lifecycle and combat modes
```

## 10. Handoff pro S5/S6

Musí potvrdit:

- přesné runtime flow,
- entry extension point,
- module state initialization API,
- combat resolved representation,
- parity rozdíly,
- zda S6 může přidat `despawn` bez změny flow.

---

# S5 — Movement composition and cull capability

## 1. Cíl

Zavést finální movement resolver s jedním base modulem, ordered modifiers, group suspension a explicitní cull reference capability.

## 2. Závislosti

- S4 finální state entry a runtime state initialization.

## 3. Požadované změny

### 3.1 MovementResolver

Vytvořit samostatnou runtime odpovědnost:

- base `update`,
- base `getTarget`,
- modifier pipeline,
- reusable scratch target,
- výsledný movement intent předán EnemySystemu,
- EnemySystem zůstává jediným místem finálního `vel` výpočtu/integrace.

### 3.2 Adaptace současných base movementů

Adaptovat potvrzené současné movement primitives na generické module API.

Zachovat jejich herní chování a runtime state.

Neprovádět gameplay tuning.

### 3.3 MVP modifiers

Implementovat pouze:

- `sineOffset`,
- `clampY`.

Modifiers jsou ordered a deterministické.

Editor zatím neexistuje, pořadí je pořadí v config array.

### 3.4 Group-controlled suspension

Pokud má entity validní runtime group membership:

- MovementResolver se nevolá,
- individuální movement nevytváří zahazovaný output,
- group cohesion je jediný movement owner,
- FSM transitions/targeting/combat/lifecycle běží dál.

Pokud membership za běhu zmizí:

- movement base a modifier states se re-inicializují na aktuální pozici,
- zabránit skoku z historického anchoru.

### 3.5 Cull capability

Odstranit hardcoded lookup konkrétních behavior IDs.

Použít:

- `entityPosition`,
- `moduleAnchor` + `getCullAnchorX`.

Odstranit nebo nahradit `EnemyCullReference.ts`, pokud se potvrdí jeho původní role.

Nevytvářet obecný capabilities framework.

## 4. Dotčené moduly

Očekávané:

- nový `enemies/runtime/MovementResolver.ts`,
- movement catalog moduly,
- `systems/EnemySystem.ts`,
- `EnemyGroups`,
- culling helper,
- movement smoke tests.

## 5. Co je mimo scope

- nový group blend,
- targeting expansion,
- nové combat patterns,
- UI,
- content tuning,
- waypoint editor.

## 6. Acceptance criteria

- Base-only movement je bitově nebo tolerančně shodný se současným chováním.
- `straight + sineOffset` odpovídá analyticky očekávanému targetu.
- Změna pořadí modifierů mění výsledek tam, kde má být pořadí významové.
- `clampY` drží target v povoleném rozsahu.
- Nula modifierů nepřidává jiné chování.
- Group member nevykoná base update/getTarget.
- Cohesion velocity odpovídá současnému výpočtu.
- Po ztrátě membership nedojde ke skoku z historického anchoru.
- Culling parity funguje pro cyclic/path anchored movementy.
- Žádné per-tick objektové alokace v novém resolveru.

## 7. Povinné testy

- `MovementComposition.smoke.ts`,
- `FsmGroupSuspend.smoke.ts`,
- aktualizovaný `EnemyCulling.smoke.ts`,
- parity smoke.

## 8. Rizika

- adaptace jedenácti base movementů může skrýt gameplay změny,
- modifier mutuje špatný coordinate space,
- clamp používá jiný viewport reference,
- group membership stale reference,
- cull anchor volaný před module state initialization.

## 9. Očekávaný commit

```text
feat(fsm): add movement composition and cull capabilities
```

## 10. Handoff pro S7/S10

Potvrdit:

- seznam base movement type IDs,
- modifier descriptors,
- group context API,
- cull capability API,
- config shape, který později vykreslí editor.

---

# S6 — Explicit despawn lifecycle

## 1. Cíl

Aktivovat user-facing `enterActions` s jedinou MVP akcí `despawn` a propojit ji na standardní kill/cleanup lifecycle.

## 2. Závislosti

- S4 lifecycle entry pipeline.
- S1 action schema a validation.

S5 není striktně nutná, ale S6 musí být integrována před S7 content conversion.

## 3. Požadované změny

### 3.1 Entry action execution

Při každém skutečném vstupu do state vykonat ordered `enterActions` právě jednou.

Pro `despawn`:

- zavolat standardní `markKill`,
- neprovést v daném ticku movement,
- neprovést targeting/combat,
- fyzické odstranění ponechat Cleanup fázi.

### 3.2 Initial state despawn

Pokud je initial state terminal s `despawn`:

- action se vykoná při prvním entry po spawnu,
- entity nedostane standardní state execution,
- nesmí se action spustit dvakrát.

### 3.3 Self-transition

Self-transition do state s `despawn` je nový vstup a action se vykoná jednou. `markKill` musí být idempotentní nebo chráněný existujícím lifecyclem.

### 3.4 Validace

Doplnit:

- warning pro transitions definované za guaranteed terminal `despawn` state,
- případně error pro nesmyslnou action kombinaci, pokud schema dovoluje více actions.

Immediate cycle detekce z S1 musí zůstat funkční.

## 4. Dotčené moduly

- `fsm/FsmRuntime.ts`,
- `fsm/validate.ts`,
- store/lifecycle API,
- smoke test.

## 5. Co je mimo scope

- spawn/summon,
- VFX/audio actions,
- fire-on-enter,
- obecné onExit/onUpdate,
- built-in content conversion,
- UI lifecycle editor.

## 6. Acceptance criteria

- Despawn při vstupu nastaví pending kill.
- Movement a combat se po despawn entry nevykonají.
- Cleanup odstraní entity standardní cestou.
- Action proběhne právě jednou na entry.
- Initial terminal state funguje.
- Self-transition nevytvoří více než jeden kill side effect.
- Transition za despawn state vyprodukuje warning.
- Žádné přímé odstranění ze store během FSM update.

## 7. Povinné testy

- `FsmDespawn.smoke.ts`.

Pokrýt initial entry, transition entry, self-transition a cleanup.

## 8. Rizika

- markKill během iterace,
- pokračování movement/combat po kill,
- dvojí enter invocation,
- terminal state transition stále evaluovaný další tick před cleanup.

## 9. Očekávaný commit

```text
feat(fsm): add explicit despawn entry action
```

## 10. Handoff pro S7/S11

Potvrdit:

- action execution API,
- terminal validation code,
- přesnou JSON representation,
- editor metadata pro `despawn`.

---

# S7 — Built-in content conversion to schema v1

## 1. Cíl

Převést kanonické built-in FSM grafy do cílového schema v1 a odstranit jmennou `despawn` konvenci z built-in contentu.

Toto je samostatná content session a jediná session, která má vědomě měnit pozorovatelné chování built-in FSM v rozsahu schválených rozdílů.

## 2. Závislosti

- S1–S6 dokončeny.
- Runtime umí plné schema v1.
- Movement composition a explicitní despawn fungují.

## 3. Povinná příprava

Před úpravou JSON:

- vypsat všechny grafy,
- vytvořit legacy→v1 mapovací tabulku,
- identifikovat terminal states,
- identifikovat grafy s time transitions,
- zaznamenat očekávaný −1 tick timing diff,
- potvrdit grafy, které jsou group-spawned.

## 4. Požadované změny

### 4.1 Přepis contentu

Každý built-in graph převést na:

- `schemaVersion`,
- metadata,
- stable state IDs,
- labels,
- explicitní initial state ID,
- movement base config,
- modifiers array,
- targeting,
- combat mode,
- lifecycle enterActions,
- typed conditions.

### 4.2 Terminal states

Nahradit význam názvu `despawn` explicitní akcí:

```json
{
  "lifecycle": {
    "enterActions": [{ "type": "despawn" }]
  }
}
```

Název/label může zůstat pro čitelnost, ale nesmí být zdrojem runtime významu.

### 4.3 Legacy adapter

Po konverzi:

- runtime built-ins čtou schema v1,
- legacy migrator může zůstat pouze pro detekci/import starého shape, pokud je to záměrně potřebné,
- nesmí existovat dvě paralelní runtime definice built-in grafů.

### 4.4 Parity a povolené rozdíly

Povolené:

- time transitions o jeden tick dříve,
- explicitní terminal despawn místo čekání na culling.

Nepovolené bez samostatného rozhodnutí:

- změny rychlostí,
- změny trajektorií,
- změny attack profilů,
- nové conditions,
- gameplay tuning.

## 5. Dotčené moduly

- `content/behaviorGraphs.json`,
- loader/migration detection,
- built-in registry smoke,
- parity fixtures.

Název souboru se v této session nepřejmenovává, pokud to není technicky nutné.

## 6. Co je mimo scope

- editor,
- user presets,
- nový behavior katalog,
- gameplay tuning,
- odstranění všech legacy prototypů,
- rename všech content souborů.

## 7. Acceptance criteria

- Všechny built-in grafy jsou schema v1.
- Built-in validation má nula errors.
- Dev fail-fast boot projde.
- Runtime nepoužívá legacy graph object pro built-in FSM.
- State sequence parity je zachovaná.
- Každý povolený diff je explicitně dokumentovaný testem.
- Terminální stavy používají action, ne jméno.
- Všechny existující FSM enemy lze spawnout přes současný panel.
- Žádná změna ne-FSM enemies.

## 8. Povinné testy

- `FsmBuiltinContent.smoke.ts`,
- `FsmRuntimeParity.smoke.ts`,
- existující culling/movement smoke,
- manuální spawn checklist pro všechny built-in FSM typy.

## 9. Rizika

- ruční chyby v IDs,
- transition target po rename,
- absence implicitního attack fallbacku změní firing,
- terminal action odstraní entity dříve než původní culling,
- JSON schema a TS defaulty se rozcházejí.

## 10. Očekávaný commit

```text
content(fsm): convert built-in graphs to schema v1
```

## 11. Handoff pro S8/S9

Potvrdit:

- finální canonical schema examples,
- seznam built-in preset IDs,
- read-only metadata,
- exportovatelný sample preset pro editor/store tests.

---

# S8 — User preset store and import/export

## 1. Cíl

Zavést bezpečné local user preset persistence, schema migrations, import/export a registry user layer bez UI editoru.

## 2. Závislosti

- S1 schema/validation.
- S2 registry.
- Preferovaně S7 canonical built-in schema dokončené.

## 3. Požadované změny

### 3.1 UserPresetStore

Implementovat abstrakci nad storage:

- default `localStorage`,
- testovatelný injected storage interface,
- jeden versioned blob nebo jasně zdůvodněná key struktura,
- doporučený root key `cm.fsm.user.v1`, pokud nekoliduje s existujícím namingem.

Operace:

- list,
- get,
- create,
- update,
- rename metadata,
- duplicate,
- delete,
- replace/import,
- export.

### 3.2 Source vrstvy registry

Registry musí rozlišit:

- built-in,
- user,
- draft, připravený extension point pro S11.

Kolize ID:

- built-in nelze přepsat user presetem,
- import/user collision řešit deterministickým suffixem nebo explicitní volbou podle schválené policy,
- operace musí vracet skutečný výsledný ID.

### 3.3 Schema migrations

- user blob má vlastní storage version,
- každý preset má schema version,
- migrace jsou sekvenční a testovatelné,
- před destructive migration vytvořit backup blob,
- neznámá vyšší verze se nesmí tiše přepsat.

### 3.4 Corrupt data

Při parse/validation failure:

- aplikace nespadne,
- corrupt blob se zachová/přejmenuje do diagnostického backup key,
- aktivní store začne bezpečně prázdný,
- chyba je dostupná UI vrstvě.

### 3.5 Quota/write failure

- write failure nesmí rozbít current in-memory draft,
- store vrátí explicitní error,
- UI jej později zobrazí.

### 3.6 Import/export

Podporovat:

- single preset,
- bundle presetů.

Import:

- strukturální errors odmítnou relevantní jednotku nebo celý bundle podle předem definované atomické policy,
- numerické normalization vytvoří report,
- importovaný preset obsahuje normalizované hodnoty,
- registry se aktualizuje až po úspěšném persist kroku.

Export:

- čistý JSON,
- schema/version metadata,
- bez runtime/editor transient dat.

## 4. Typecheck rozsah dev kódu

Pokud je pro nový store nutné zahrnout `src/dev` do typechecku:

- preferovat cílený `tsconfig.dev.json` nebo nejmenší bezpečnou změnu,
- neopravovat nesouvisející historické chyby mimo blokující minimum,
- každou nutnou vedlejší opravu explicitně uvést v handoffu.

## 5. Dotčené moduly

- nový `enemies/store/UserPresetStore.ts`,
- `FsmPresetRegistry.ts`,
- import/export utility,
- storage tests,
- případně tsconfig.

## 6. Co je mimo scope

- UI toolbar,
- autosave draftu,
- preview,
- filesystem/cloud sync,
- browser download styling,
- editace built-in presetů.

## 7. Acceptance criteria

- User preset roundtrip zachová schema data.
- Bundle roundtrip funguje.
- Built-in preset nelze přepsat.
- Import collision vytvoří deterministický nový ID nebo explicitní výsledek dle policy.
- Import s hard error je odmítnut bez částečného nekonzistentního zápisu.
- Import s normalization vrátí report a uloží normalizovanou hodnotu.
- Corrupt blob aplikaci neshodí a je zachovaný pro diagnostiku.
- Quota failure vrátí error a neztratí in-memory data.
- Registry user layer se aktualizuje pouze po úspěšném zápisu.

## 8. Povinné testy

- `FsmSerialization.smoke.ts`,
- mock storage cases pro corrupt/quota/migration,
- import collision,
- single a bundle roundtrip.

## 9. Rizika

- localStorage availability v private mode,
- částečný import bundle,
- duplicate IDs uvnitř bundle,
- timestamps způsobí nondeterministické testy,
- registry a storage se rozcházejí po failed write.

## 10. Očekávaný commit

```text
feat(fsm): add user preset storage and import export
```

## 11. Handoff pro S9/S11

Potvrdit:

- store API,
- registry source precedence,
- error/result types,
- import report shape,
- draft registration extension point.

---

# S9 — Enemy Lab editor foundation

## 1. Cíl

Vytvořit technický základ FSM editoru v Enemy Lab: editor store, preset workflow, built-in/user/draft rozlišení a explicitní save bez state-detail editoru.

## 2. Závislosti

- S8 user store a registry.
- S7 canonical built-in presets.

## 3. Požadované změny

### 3.1 Modulární struktura

Vytvořit samostatný adresář, například:

```text
src/dev/enemylab/
  EditorStore.ts
  PresetToolbar.tsx
  PresetList.tsx
  EditorShell.tsx
  editorTypes.ts
  ...
```

Nevkládat celý editor do existujícího monolitického `DevSummoner` souboru.

### 3.2 Editor state

Editor store musí držet minimálně:

- selected preset key,
- source `builtin | user | draft`,
- immutable original snapshot,
- mutable nebo immutable-updated draft,
- dirty flag,
- validation result,
- storage error,
- selected state ID připravený pro S10,
- preview state placeholder připravený pro S11.

Editace mají procházet čistým `applyEdit`/reducer API, ne náhodnými mutacemi objektu.

### 3.3 Preset workflow

Implementovat:

- select built-in,
- built-in read-only,
- duplicate built-in to user,
- create blank user preset,
- rename metadata,
- duplicate user preset,
- explicit save,
- save as copy,
- delete user preset s potvrzením,
- import/export napojení na S8,
- reset/revert dirty draft.

Žádný autosave user presetu.

### 3.4 Dirty state a recovery

- Dirty flag porovnává draft proti saved/original snapshotu.
- Při změně preset selection musí uživatel dostat discard/save decision nebo bezpečnou variantu.
- Volitelná sessionStorage recovery může být implementována jen pokud je malá a jasně oddělená od user save.
- Recovery nesmí být zaměněná za autosave.

### 3.5 Integrace do Enemy Lab

Stávající spawn panel musí zůstat funkční.

Nový editor shell lze přidat jako tab/panel bez redesignu celého dev UI.

## 4. Dotčené moduly

- `src/dev/enemylab/*`,
- `DevSummoner` nebo současný Enemy Lab mount,
- registry/store hooks.

## 5. Co je mimo scope

- state list editace,
- movement inputs,
- transitions,
- lifecycle editor,
- preview spawn,
- undo/redo,
- node graph,
- polished responsive design.

## 6. Acceptance criteria

- Built-in preset lze otevřít, ale nelze přepsat.
- Duplicate built-in vytvoří user preset s novým ID.
- Blank user preset lze vytvořit a uložit.
- User preset lze přejmenovat, duplikovat a smazat.
- Dirty flag je přesný.
- Explicit save persistuje přes S8 store.
- Reload aplikace obnoví saved user preset.
- Storage error je viditelný, ne pouze console log.
- Existující spawn panel se chová stejně jako před session.
- Editor kód je rozdělený do menších modulů.

## 7. Povinné ověřovací scénáře

- duplicate built-in → edit metadata → save → reload,
- create blank → save,
- user delete confirmation,
- switch preset s dirty draftem,
- storage write failure,
- import preset se zobrazí v listu.

Automatizace UI je vítaná, ale pokud projekt nemá framework, musí být scénáře alespoň reprodukovatelné a editor store unit/smoke testovaný bez DOM.

## 8. Rizika

- monolitický UI diff,
- draft přímo mutuje registry object,
- dirty detection přes timestamps,
- built-in objekt se omylem persistuje jako mutable reference,
- vedlejší opravy dev UI překročí scope.

## 9. Očekávaný commit

```text
feat(dev): add Enemy Lab FSM editor foundation
```

## 10. Handoff pro S10

Potvrdit:

- editor store API,
- draft update mechanism,
- selection/dirty workflow,
- component boundaries,
- validation result propagation.

---

# S10 — State, movement, targeting and combat editor

## 1. Cíl

Doplnit funkční master-detail editaci state struktury, movement composition, targeting a combat konfigurace řízenou centrálními descriptory.

## 2. Závislosti

- S9 editor foundation.
- S1 descriptors/validation.
- S5 final movement config.
- S4 final combat config.

## 3. Požadované změny

### 3.1 State list

Implementovat:

- seznam states,
- select state,
- add state,
- duplicate state,
- remove state,
- edit label,
- stable internal ID,
- choose initial state.

Přejmenování labelu nesmí změnit ID ani transition references.

Odstranění state:

- pokud je initial nebo transition target, editor musí zobrazit chyby nebo nabídnout explicitní řešení,
- nesmí tiše přesměrovat transitions.

### 3.2 Movement editor

- select právě jeden base movement,
- metadata-driven parametry,
- add/remove modifiers,
- ordered modifier list,
- reorder modifiers,
- maximální počet podle validation schema,
- pouze `sineOffset` a `clampY` v MVP.

### 3.3 Targeting editor

Pouze:

- `forward`,
- `atPlayer`.

### 3.4 Combat editor

- `disabled`,
- `inherit`,
- `profile`,
- profile selector,
- runtime policy,
- `preserveIfSameProfile` vysvětlené a dostupné pouze v relevantním mode.

### 3.5 Param inputs

Generovat z descriptor metadata:

- label,
- description/help,
- min/max/step,
- unit,
- default.

Pravidlo hodnot:

- commit invalidní numerické hodnoty provede explicitní clamp do draftu nebo ponechá error podle zvoleného input UX,
- zobrazená hodnota musí vždy odpovídat draftu,
- Save je blokovaný při errors.

### 3.6 Validation panel

- errors a warnings,
- normalized report z importu,
- focus konkrétního state/field přes `location`,
- warnings neblokují Save,
- errors blokují Save.

### 3.7 Group context messaging

Protože preset sám nezná spawn context:

- preset editor neoznačuje movement jako invalid,
- při group-spawn contextu zobrazit badge, že movement nebude aktivní,
- spawn panel skrývá nebo disableduje zavádějící movement selection, pokud je skutečně ignorovaná.

## 4. Dotčené moduly

- `dev/enemylab/StateList*`,
- `StateDetail*`,
- metadata-driven field components,
- validation panel,
- existing group spawn panel hint.

## 5. Co je mimo scope

- transitions editor,
- lifecycle editor,
- preview,
- undo/redo,
- new behavior types,
- responsive polish nad funkční minimum.

## 6. Acceptance criteria

- State lze vytvořit, duplikovat, odstranit a vybrat jako initial.
- Rename label nemění ID ani transition target v exportu.
- Movement base lze změnit.
- Modifiers lze přidat, odebrat a reorderovat.
- Targeting lze změnit.
- Combat mode a profile fungují.
- Runtime policy má správné defaulty.
- Invalid input vytvoří visible error a blokuje Save.
- Warning Save neblokuje.
- Klik na validation issue fokusuje relevantní state/field.
- Group context badge je pravdivý a nevytváří preset-level false warning.
- Export draftu odpovídá target schema v1.

## 7. Povinné ověřovací scénáře

- rename state a export reference,
- delete referenced state → error,
- change base + add sineOffset + clampY,
- reorder modifiers,
- combat disabled u enemy default profile,
- preserveIfSameProfile input,
- out-of-range normalization/input behavior,
- group-spawn badge.

## 8. Rizika

- generický form renderer bude složitější než ruční komponenty,
- stable ID generátor koliduje,
- duplicate state omylem zkopíruje stejné ID,
- descriptor a runtime defaults se rozcházejí,
- UI umožní více než tři modifiers.

## 9. Očekávaný commit

```text
feat(dev): add FSM state movement and combat editor
```

## 10. Handoff pro S11

Potvrdit:

- state edit API,
- transition target selector API,
- condition descriptor rendering pattern,
- lifecycle section insertion point,
- preview-ready validation state.

---

# S11 — Transitions, lifecycle and preview editor

## 1. Cíl

Dokončit funkční FSM editor přidáním transitions, explicitního despawn lifecycle a bezpečného draft preview workflow s immutable runtime snapshotem.

## 2. Závislosti

- S10 state editor.
- S6 despawn runtime.
- S3 snapshot runtime.
- S8 draft/user registry extension points.

## 3. Požadované změny

### 3.1 Transitions editor

Implementovat:

- list ordered transitions,
- add/remove transition,
- select target state,
- select condition type,
- metadata-driven condition params,
- reorder transitions,
- first-match priority jasně viditelnou v UI,
- errors pro dangling target,
- cycle warnings/errors z validatoru.

Condition MVP podle schema:

- time in state,
- HP threshold,
- screen X threshold,
- offscreen,
- distance to player, pokud je v schema.

### 3.2 Lifecycle editor

Pouze:

- enable/add explicit `despawn` enter action,
- remove action.

Nevytvářet obecný action builder.

UI musí vysvětlit:

- action se vykoná při vstupu,
- self-transition znamená nový vstup,
- state s despawn je terminální v běžném smyslu.

### 3.3 Draft registry

Doplnit registry API:

- `registerDraft`,
- `updateDraft` nebo atomic replace,
- `unregisterDraft`,
- draft keys oddělené od persisted user IDs.

Draft se nikdy automaticky nepersistuje do user store.

### 3.4 Preview spawn payload

Rozšířit spawn command/event o jedno aditivní pole, například:

```ts
fsmPresetKey?: string
```

SpawnSystem:

- resolve draft preset,
- odmítne invalid draft,
- zachytí immutable resolved snapshot,
- inicializuje entity standardní FSM entry cestou.

### 3.5 Preview lifecycle

Ovládání:

- Spawn preview,
- Respawn,
- Kill/Reset preview.

Pravidla:

- změna draftu nemění existující entity,
- editor označí preview jako stale,
- Respawn vytvoří novou entity s novým snapshotem,
- invalid draft disableduje Spawn/Respawn,
- zavření editoru unregisteruje draft a odstraní preview entity standardní kill cestou,
- neuložený draft se nesmí propsat do user storage.

### 3.6 Preview gameplay context

Výchozí řešení:

- preview entity žije v normální dev hře,
- podléhá běžným systémům,
- žádný ghost/isolation mode v MVP.

Pokud se ukáže zásadní technická překážka, dokumentovat ji; nevytvářet nový preview world bez architektonického rozhodnutí.

### 3.7 Stale tracking

Stale flag musí porovnávat aktuální draft revision proti snapshot revision preview entity, ne odhadovat podle času.

## 4. Dotčené moduly

- `dev/enemylab/TransitionsEditor*`,
- lifecycle section,
- preview controls/store,
- event/payload types,
- `SpawnSystem`,
- `FsmPresetRegistry` draft layer.

## 5. Co je mimo scope

- live hot-reload,
- group-specific preview controls,
- multiple simultaneous preview entities, pokud nejsou triviální,
- ghost mode,
- node graph,
- spawn/summon lifecycle actions,
- undo/redo.

## 6. Acceptance criteria

- Transition lze přidat, upravit, odebrat a reorderovat.
- UI zřetelně komunikuje first-match priority.
- Dangling target blokuje Save i preview.
- Immediate cycle blokuje Save/preview.
- Timeless cycle je warning a Save neblokuje.
- Despawn entry action lze nastavit a runtime funguje.
- Invalid draft nelze spawnout.
- Valid draft spawn vytvoří entity se snapshotem.
- Změna draftu označí preview stale a běžící entity se nezmění.
- Respawn použije novou konfiguraci.
- Zavření editoru odstraní draft registration i preview entity.
- Saved user preset se nezmění bez explicitního Save.
- Determinismus zůstane zachovaný.

## 7. Povinné ověřovací scénáře

- transition reorder změní first-match výsledek,
- immediate cycle error,
- timeless cycle warning,
- despawn initial state preview,
- spawn valid draft,
- edit draft while entity running,
- stale badge,
- respawn new snapshot,
- close editor cleanup,
- invalid draft blocked.

## 8. Povinné testy

Podle infrastruktury:

- preview registry/spawn smoke bez DOM,
- updated determinism smoke,
- transition/lifecycle validation smoke,
- manuální UI checklist.

## 9. Rizika

- event payload změna zasáhne jiné spawners,
- draft key koliduje s user/built-in key,
- preview entity zůstane po unmountu,
- stale tracking se resetuje při nesouvisejícím UI state,
- SpawnSystem obejde standardní registry validation,
- draft objekt se mutuje po capture a poruší snapshot isolation.

## 10. Očekávaný commit

```text
feat(dev): add FSM transitions lifecycle and preview editor
```

## 11. Handoff pro následnou stabilizaci

Po S11 musí handoff obsahovat:

- úplný seznam nových smoke testů,
- známé UX nedostatky,
- známé runtime omezení,
- potvrzení S1–S11 acceptance matrix,
- návrh přesného scope S12 stabilization,
- seznam maintenance úkolů mimo FSM roadmapu.

---

# 12. Dependency map

```text
S1  Schema + descriptors + validation
 └─ S2  Built-in migration + resolved registry
     └─ S3  Runtime snapshot + graph resolution
         └─ S4  State entry + reset + combat modes
             ├─ S5  Movement composition + cull capability
             └─ S6  Explicit despawn lifecycle
                 └─ S7  Built-in conversion to schema v1
                     └─ S8  User store + import/export
                         └─ S9  Editor foundation
                             └─ S10 State/movement/targeting/combat editor
                                 └─ S11 Transitions/lifecycle/preview editor
```

Poznámky:

- S6 technicky závisí hlavně na S4, ale musí být dokončená před S7.
- S8 stojí na S1/S2; prakticky je vhodné provést ji až po S7, aby editor a import pracovaly nad kanonickým v1 contentem.
- S3 a S4 neslučovat: S3 měří paritu, S4 vědomě mění sémantiku.
- S7 neslučovat s runtime ani UI: content diff musí být izolovaný.

---

# 13. Globální acceptance matrix po S11

Po dokončení S1–S11 musí platit:

## Schema a validace

- Existuje explicitní schema v1.
- Stable state IDs jsou oddělené od labels.
- Built-in content je validovaný fail-fast v dev/CI.
- User/import chyby neshodí aplikaci.
- Immediate cycle je hard error.
- Timeless cycle je warning.
- Runtime nepoužívá skrytý clamp.

## Runtime

- Entity používá immutable resolved preset snapshot.
- Initial state je skutečný first entry.
- Maximálně jeden transition za tick.
- New state executes in transition tick.
- Každý entry resetuje movement runtime.
- Combat default reset funguje.
- `preserveIfSameProfile` je omezené na stejný profil.
- Group-controlled entity nevykonává individuální movement.
- Despawn používá markKill/Cleanup.
- Žádný per-tick raw string dispatch ani nepotřebné alokace.

## Content

- Built-in grafy jsou schema v1.
- Jméno `despawn` nemá runtime význam.
- Legacy runtime path není zdrojem pravdy pro built-ins.

## Persistence

- User presets přežijí reload.
- Import/export single i bundle funguje.
- Corrupt storage a quota failure jsou fail-soft.
- Built-in preset nelze přepsat.

## Editor

- Built-in/user/draft jsou jasně odlišené.
- Built-in lze duplikovat, ne přepsat.
- State rename nerozbije transitions.
- Movement, targeting a combat editace jsou metadata-driven.
- Errors blokují Save, warnings ne.
- Transition order je editovatelný a zřetelný.
- Despawn lze nastavit.
- Preview používá snapshot a stale/respawn workflow.
- Invalid draft nelze spawnout.

---

# 14. Úkoly výslovně mimo S1–S11

Tyto práce nesmí být nenápadně přidány do implementačních sessions:

- obecný projectile spawn event refactor,
- mazání `ai/`, `controller/` a dalších mrtvých prototypů,
- obecný behavior tree,
- node graph UI,
- hierarchická nebo paralelní FSM,
- group movement blending,
- group-level FSM,
- nové burst/radial/spread/charge combat systémy,
- spawn/summon lifecycle actions,
- audio/VFX lifecycle actions,
- cloud sync nebo databáze,
- live hot-reload existujících entities,
- redesign celého dev UI,
- opravy nesouvisejících historických dev chyb,
- přejmenování všech content souborů,
- plošný cleanup technického dluhu mimo novou FSM vrstvu.

---

# 15. Použití tohoto dokumentu

Před každou session:

1. načíst tuto kapitolu,
2. načíst handoff předchozí session,
3. ověřit aktuální repository state,
4. aktualizovat konkrétní cesty a symboly,
5. vytvořit přesný Codex prompt pouze pro jednu session,
6. po dokončení aktualizovat stav roadmapy a teprve potom připravit další prompt.

Tento dokument je master kontrakt. Není náhradou za aktuální repository audit ani za konkrétní handoff mezi sessions.
