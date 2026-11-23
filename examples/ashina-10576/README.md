# Team 10576 demonstration

This editable example illustrates what FRC Blockly Studio can express. It is secondary to the editor, not a standalone replacement for the team's evolving robot repository.

Load `blocks.json` with **Open JSON**. It contains four subsystems and 21 methods, using general blocks rather than custom Java or a dedicated shooter controller block.

- YAGSL field-oriented swerve, trigger scaling, tag 27 aiming, gyro reset, and a 180-degree heading change.
- Intake state gating, deployment/retraction, and cleanup.
- A two-motor flywheel with feeder, interpolated target speed, ramp, readiness, temperature/time limits, and a latched fault state expressed with ordinary math/state/motor blocks.
- Three climber motors with held controller bindings.
- PhotonVision pose configuration and PathPlanner `BS → shooter command → AS`, including intake marker events.

The five area/speed points are `0.15/85`, `0.35/78`, `0.55/70`, `0.70/65`, and `0.85/55`. The reference controller's 65 RPS cap is retained, so the larger table values do not produce requests above 65 RPS.

## Configuration and differences

The example uses Team 10576 hardware IDs and tuning from a source snapshot. Configure these for your own robot. In particular, the shooter is two SPARK MAX/NEO controllers, not an interchangeable generic motor assumption.

The current editor represents the main active functions with these differences:

- The heading-reset method owns the drive subsystem. Pressing Start can interrupt held A aiming; the original reset did not require the subsystem.
- The block shooter processes its request and output in a called method, whereas the reference split those across command execution and `periodic`. Output phase may differ by approximately one scheduler cycle.
- The fault indicator is numeric `Shooter/FaultCode` rather than the reference's text message.
- The editor emits explicit 35 A climber current limits; the reference climber did not explicitly configure that limit.
- The editor adds its own watchdog/cleanup, telemetry, autonomous chooser, and drive adapter. Full physical/timing equivalence was not established.

The inactive legacy LED, fixed-shot toggle, and old Start-to-intake behavior were not activated in this snapshot example. See the main [testing notes](../../docs/testing.md) for the distinction between generated-source compilation, logic comparisons, idealized runtime tests, and physical robot verification.
