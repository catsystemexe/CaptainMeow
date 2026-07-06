# FSM implementation handoffs

Tento adresář obsahuje verzované výstupy jednotlivých implementačních sessions FSM projektu.

Každá session musí:
- vytvořit nebo aktualizovat vlastní `SX.md`,
- uložit handoff ve stejném commitu jako implementaci,
- uvést skutečně implementovaný rozsah,
- uvést veřejná API,
- uvést testy a jejich výsledky,
- uvést odchylky, rizika a vstupy pro další session.

Handoff nenahrazuje kontrolu kódu. Následující session musí vždy ověřit, že dokument odpovídá aktuálnímu stavu repozitáře.

- [A2 — Authoritative FSM Speed analysis](./A2-speed-analysis.md)
- [U1.4.8 — Synchronize Basic Setup into FSM authoring draft](./U1.4.8.md)
## Sessions

- [S1 — Target schema, descriptors and validation](./S1.md)
- [S2 — Built-in migration and resolved preset registry](./S2.md)
- [S3 — Runtime snapshot and graph resolution](./S3.md)
- [S4 — State entry, runtime reset, combat modes, and timing semantics](./S4.md)
- [S5 — Movement composition MVP](./S5.md)
- [S6 — Lifecycle entry actions and explicit despawn](./S6.md)
- [S6.1 — Dev UI runtime state compatibility](./S6.1.md)

- [S7 — Canonical built-in FSM content conversion](./S7.md)
- [S7.1 — Transition movement correctness and retained Dev UI FSM inspection](./S7.1.md)
- [S8 — User preset registry, persistence, import/export, and recovery](./S8.md)

- [S9 — Enemy Lab preset management editor MVP](./S9.md)
- [S9.1 — Restore Enemy Lab visibility and mount path](./S9.1.md)
- [S9.2 — Prove and restore actual Enemy Lab runtime mounting](./S9.2.md)
- [S10 — State and transition authoring](./S10.md)

- [S11 — FSM preview workflow, runtime diagnostics, and integration closeout](./S11.md)
- [U0 — Appearance/FSM spawn contract decoupling](./U0.md)
- [U0.1 — Group FSM spawn propagation fix](./U0.1.md)
- [U0.2 — Browser group FSM selection fix](./U0.2.md)
- [U1.1 — SIMPLE / SMART / FSM mode split](./U1.1.md)
- [U1.2 — FSM Presets and Basic Setup workflow](./U1.2.md)
- [U1.3 — Basic Setup as part of all Enemy Lab presets](./U1.3.md)
- [U1.3.1 — Preserve FSM behavior across Basic Setup changes](./U1.3.1.md)
- [U1.3.2 — Remove preset-default Count dependency](./U1.3.2.md)
- [U1.3.3 — Real scrollX for group-anchor FSM transitions](./U1.3.3.md)
- [U1.4 — Simplified sequential FSM LAB UI/model](./U1.4.md)
- [U1.4.1 — FSM LAB preset binding and inline state editors](./U1.4.1.md)
- [U1.4.2 — FSM LAB state interactivity](./U1.4.2.md)
- [U1.4.3 — Polish FSM LAB controls and spawn current draft](./U1.4.3.md)
- [U1.4.4 — Compact FSM LAB layout, diagnostics, Count, and Speed runtime fixes](./U1.4.4.md)
- [A1.1 — Live FSM runtime diagnostics](./A1.1.md)
- [U1.4.5 — Group draft behavior fix and Enemy Lab layout refinement](./U1.4.5.md)
- [U1.4.6 — State formation/speed runtime wiring and side-panel fixes](./U1.4.6.md)
- [U1.4.7 — Authoritative Speed, Diagnostics content, and initial Preset lifecycle](./U1.4.7.md)
