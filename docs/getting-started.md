# Getting started

## Configure a robot

Open `index.html` in Chrome or Edge. Keep the repository's files together; the HTML file depends on local JavaScript, vendor, media, and template assets.

Choose the team number, project name, driver-controller port, and drivetrain. Configure YAGSL modules for swerve. For tank or mecanum, select the drive motors and any encoder/gyro mappings required for odometry. Enter the actual device types, CAN buses, channels, directions, gear ratios, and offsets.

Create a subsystem for each mechanism. Add its motors and sensors, then create a method and connect its operations to the entry block. Component dropdowns refer to hardware owned by that subsystem. Motor velocity blocks use rotations per second; encoder velocity readings use RPM. Divide RPM by 60 when using an RPM calculation as a velocity command.

## Assemble behavior from basic blocks

For a flywheel, for example:

1. Compute a target speed with math and variables.
2. Read the motor speed and controller temperature.
3. Compare the measurements against your target and limits.
4. Use elapsed time and a bounded change to build a speed ramp.
5. Command the flywheel and enable a feeder only when your conditions are satisfied.
6. Create a stop method that stops outputs and resets the relevant state.

These are ordinary blocks and editable methods. There is no opaque mechanism controller that silently replaces this program.

## Bind controls and autonomous actions

Assign methods to controller buttons. Use a held binding for continuous output, and select the cleanup method to run when released or interrupted. A subsystem requirement prevents two scheduled commands from controlling the same mechanism simultaneously. Independent one-shot bindings are restricted to non-actuating state/telemetry methods.

Add timed methods, waits, or parallel methods from different subsystems to block autonomous. In the integrations panel, configure cameras, telemetry, and PathPlanner/Choreo imports. Include each autonomous file and its referenced path files. Bind named events to methods. A drive method cannot be used as a marker that interrupts its own moving path.

## Save, inspect, and export

Use **Save JSON** for portable project backups and **Open JSON** to restore them. Browser autosave is convenient but should not be your only copy.

Check the project, inspect the generated source, and export the robot ZIP. Open the extracted project in WPILib 2026. Install its declared vendor dependencies and build/simulate it before use. The editor validates supported structure and configuration; it cannot measure the robot's wiring, mechanical limits, physical calibration, or PID tuning.

Delete, duplicate, undo/redo, search, arrange, and zoom-to-fit controls are available above the Blockly workspace. Changes are saved when switching methods and subsystems.
