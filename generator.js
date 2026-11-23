'use strict';
FRC.instance = ss => 'frc_ss_'+ss.name;
FRC.javaNumber = n => /^[+-]?\d+$/.test(String(n))?n+'.0':String(n);
FRC.genSubsystem = (p,ss,compiled) => {
  const j=FRC.javaNumber,q=FRC.s,isSwerve=p.drive.type==='swerve'&&p.drive.subsystem===ss.name;
  const imports=new Set(['edu.wpi.first.wpilibj2.command.SubsystemBase','edu.wpi.first.wpilibj.DriverStation','edu.wpi.first.wpilibj.Timer','edu.wpi.first.wpilibj.smartdashboard.SmartDashboard','frc.robot.RobotIO']);
  let fields='',init='',helpers='',periodic='';
  const extra=FRC.extraSubsystem?.(p,ss,compiled)||{};
  if(extra.imports)extra.imports.forEach(x=>imports.add(x));
  imports.add('frc.robot.runtime.RobotServices');
  for(const v of compiled.vars){const initial=[...compiled.methods.values()].flatMap(m=>[...(m.initials||[])]).find(([name])=>name===v)?.[1]??0;fields+='    private double frc_var_'+v+' = '+j(initial)+';\n';}
  for(const c of ss.components){
    const n=c.name;
    if(c.type==='motor'){
      const fam=FRC.motorFamily(c.motorType);let set,stop;
      if(fam==='fx'){
        ['hardware.TalonFX','configs.TalonFXConfiguration','controls.DutyCycleOut','controls.VelocityVoltage','controls.TorqueCurrentFOC','signals.NeutralModeValue','signals.InvertedValue'].forEach(x=>imports.add('com.ctre.phoenix6.'+x));
        fields+=`    private final TalonFX ${n} = new TalonFX(${c.canId}, new com.ctre.phoenix6.CANBus(${q(c.canbus)}));
    private final DutyCycleOut frc_duty_${n} = new DutyCycleOut(0.0);
    private final VelocityVoltage frc_vel_${n} = new VelocityVoltage(0.0);
    private final TorqueCurrentFOC frc_cur_${n} = new TorqueCurrentFOC(0.0);
    private final boolean frc_ready_${n};
    private boolean frc_lastOk_${n}=true;
`;
        init+=`        var frc_cfg_${n} = new TalonFXConfiguration();
        frc_cfg_${n}.MotorOutput.NeutralMode = NeutralModeValue.${c.brake?'Brake':'Coast'};
        frc_cfg_${n}.MotorOutput.Inverted = InvertedValue.${c.inverted?'Clockwise_Positive':'CounterClockwise_Positive'};
        frc_cfg_${n}.CurrentLimits.SupplyCurrentLimitEnable = ${c.currentLimitEnabled!==false};
        frc_cfg_${n}.CurrentLimits.SupplyCurrentLimit = ${j(c.currentLimit)};
        frc_cfg_${n}.CurrentLimits.StatorCurrentLimitEnable = ${c.currentLimitEnabled!==false};
        frc_cfg_${n}.CurrentLimits.StatorCurrentLimit = ${j(c.currentLimit)};
        frc_cfg_${n}.Slot0.kP = ${j(c.p)};
        frc_cfg_${n}.Slot0.kI = ${j(c.i)};
        frc_cfg_${n}.Slot0.kD = ${j(c.d)};
        frc_cfg_${n}.Slot0.kV = ${j(c.ff)};
${c.motion?.configured?`        frc_cfg_${n}.MotionMagic.MotionMagicCruiseVelocity = ${j(c.motion.cruise)};
        frc_cfg_${n}.MotionMagic.MotionMagicAcceleration = ${j(c.motion.acceleration)};
        frc_cfg_${n}.MotionMagic.MotionMagicJerk = ${j(c.motion.jerk)};
`:''}
        frc_ready_${n} = ${n}.getConfigurator().apply(frc_cfg_${n}).isOK();
        if (!frc_ready_${n}) DriverStation.reportError(${q(ss.name+'.'+n+': TalonFX configuration failed; outputs inhibited.')}, false);
`;
        set=`if (frc_ready_${n}) ${n}.setControl(frc_duty_${n}.withOutput(RobotIO.percent(value)));`;stop=n+'.stopMotor();';
        helpers+=`    public void frc_velocity_${n}(double rps) { frc_lastOk_${n}=frc_ready_${n}&&${n}.setControl(frc_vel_${n}.withVelocity(RobotIO.bounded(rps, ${j(c.maxRps)}))).isOK(); }
    public void frc_current_${n}(double amps) { if (frc_ready_${n}) ${n}.setControl(frc_cur_${n}.withOutput(RobotIO.bounded(amps, ${j(c.currentLimit)}))); }
`;
      }else if(fam==='max'||fam==='flex'){
        const type=fam==='max'?'SparkMax':'SparkFlex',cfg=type+'Config';
        ['com.revrobotics.spark.'+type,'com.revrobotics.spark.config.'+cfg,'com.revrobotics.spark.SparkLowLevel.MotorType','com.revrobotics.spark.SparkBase.ControlType','com.revrobotics.spark.config.SparkBaseConfig.IdleMode','com.revrobotics.ResetMode','com.revrobotics.PersistMode','com.revrobotics.REVLibError'].forEach(x=>imports.add(x));
        fields+=`    private final ${type} ${n} = new ${type}(${c.canId}, MotorType.${FRC.isBrushless(c)?'kBrushless':'kBrushed'});
    private final boolean frc_ready_${n};
    private boolean frc_lastOk_${n}=true;
`;
        init+=`        var frc_cfg_${n} = new ${cfg}();
        frc_cfg_${n}.inverted(${c.inverted}).idleMode(IdleMode.${c.brake?'kBrake':'kCoast'}).smartCurrentLimit(${c.currentLimit});
        frc_cfg_${n}.closedLoop.pid(${j(c.p)}, ${j(c.i)}, ${j(c.d)});
        frc_cfg_${n}.closedLoop.feedForward.kV(${j(c.ff)});
        frc_cfg_${n}.closedLoop.outputRange(${j(c.outputMin??-1)},${j(c.outputMax??1)});
${c.secondaryCurrent!==undefined?`        frc_cfg_${n}.secondaryCurrentLimit(${j(c.secondaryCurrent)});\n`:''}${c.voltageCompensation!==undefined?`        frc_cfg_${n}.voltageCompensation(${j(c.voltageCompensation)});\n`:''}
${c.motion?.configured?`        frc_cfg_${n}.closedLoop.maxMotion.cruiseVelocity(${j(c.motion.cruise*60)}).maxAcceleration(${j(c.motion.acceleration*60)}).allowedProfileError(${j(c.motion.tolerance)});
`:''}
        frc_ready_${n} = ${n}.configure(frc_cfg_${n}, ResetMode.kResetSafeParameters, PersistMode.${c.persistConfiguration?'kPersistParameters':'kNoPersistParameters'}) == REVLibError.kOk;
        if (!frc_ready_${n}) DriverStation.reportError(${q(ss.name+'.'+n+': SPARK configuration failed; outputs inhibited.')}, false);
`;
        set=`if (frc_ready_${n}) ${n}.set(RobotIO.percent(value));`;stop=n+'.stopMotor();';
        helpers+=`    public void frc_velocity_${n}(double rps) { frc_lastOk_${n}=frc_ready_${n}&&${n}.getClosedLoopController().setSetpoint(RobotIO.bounded(rps, ${j(c.maxRps)}) * 60.0, ControlType.kVelocity)==REVLibError.kOk; }
    public void frc_current_${n}(double amps) { if (frc_ready_${n}) ${n}.getClosedLoopController().setSetpoint(RobotIO.bounded(amps, ${j(c.currentLimit)}), ControlType.kCurrent); }
`;
      }else if(fam==='srx'||fam==='spx'){
        const type=fam==='srx'?'WPI_TalonSRX':'WPI_VictorSPX';
        imports.add('com.ctre.phoenix.motorcontrol.can.'+type);imports.add('com.ctre.phoenix.motorcontrol.NeutralMode');
        fields+=`    private final ${type} ${n} = new ${type}(${c.canId});
`;
        init+=`        ${n}.setInverted(${c.inverted});
        ${n}.setNeutralMode(NeutralMode.${c.brake?'Brake':'Coast'});
`;
        if(fam==='srx')init+=`        ${n}.configContinuousCurrentLimit(${c.currentLimit});
        ${n}.enableCurrentLimit(true);
`;
        set=n+'.set(RobotIO.percent(value));';stop=n+'.stopMotor();';
      }else{
        imports.add('edu.wpi.first.wpilibj.motorcontrol.'+c.motorType);
        fields+=`    private final ${c.motorType} ${n} = new ${c.motorType}(${c.pwmChannel});
`;init+=`        ${n}.setInverted(${c.inverted});
`;set=n+'.set(RobotIO.percent(value));';stop=n+'.stopMotor();';
      }
      helpers+=`    public void frc_set_${n}(double value) { ${set} }
    public void frc_stop_${n}() { ${stop} }
`;
    }else if(c.type==='limitswitch'){
      imports.add('edu.wpi.first.wpilibj.DigitalInput');fields+=`    private final DigitalInput ${n} = new DigitalInput(${c.dioChannel});
`;
    }else if(c.type==='encoder'){
      const parent=ss.components.find(x=>x.name===c.parentMotor),fam=FRC.motorFamily(parent?.motorType);let position,velocity;
      if(c.encType==='builtin'){
        if(fam==='fx'){position=parent.name+'.getPosition().getValueAsDouble()';velocity=parent.name+'.getVelocity().getValueAsDouble() * 60.0';}
        else {position=parent.name+'.getEncoder().getPosition()';velocity=parent.name+'.getEncoder().getVelocity()';}
      }else if(c.encType==='throughbore_attached'){
        position=parent.name+'.getAbsoluteEncoder().getPosition()';velocity=parent.name+'.getAbsoluteEncoder().getVelocity()';
      }else if(c.encType==='cancoder'){
        imports.add('com.ctre.phoenix6.hardware.CANcoder');fields+=`    private final CANcoder ${n} = new CANcoder(${c.canId}, new com.ctre.phoenix6.CANBus(${q(c.canbus)}));
`;position=n+'.getAbsolutePosition().getValueAsDouble()';velocity=n+'.getVelocity().getValueAsDouble() * 60.0';
      }else if(c.encType==='canandmag'){
        imports.add('com.reduxrobotics.sensors.canandmag.Canandmag');fields+=`    private final Canandmag ${n} = new Canandmag(${c.canId});
`;position=n+'.getAbsPosition()';velocity=n+'.getVelocity() * 60.0';
      }else if(c.encType==='quadrature'){
        imports.add('edu.wpi.first.wpilibj.Encoder');fields+=`    private final Encoder ${n} = new Encoder(${c.channelA}, ${c.channelB});\n`;init+=`        ${n}.setDistancePerPulse(1.0 / ${j(c.countsPerRev)});\n`;position=n+'.getDistance()';velocity=n+'.getRate() * 60.0';
      }else{
        imports.add('edu.wpi.first.wpilibj.DutyCycleEncoder');fields+=`    private final DutyCycleEncoder ${n} = new DutyCycleEncoder(${c.dioChannel});
    private double frc_previous_${n} = Double.NaN;
    private double frc_time_${n} = Timer.getFPGATimestamp();
    private double frc_rpm_${n};
`;position=n+'.get()';velocity='frc_rpm_'+n;
        periodic+=`        double frc_now_${n} = Timer.getFPGATimestamp();
        double frc_pos_${n} = ${n}.get();
        double frc_dt_${n} = frc_now_${n} - frc_time_${n};
        if (Double.isFinite(frc_previous_${n}) && frc_dt_${n} > 0.0001) {
            frc_rpm_${n} = edu.wpi.first.math.MathUtil.inputModulus(frc_pos_${n} - frc_previous_${n}, -0.5, 0.5) / frc_dt_${n} * 60.0;
        }
        frc_previous_${n} = frc_pos_${n}; frc_time_${n} = frc_now_${n};
`;
      }
      const sign=c.inverted?'-1.0':'1.0';
      helpers+=`    public double frc_${n}Position() { return ${sign} * (${position}); }
    public double frc_${n}RPM() { return ${sign} * (${velocity}); }
`;
    }
  }
  if(isSwerve){
    ['java.io.File','edu.wpi.first.wpilibj.Filesystem','edu.wpi.first.math.geometry.Pose2d','edu.wpi.first.math.geometry.Translation2d','edu.wpi.first.math.kinematics.ChassisSpeeds','edu.wpi.first.wpilibj.smartdashboard.Field2d','swervelib.SwerveDrive','swervelib.parser.SwerveParser','swervelib.telemetry.SwerveDriveTelemetry'].forEach(x=>imports.add(x));
    fields+=`    private final SwerveDrive swerveDrive;
    private final Field2d frc_field = new Field2d();
    private double frc_lastDrive;
`;
    init+=`        SwerveDriveTelemetry.verbosity = SwerveDriveTelemetry.TelemetryVerbosity.HIGH;
        try {
            swerveDrive = new SwerveParser(new File(Filesystem.getDeployDirectory(), "swerve"))
                .createSwerveDrive(${j(p.swerveConfig.maxSpeed)}, new Pose2d());
        } catch (Exception e) {
            DriverStation.reportError("Swerve configuration could not be loaded: " + e.getMessage(), e.getStackTrace());
            throw new IllegalStateException("Swerve configuration failed", e);
        }
        swerveDrive.setHeadingCorrection(false);
        swerveDrive.setCosineCompensator(${p.swerveConfig.cosineCompensator===false?'false':'!edu.wpi.first.wpilibj.RobotBase.isSimulation()'});
        swerveDrive.setMotorIdleMode(true);
        RobotIO.setGyroAccess(() -> swerveDrive.getYaw().getDegrees(), swerveDrive::zeroGyro);
        SmartDashboard.putData("Field", frc_field);
`;
    helpers+=`    /** Normalized inputs: forward, left, counterclockwise. */
    public void drive(double forward, double left, double rotation, boolean fieldRelative) {
        frc_lastDrive = Timer.getFPGATimestamp();
        swerveDrive.drive(new Translation2d(RobotIO.percent(forward) * ${j(p.swerveConfig.maxSpeed)},
            RobotIO.percent(left) * ${j(p.swerveConfig.maxSpeed)}),
            RobotIO.percent(rotation) * swerveDrive.getMaximumChassisAngularVelocity(), fieldRelative, false);
    }
    public SwerveDrive getSwerveDrive() { return swerveDrive; }
    public Pose2d getPose() { return swerveDrive.getPose(); }
`;
    periodic+=`        if (!DriverStation.isEnabled() || Timer.getFPGATimestamp() - frc_lastDrive > 0.1) swerveDrive.drive(new ChassisSpeeds());
        frc_field.setRobotPose(swerveDrive.getPose());
`;
  }
  for(const m of ss.methods.filter(m=>['periodic','always'].includes(m.role)))periodic+=`        ${m.role==='always'?'':'if (DriverStation.isEnabled()) '}${m.name}();
`;
  // Stop all motor outputs on cancellation, disable, mode transitions, or auto completion.
  let stop=ss.components.filter(c=>c.type==='motor').map(c=>'        frc_stop_'+c.name+'();\n').join('');
  if(isSwerve)stop+='        swerveDrive.drive(new ChassisSpeeds());\n';
  fields+=extra.fields||'';init+=extra.init||'';helpers+=extra.helpers||'';periodic+=extra.periodic||'';stop+=extra.stop||'';
  const methods=ss.methods.map(m=>`    public void ${m.name}() {
${compiled.methods.get(m.name).code}    }
`).join('\n');
  return `package frc.robot.subsystems;

${[...imports].sort().map(x=>'import '+x+';').join('\n')}

public class ${ss.name} extends SubsystemBase ${extra.implements?'implements '+extra.implements:''} {
${fields}
    public ${ss.name}() {
${init}    }

${helpers}
    public void stopAll() {
${stop}    }

${methods}
    @Override public void periodic() {
${periodic}    }
    @Override public void simulationPeriodic() {
${extra.simulation||''}    }
}
`;
};
FRC.genRobotIO = p => {
  const g=p.swerveConfig.gyro,q=FRC.s;let init='';
  if(p.drive.type!=='swerve'&&g.type!=='none'){
    const constructors={adis16470:'new edu.wpi.first.wpilibj.ADIS16470_IMU()',adis16448:'new edu.wpi.first.wpilibj.ADIS16448_IMU()',adxrs450:'new edu.wpi.first.wpilibj.ADXRS450_Gyro()',pigeon2:'new com.ctre.phoenix6.hardware.Pigeon2('+g.id+', new com.ctre.phoenix6.CANBus('+q(g.canbus)+'))',navx_spi:'new com.studica.frc.AHRS(com.studica.frc.AHRS.NavXComType.kMXP_SPI)',canandgyro:'new com.reduxrobotics.sensors.canandgyro.Canandgyro('+g.id+')'};
    const angle=g.type==='adis16470'?'gyro.getAngle()':g.type==='adis16448'?'(-gyro.getGyroAngleZ())':'gyro.getRotation2d().getDegrees()';
    init=`        var gyro = ${constructors[g.type]};
        setGyroAccess(() -> ${g.inverted?'-':''}${angle}, () -> ${g.type==='canandgyro'?'gyro.setYaw(0.0)':'gyro.reset()'});
`;
  }
  return `package frc.robot;

import java.util.function.DoubleSupplier;
import edu.wpi.first.wpilibj.XboxController;
import edu.wpi.first.math.MathUtil;

public final class RobotIO {
    private RobotIO() {}
    public static final XboxController driver = new XboxController(${p.controllerPort});
    public static final XboxController operator = new XboxController(${p.integrations.operator.port});
    private static DoubleSupplier heading = () -> 0.0;
    private static Runnable zero = () -> {};
    private static boolean simulatedHeading;
    private static double simulatedDegrees;
    public static void initializeGyro() {
${init}    }
    public static void setGyroAccess(DoubleSupplier getter, Runnable reset) { heading = getter; zero = reset; }
    public static double headingDegrees() { return simulatedHeading?simulatedDegrees:heading.getAsDouble(); }
    public static void zeroGyro() { zero.run();if(simulatedHeading)simulatedDegrees=0; }
    public static void simulateHeading(double omegaRadiansPerSecond,double dt) { if(edu.wpi.first.wpilibj.RobotBase.isSimulation()){simulatedHeading=true;if(Double.isFinite(omegaRadiansPerSecond))simulatedDegrees+=Math.toDegrees(omegaRadiansPerSecond*dt);} }
    public static double bounded(double value, double limit) { return Double.isFinite(value) ? MathUtil.clamp(value, -limit, limit) : 0.0; }
    public static double percent(double value) { return bounded(value, 1.0); }
    public static double axis(double value) { return MathUtil.applyDeadband(percent(value), ${FRC.javaNumber(p.swerveConfig.deadband)}); }
}
`;
};
FRC.genContainerLegacy = p => {
  const instance=FRC.instance,find=path=>{const [ss,m]=path.split('.');return {ss:p.subsystems.find(s=>s.name===ss),m};};
  const reference=path=>{const {ss,m}=find(path);return instance(ss)+'::'+m;};
  let fields=p.subsystems.map(ss=>'    private final '+ss.name+' '+instance(ss)+' = new '+ss.name+'();\n').join('');
  let init='        RobotIO.initializeGyro();\n',bindings='';
  for(const ss of p.subsystems){
    const method=ss.methods.find(m=>m.role==='default');
    if(method)init+=`        ${instance(ss)}.setDefaultCommand(Commands.run(() -> {
            if (DriverStation.isTeleopEnabled()) ${instance(ss)}.${method.name}();
            else ${instance(ss)}.stopAll();
        }, ${instance(ss)}).finallyDo(interrupted -> ${instance(ss)}.stopAll()));
`;
  }
  if(p.drive.type==='swerve'){
    const sw=p.subsystems.find(s=>s.name===p.drive.subsystem),v=instance(sw),scale=FRC.javaNumber(p.drive.scale);
    init+=`        ${v}.setDefaultCommand(Commands.run(() -> {
            if (DriverStation.isTeleopEnabled()) ${v}.drive(
                -RobotIO.axis(RobotIO.driver.getLeftY()) * ${scale},
                -RobotIO.axis(RobotIO.driver.getLeftX()) * ${scale},
                -RobotIO.axis(RobotIO.driver.getRightX()) * ${scale}, ${p.drive.fieldRelative});
            else ${v}.stopAll();
        }, ${v}).finallyDo(interrupted -> ${v}.stopAll()));
`;
  }
  if(['differential','mecanum'].includes(p.drive.type)){
    const differential=p.drive.type==='differential',slots=differential?['left','right']:['frontleft','backleft','frontright','backright'];
    const writer=slot=>'value -> { '+p.drive.motors[slot].map(path=>{const [ss,n]=path.split('.');return 'frc_ss_'+ss+'.frc_set_'+n+'(value);';}).join(' ')+' }';
    fields+=`    private final edu.wpi.first.wpilibj.drive.${differential?'DifferentialDrive':'MecanumDrive'} frc_drive = new edu.wpi.first.wpilibj.drive.${differential?'DifferentialDrive':'MecanumDrive'}(
        ${slots.map(writer).join(',\n        ')});
`;
    const driveSS=[...new Set(slots.flatMap(slot=>p.drive.motors[slot]).map(path=>path.split('.')[0]))].map(n=>'frc_ss_'+n),req=driveSS.join(', ');
    init+=`        frc_drive.setDeadband(0.0);
        frc_drive.setMaxOutput(${FRC.javaNumber(p.drive.scale)});
        var frc_driveCommand = Commands.run(() -> {
            if (DriverStation.isTeleopEnabled()) frc_drive.${differential?'arcadeDrive(-RobotIO.axis(RobotIO.driver.getLeftY()), RobotIO.axis(RobotIO.driver.getRightX()), false)':'driveCartesian(-RobotIO.axis(RobotIO.driver.getLeftY()), RobotIO.axis(RobotIO.driver.getLeftX()), RobotIO.axis(RobotIO.driver.getRightX()))'};
            else frc_drive.stopMotor();
        }, ${req}).finallyDo(interrupted -> frc_drive.stopMotor());
${driveSS.map(v=>'        '+v+'.setDefaultCommand(frc_driveCommand);\n').join('')}`;
  }
  for(const b of p.controllerBindings){
    const trigger='frc_controller.'+b.button+'()';
    if(b.type==='zeroGyro'){
      const sw=p.drive.type==='swerve'?', frc_ss_'+p.drive.subsystem:'';
      bindings+=`        ${trigger}.onTrue(Commands.runOnce(RobotIO::zeroGyro${sw}));
`;continue;
    }
    const {ss}=find(b.methodPath),v=instance(ss),end=b.stopMethod?find(b.stopMethod):null,req=[...new Set([v,...(end?[instance(end.ss)]:[])])].join(', ');
    if(b.trigger==='whileTrue'){
      const cleanup=end?instance(end.ss)+'.'+end.m+'(); ':'';
      bindings+=`        ${trigger}.whileTrue(Commands.run(${reference(b.methodPath)}, ${req})
            .finallyDo(interrupted -> { try { ${cleanup} } finally { ${[...new Set([v,...(end?[instance(end.ss)]:[])])].map(x=>x+'.stopAll();').join(' ')} } }));
`;
    }else if(b.trigger==='onFalse'&&end){
      bindings+=`        ${trigger}.onFalse(Commands.runOnce(() -> { ${reference(b.methodPath).replace('::','.')}(); ${instance(end.ss)}.${end.m}(); }, ${req}));
`;
    }else{
      bindings+=`        ${trigger}.${b.trigger}(Commands.runOnce(${reference(b.methodPath)}, ${v}));
`;
      if(b.stopMethod)bindings+=`        ${trigger}.onFalse(Commands.runOnce(${reference(b.stopMethod)}, ${instance(end.ss)}));
`;
    }
  }
  const auto=p.autonomous.map(step=>step.type==='wait'?'Commands.waitSeconds('+FRC.javaNumber(step.duration)+')':(()=>{const {ss}=find(step.methodPath);return 'Commands.run('+reference(step.methodPath)+', '+instance(ss)+').withTimeout('+FRC.javaNumber(step.duration)+').finallyDo(interrupted -> '+instance(ss)+'.stopAll())';})());
  return `package frc.robot;

import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Commands;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
${p.subsystems.map(ss=>'import frc.robot.subsystems.'+ss.name+';').join('\n')}

public class RobotContainer {
${fields}    private final CommandXboxController frc_controller = new CommandXboxController(${p.controllerPort});

    public RobotContainer() {
${init}        configureBindings();
    }
    private void configureBindings() {
${bindings}    }
    public void stopAll() {
${p.subsystems.map(ss=>'        '+instance(ss)+'.stopAll();\n').join('')}${['differential','mecanum'].includes(p.drive.type)?'        frc_drive.stopMotor();\n':''}    }
    public Command getAutonomousCommand() {
        return Commands.sequence(${auto.join(',\n            ')})
            .finallyDo(interrupted -> stopAll());
    }
}
`;
};
FRC.genRobotLegacy = () => `package frc.robot;

import edu.wpi.first.wpilibj.TimedRobot;
import edu.wpi.first.wpilibj.DataLogManager;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.CommandScheduler;

public class Robot extends TimedRobot {
    private RobotContainer container;
    private Command autonomous;
    @Override public void robotInit() {
        DataLogManager.start();
        DriverStation.startDataLog(DataLogManager.getLog());
        container = new RobotContainer();
    }
    @Override public void robotPeriodic() { CommandScheduler.getInstance().run(); }
    @Override public void disabledInit() { CommandScheduler.getInstance().cancelAll(); container.stopAll(); }
    @Override public void autonomousInit() {
        CommandScheduler.getInstance().cancelAll(); container.stopAll();
        autonomous = container.getAutonomousCommand();
        if (autonomous != null) CommandScheduler.getInstance().schedule(autonomous);
    }
    @Override public void teleopInit() {
        CommandScheduler.getInstance().cancelAll(); container.stopAll();
    }
    @Override public void testInit() { CommandScheduler.getInstance().cancelAll(); container.stopAll(); }
}
`;
FRC.swerveFiles = p => {
  const files={},sc=p.swerveConfig,json=(name,obj)=>files['src/main/deploy/swerve/'+name]=JSON.stringify(obj,null,2);
  json('swervedrive.json',{imu:{type:sc.gyro.type,id:sc.gyro.id,canbus:sc.gyro.canbus},invertedIMU:sc.gyro.inverted,modules:(sc.moduleOrder||FRC.moduleNames).map(n=>n+'.json')});
  for(const name of FRC.moduleNames){const m=sc.modules[name];json('modules/'+name+'.json',{
    location:m.location,absoluteEncoderOffset:m.encoder.offset,drive:{type:m.drive.type,id:m.drive.id,canbus:m.drive.canbus},angle:{type:m.angle.type,id:m.angle.id,canbus:m.angle.canbus},encoder:{type:m.encoder.type,id:m.encoder.id,canbus:m.encoder.canbus},inverted:{drive:m.drive.inverted,angle:m.angle.inverted},absoluteEncoderInverted:m.encoder.inverted
  });}
  json('modules/physicalproperties.json',{...(sc.extraPhysical||{}),optimalVoltage:12,currentLimit:{drive:sc.physical.driveCurrentLimit,angle:sc.physical.angleCurrentLimit},rampRate:{drive:0.25,angle:0.25},wheelGripCoefficientOfFriction:1.19,conversionFactors:{angle:{gearRatio:sc.physical.angleGearRatio,factor:0},drive:{diameter:sc.physical.wheelDiameter,gearRatio:sc.physical.driveGearRatio,factor:0}}});
  json('modules/pidfproperties.json',{drive:{p:sc.pid.driveP,i:sc.pid.driveI,d:sc.pid.driveD,f:0,iz:0},angle:{p:sc.pid.angleP,i:sc.pid.angleI,d:sc.pid.angleD,f:0,iz:0}});
  json('controllerproperties.json',{angleJoystickRadiusDeadband:sc.controller.angleDeadband,heading:{p:sc.controller.headingP,i:sc.controller.headingI,d:sc.controller.headingD}});
  return files;
};
FRC.buildFiles = p => {
  const check=FRC.compileAll(p);
  if(check.errors.length)throw Error(check.errors.join('\n'));
  const assets=FRC.assets,files={...assets.template},base='src/main/java/frc/robot/';
  files['build.gradle']=assets.buildGradle;
  files['.wpilib/wpilib_preferences.json']=JSON.stringify({enableCppIntellisense:false,currentLanguage:'java',projectYear:'2026',teamNumber:p.team},null,2);
  files['settings.gradle']=assets.template['settings.gradle'];
  files['gradle/wrapper/gradle-wrapper.jar']={base64:assets.wrapper};
  files[base+'Main.java']='package frc.robot;\nimport edu.wpi.first.wpilibj.RobotBase;\npublic final class Main { private Main() {} public static void main(String... args) { RobotBase.startRobot(Robot::new); } }\n';
  files[base+'Constants.java']='package frc.robot;\npublic final class Constants { private Constants() {} public static final int TEAM = '+p.team+'; }\n';
  files[base+'Robot.java']=FRC.genRobot(p);files[base+'RobotContainer.java']=FRC.genContainer(p);files[base+'RobotIO.java']=FRC.genRobotIO(p);
  for(const ss of p.subsystems)files[base+'subsystems/'+ss.name+'.java']=FRC.genSubsystem(p,ss,check.compiled.get(ss.name));
  const vendors=new Set(['commands']);
  const types=p.subsystems.flatMap(ss=>ss.components);
  const sc=p.swerveConfig,sw=p.drive.type==='swerve';
  if(sw){vendors.add('yagsl');vendors.add('rev');vendors.add('redux');vendors.add('thrifty');Object.assign(files,FRC.swerveFiles(p));}
  if(types.some(c=>c.type==='motor'&&FRC.motorFamily(c.motorType)==='fx'||c.type==='encoder'&&c.encType==='cancoder')||sc.gyro.type==='pigeon2'||sw&&FRC.moduleNames.some(n=>['drive','angle'].some(k=>/^(kraken|falcon|talon)/.test(sc.modules[n][k].type))||sc.modules[n].encoder.type==='cancoder'))vendors.add('ctre');
  if(types.some(c=>c.type==='motor'&&['max','flex'].includes(FRC.motorFamily(c.motorType))))vendors.add('rev');
  if(types.some(c=>c.type==='motor'&&['srx','spx'].includes(FRC.motorFamily(c.motorType)))){vendors.add('phoenix5');vendors.add('ctre');}
  if(types.some(c=>c.type==='encoder'&&c.encType==='canandmag')||sc.gyro.type==='canandgyro')vendors.add('redux');
  if(sc.gyro.type==='navx_spi')vendors.add('studica');
  for(const key of vendors){if(!assets.vendors[key])throw Error(key+' dependency was not found in the package.');files['vendordeps/'+assets.vendors[key].fileName]=JSON.stringify(assets.vendors[key],null,2);}
  Object.assign(files,FRC.integrationFiles(p));
  files['frc_project.json']=JSON.stringify(p,null,2);
  files['GENERATOR_NOTES.md']=`# FRC Blockly 2026\n\nTeam ${p.team}. WPILib / GradleRIO 2026.2.1, Java 17.\n\nOpen the project folder in WPILib VS Code 2026. Run Build Robot Code first. Use Simulate Robot Code for command / input checks. Build is not hardware calibration. First build needs internet for the pinned vendor dependencies and Gradle. No robot deployment is performed by the generator.\n\nDrive inputs use forward / left / counterclockwise; scale ${p.drive.scale}. Motor power is -1..1, velocity target RPS, encoder velocity RPM, position rotations; swerve locations and wheel diameter inches; offsets degrees. TalonFX velocity kV uses volts per RPS; SPARK velocity kV uses volts per RPM.\n\nADIS16470: SPI onboard CS0, yaw Z; ADIS16448: SPI MXP. Mount the IMU as its WPILib driver expects and confirm yaw sign. Reorienting IMU axes is not exposed in this version.\n\nHeld commands stop their subsystem motors on release or interruption. Stop methods run before the final stop. onTrue executes once and can leave a motor running until stopped. Default methods run during teleop only; periodic methods run while enabled and should be used for telemetry, not competing motor writes. Auto steps run in sequence and stop their motors when each step ends.\n\nSimulation is useful for scheduler and kinematics checks. Vendor / physics support varies by device; it does not validate wiring, offsets, motor direction, current limits or mechanism PID. Vision, PathPlanner, Choreo, telemetry and mechanism physics are generated when configured. See SIMULATION.md and INTEGRATIONS.md. Arbitrary custom code still requires a successful Build Robot Code before deployment.\n\n## Configuration notes\n${check.warnings.map(w=>'- '+w).join('\n')}\n\nProject can be reloaded using frc_project.json.\n`;
  return {files,check};
};
