# Testing

## Browser tests

Use Node.js 20 or newer and the pinned dependencies in `package.json`:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:basic
npm run test:regression
npm run test:integration
```

The tests open the local application and exercise the model/compiler, forms, editing, import/export, examples, and approximate preview. They generate current fixtures instead of depending on previously exported robot folders.

`CHROME_BINARY` selects an installed Chrome/Chromium executable. `FRC_TEST_OUTPUT` selects an output directory; otherwise results go to `tests-v3/test-output`. The browser suites do not require a robot or download Java libraries.

## Real Java and HAL/runtime tests

```sh
python tests-v3/run_java.py --suite all
```

Run the browser fixture generator first. Both commands must use the same `FRC_TEST_OUTPUT` value.

| Variable | Purpose |
| --- | --- |
| `WPILIB_HOME` | WPILib 2026 directory containing `maven` and `jdk` |
| `JAVA_HOME` | Optional Java 17 JDK override |
| `FRC_VENDOR_JARS` | Matching vendor JAR files/directories, separated by the platform path separator |
| `FRC_NATIVE_PATH` | Optional native-library directories or release ZIP archives |
| `FRC_TEST_OUTPUT` | Shared generated fixtures and test results directory |

Available suites are `compile`, `runtime`, `paths`, `tank`, and `openloop`; `all` runs them together. Use `--suite compile --fixture NAME` to compile one fixture. The runner never silently downloads dependencies or deploys to a robot.

Match the dependency versions declared by the generated project. The test matrix uses WPILib 2026, Phoenix 5/6, REVLib, ReduxLib, Studica, ThriftyLib, YAGSL/dyn4j, PhotonVision, PathPlanner, Choreo, and Gson. Runtime suites additionally require compatible native libraries. Photon tests use official serialized results and native target/AprilTag/OpenCV support.

## Release verification

The English release was checked locally with all four browser suites: **119/119 checks passed** (25 editor/preview, 11 basic-block, 62 regression, and 21 integration checks). A clean `npm ci` installation also succeeded.

The current generator exported **19 fixture projects**, including the larger Team 10576 example. All 19 compiled against the real local WPILib/vendor JARs. The Java runner also passed **85 behavior checks**: 52 vision/physics/services, 10 PathPlanner/Choreo, 9 generated tank/odometry, and 14 tank/mecanum open-loop checks. This produced **24/24 successful compilation/runtime jobs**. The tank watchdog scenario intentionally leaves a command unfed and produces a MotorSafety warning while verifying that outputs stop.

The GitHub workflow runs the 119 browser checks on pushes and pull requests. It does not run the local Java/HAL matrix or deploy to hardware.

## Earlier verification

Before this repository release, local development verification reported 207 editor/behavior checks and 19 generated-project compilations. The larger Team 10576 example separately passed 24 project/preview checks and three PathPlanner/HAL checks. Its speed-map calculation matched WPILib interpolation across 200,016 samples, and its generated shooter mathematics matched the hardware-independent reference control across 360,000 steps.

These are historical, scoped results. They are not a claim that every robot, controller mode, vendor firmware, or future edit has been tested. The repository's browser workflow provides current browser results; Java/HAL coverage requires the external setup above.

## Limits of the evidence

The Java runner uses the real JavaCompiler API. This avoided a Windows sandbox JAR-close access problem encountered during development; it does not establish that normal Gradle packaging/deployment succeeded in that environment.

Path-following tests use ideal kinematics and test mechanism outputs. Shooter mathematics comparisons use supplied sensor values and recorded outputs. Browser motor response is approximate. Physical roboRIO, CAN devices, cameras, mechanical calibration, and actual PID gains were not validated by those tests. A complete separate simulator application is not part of this project.
