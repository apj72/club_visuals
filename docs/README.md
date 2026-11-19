# Club Visuals documentation

Start here when learning the app or planning its next UI. These references were
checked against the source on **10 November 2026**.

The **[current illustrated user guide](user-guide/index.html)** was rebuilt for
the redesigned interface on **19 November 2026**: 12 chapters, 21 Docshots images,
complete task walkthroughs and a [printable PDF](../output/pdf/club-visuals-user-guide.pdf).
Start there for operating the current app; the references below retain their
own source-review dates.

| Read | Purpose |
| --- | --- |
| [Text-driven playlist sequence builder](design/sequence-builder/README.md) | New design study: `.cvseq` show syntax, linked editor/timeline mockup, reusable looks and branding, seeded generation, and continuous layout-transition proposals. |
| [New UI design proposal](design/README.md) | Interactive prototype, Mac/iPad mockups, wireframes and a feature-mapped design specification. Proposed design, separate from the current app. |
| [Reversible UI implementation plan](design/implementation-plan.md) | Separate test environment, optional new UI route, preservation of the existing UI/engine, backups, phased delivery and rollback runbooks. |
| [Product reference](product-reference.md) | What the repository does, every feature area, operating workflows, iPad control and current limitations. |
| [UI redesign reference](ui-redesign-reference.md) | Screen inventory, action scope, control states, interaction requirements and a redesign acceptance checklist. |
| [Technical reference](technical-reference.md) | Code ownership, rendering and command paths, APIs, saved data, browser storage, deployment and tests. |
| [Transition catalogue](transition-catalogue.md) | All 61 effect names, saved IDs, descriptions, parameter ranges/defaults and warning labels, generated from the registry. |
| [Repository README](../README.md) | Setup and practical operating instructions. |

For a redesign, read the product reference first, then use the UI reference as
the feature-preservation checklist. The technical reference identifies the code
and data contracts that a replacement interface must continue to support.

## Older guides and plans

- Earlier guide screenshots remain under `docs/screenshots/` for historical
  reference. The current guide uses `user-guide/assets/screenshots/`.
- [Transition implementation plan](transition-roadmap.md): describes the
  delivered 50-effect catalogue and later transition automation proposals.
- [Sound-to-visuals plan](sound-to-visuals-plan.md): research, historical baseline
  and planned extensions to Auto Perform. Some sections describe the app before
  the current implementation; they are not a current feature inventory.

The references distinguish working behaviour, known gaps and proposed UI
improvements. Proposed improvements are not promises that the app already
implements them.

## Current visual references

Captured at an iPad-sized 1280×900 viewport on 10 November 2026. Library size
and classifications are installation-specific, not sample data bundled with a
clean checkout.

- [Classification manager](screenshots/13-classification-manager.png)
- [Independent video review and editable tag chips](screenshots/14-classification-review.png)
- [Sticky iPad toolbar](screenshots/15-ipad-remote-toolbar.png), shown with the
  controller connected and the output/engine offline to illustrate separate states.
