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
