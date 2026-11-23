# Test sources

See [Testing](../docs/testing.md) for setup, commands, coverage, and verification limits.

The browser suites test the current editor and generate robot fixtures from the current code generator. The Python runner compiles those fixtures against a local WPILib 2026 installation and matching vendor libraries, then runs selected HAL/runtime scenarios.

Generated projects, native libraries, downloaded dependencies, and test reports are intentionally excluded from version control. Tests do not connect to or deploy to a physical robot.
