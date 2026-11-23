# Third-party notices

The root MIT license applies to original FRC Blockly Studio code. It does not replace the licenses of bundled libraries, copied upstream helpers, or dependencies of an exported robot project. Keep the upstream notices when redistributing those files.

| Component | Use | Notice |
| --- | --- | --- |
| Google Blockly | Vendored browser editor, block definitions, messages, and media | [Blockly license](licenses/Blockly-LICENSE.txt) |
| JSZip | Browser-side project ZIP export | [JSZip license](licenses/JSZip-LICENSE.markdown) |
| Gradle wrapper | Embedded wrapper distributed in generated robot projects | [Gradle license](licenses/Gradle-LICENSE.txt), [notice](licenses/Gradle-NOTICE.txt) |
| WPILib | Generated robot project/API integration | [WPILib license](licenses/WPILib-LICENSE.txt) |
| Limelight helpers | Embedded runtime source included when needed by a generated project | [Limelight license](licenses/Limelight-LICENSE.txt) |
| Elastic | Embedded dashboard helper | [Elastic license](licenses/Elastic-LICENSE.txt) |
| PathPlanner | Robot project dependency and integration | [PathPlanner license](licenses/PathPlanner-LICENSE.txt) |
| Choreo | Robot project dependency and integration | [Choreo license](licenses/Choreo-LICENSE.txt) |

Vendor dependency descriptors refer to external libraries including YAGSL, CTRE Phoenix, REVLib, ReduxLib, Studica, ThriftyLib, PhotonVision, and dyn4j. Those libraries are resolved by the exported project's build and are not re-licensed by this repository. Consult the corresponding upstream distributions for their terms, hardware requirements, and any licensed features.

Source copyright headers in upstream helpers and generated templates are preserved. The example robot files are demonstrations of this editor; upstream robot-library notices still apply to their dependencies.
