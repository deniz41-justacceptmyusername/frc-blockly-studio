# Architecture and contributing

The editor is a static browser application. It does not execute user JavaScript or Java to generate code.

| Area | Files |
| --- | --- |
| Project schema, normalization, validation | `model.js`, `integrations-model.js` |
| Blockly definitions and typed compilation | `blocks.js`, `integrations-blocks.js`, `advanced-blocks.js`, `basic-motor-blocks.js` |
| Toolbox organization | `simple-toolbox.js` |
| Java and project generation | `generator.js`, `integration-generator.js`, `assets.js`, `integration-assets.js` |
| Runtime source templates | `templates/` |
| Robot/simulator metadata contract | `robot-contract.js` |
| Application and hardware forms | `app.js`, `studio-ui.js`, `advanced-ui.js` |
| Approximate browser preview | `studio-sim.js` |
| Vendored browser dependencies | `vendor/` |

## Compilation flow

The application normalizes a project, validates hardware and references, compiles each method's Blockly XML into typed Java expressions/statements, and assembles subsystem, container, robot, deploy, vendor, and Gradle files. The ZIP exporter packages the same file map shown by code inspection.

The Blockly schema and existing project values are separate from display labels. Preserve block type names, input/field IDs, project property names, vendor IDs, and the versioned schema when changing the interface. Invalid or stale hardware references must remain explicit errors rather than silently targeting another component.

Methods own their subsystem's hardware. The generator supplies command cleanup and disabled/mode-transition stopping. Periodic monitoring methods cannot contain motor writes. Calls are checked transitively; recursive method cycles and conflicting hardware resources are rejected.

## Templates

The static browser cannot read local template files directly from `file://`, so runtime templates are also embedded in `integration-assets.js`. After changing `templates/*.java.txt`, run:

```sh
python scripts/sync-templates.py
```

Commit the updated template and embedded asset together. The script updates the template section while preserving the other bundled upstream helpers, dependency descriptors, and license notices.

## Contributions

Run the browser suites for editor/compiler changes. For changes to generated Java APIs or units, also compile representative exported projects against the declared WPILib/vendor versions and run the relevant HAL/runtime tests. A browser assertion that checks generated text alone does not establish vendor API compatibility or physical behavior.

Keep the editor hardware-configurable and use general operations. Add a supported device adapter or reusable primitive when needed; do not hard-code one team's mechanism algorithm into the generator. Example algorithms belong in editable example project files.
