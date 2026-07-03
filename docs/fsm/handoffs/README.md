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
