'use strict';
FRC.renderTemplate=(name,values={})=>{
  let s=FRC.integrationAssets.templates[name];if(s==null)throw Error('Missing runtime template: '+name);
  s=s.replace(/@@([A-Z_]+)@@/g,(m,k)=>{if(!(k in values))throw Error(name+': missing template field '+k);return String(values[k]);});return s;
};
FRC.dcMotor=(c,count=1)=>{const type=typeof c==='string'?c:c.simulation?.motorModel&&c.simulation.motorModel!=='auto'?c.simulation.motorModel:c.motorType;const factory=type.includes('X44')||type==='krakenx44'?'getKrakenX44':type.includes('Kraken')||type==='krakenx60'?'getKrakenX60':type.includes('Falcon')||type==='falcon500'?'getFalcon500':type.includes('Vortex')||type==='vortex'?'getNeoVortex':type.includes('550')?'getNeo550':type.includes('NEO')||type==='neo'?'getNEO':type==='775pro'?'getVex775Pro':'getCIM';return 'edu.wpi.first.math.system.plant.DCMotor.'+factory+'('+count+')';};
FRC.extraSubsystem=(p,ss,compiled)=>{
  const e={imports:[],fields:'',init:'',helpers:'',periodic:'',stop:'',simulation:''},j=FRC.javaNumber,q=FRC.s;
  const metric=(key,expression)=>{e.init+='        RobotServices.metric('+q(ss.name+'/'+key)+', () -> '+expression+');\n';};
  for(const c of ss.components){const n=c.name;
    if(c.type==='motor'){
      const family=FRC.motorFamily(c.motorType),isSpark=['max','flex'].includes(family),ready=family==='fx'||isSpark?'if (frc_ready_'+n+') ':'';
      e.helpers+=`    public void frc_voltage_${n}(double volts) { ${ready}${n}.setVoltage(RobotIO.bounded(volts, 12.0)); }\n`;
      if(family==='fx'){
        e.fields+=`    private final com.ctre.phoenix6.controls.PositionVoltage frc_pos_${n}=new com.ctre.phoenix6.controls.PositionVoltage(0.0);\n`;
        e.helpers+=`    public void frc_position_${n}(double turns) { if (frc_ready_${n} && Double.isFinite(turns)) ${n}.setControl(frc_pos_${n}.withPosition(turns)); }
    public void frc_zero_${n}(double turns) { if(Double.isFinite(turns)) ${n}.setPosition(turns); }
`;
        metric(n+'/positionRotations',n+'.getPosition().getValueAsDouble()');metric(n+'/velocityRps',n+'.getVelocity().getValueAsDouble()');metric(n+'/voltage',n+'.getMotorVoltage().getValueAsDouble()');metric(n+'/currentAmps',n+'.getStatorCurrent().getValueAsDouble()');
      }else if(isSpark){
        e.helpers+=`    public void frc_position_${n}(double turns) { if(frc_ready_${n} && Double.isFinite(turns)) ${n}.getClosedLoopController().setSetpoint(turns, ControlType.kPosition); }
    public void frc_zero_${n}(double turns) { if(Double.isFinite(turns)) ${n}.getEncoder().setPosition(turns); }
`;
        if(FRC.isBrushless(c)){metric(n+'/positionRotations',n+'.getEncoder().getPosition()');metric(n+'/velocityRps',n+'.getEncoder().getVelocity()/60.0');}
        metric(n+'/voltage',n+'.getAppliedOutput()*'+n+'.getBusVoltage()');metric(n+'/currentAmps',n+'.getOutputCurrent()');
      }else metric(n+'/dutyCycle',n+'.get()');
      if(p.integrations.sysid.enabled&&p.integrations.sysid.subsystem===ss.name&&p.integrations.sysid.motor===n){e.helpers+=`    public double frc_sysIdPosition(){return ${family==='fx'?n+'.getPosition().getValueAsDouble()':n+'.getEncoder().getPosition()'};}
    public double frc_sysIdVelocity(){return ${family==='fx'?n+'.getVelocity().getValueAsDouble()':n+'.getEncoder().getVelocity()/60.0'};}
    public double frc_sysIdVoltage(){return ${family==='fx'?n+'.getMotorVoltage().getValueAsDouble()':n+'.getAppliedOutput()*'+n+'.getBusVoltage()'};}
`;}
      if(c.motion?.configured){
        if(family==='fx'){
          e.fields+=`    private final com.ctre.phoenix6.controls.MotionMagicVoltage frc_mmPos_${n}=new com.ctre.phoenix6.controls.MotionMagicVoltage(0);
    private final com.ctre.phoenix6.controls.MotionMagicVelocityVoltage frc_mmVel_${n}=new com.ctre.phoenix6.controls.MotionMagicVelocityVoltage(0);
`;
          e.helpers+=`    public void frc_profilePosition_${n}(double turns){if(frc_ready_${n}&&Double.isFinite(turns))${n}.setControl(frc_mmPos_${n}.withPosition(turns));}
    public void frc_profileVelocity_${n}(double rps){if(frc_ready_${n})${n}.setControl(frc_mmVel_${n}.withVelocity(RobotIO.bounded(rps,${j(c.maxRps)})).withAcceleration(${j(c.motion.acceleration)}));}
`;
        }else if(isSpark)e.helpers+=`    public void frc_profilePosition_${n}(double turns){if(frc_ready_${n}&&Double.isFinite(turns))${n}.getClosedLoopController().setSetpoint(turns,ControlType.kMAXMotionPositionControl);}
    public void frc_profileVelocity_${n}(double rps){if(frc_ready_${n})${n}.getClosedLoopController().setSetpoint(RobotIO.bounded(rps,${j(c.maxRps)})*60.0,ControlType.kMAXMotionVelocityControl);}
`;
      }
      const sim={...FRC.physicsDefaults(),...c.simulation};
      if(sim.enabled){
        const model=sim.model||'flywheel',voltage=family==='fx'?n+'.getSimState().getMotorVoltage()':isSpark?n+'.getAppliedOutput() * edu.wpi.first.wpilibj.RobotController.getBatteryVoltage()':n+'.get() * edu.wpi.first.wpilibj.RobotController.getBatteryVoltage()';
        let feedback='';
        if(family==='fx')feedback+=`${n}.getSimState().setSupplyVoltage(edu.wpi.first.wpilibj.RobotController.getBatteryVoltage()); ${n}.getSimState().setRawRotorPosition(state.rotorRotations()); ${n}.getSimState().setRotorVelocity(state.rotorRps());`;
        if(isSpark&&FRC.isBrushless(c)){
          const type=family==='max'?'SparkMaxSim':'SparkFlexSim';
          e.fields+=`    private final com.revrobotics.sim.${type} frc_sparkSim_${n} = edu.wpi.first.wpilibj.RobotBase.isSimulation() ? new com.revrobotics.sim.${type}(${n}, ${FRC.dcMotor(c)}) : null;\n`;
          feedback+=`frc_sparkSim_${n}.iterate(state.rotorRps()*60.0, edu.wpi.first.wpilibj.RobotController.getBatteryVoltage(), 0.02);`;
        }
        for(const enc of ss.components.filter(x=>x.type==='encoder'&&x.encType==='quadrature'&&x.parentMotor===n))feedback+=`new edu.wpi.first.wpilibj.simulation.EncoderSim(${enc.name}).setDistance(state.rotorRotations()); new edu.wpi.first.wpilibj.simulation.EncoderSim(${enc.name}).setRate(state.rotorRps());`;
        feedback+=`RobotServices.publish(${q('/FRCStudio/Simulation/'+ss.name+'/'+n+'/mechanismPosition')}, state.mechanismPosition());`;
        e.fields+=`    private final frc.robot.runtime.MotorPhysics frc_physics_${n}=edu.wpi.first.wpilibj.RobotBase.isSimulation()?new frc.robot.runtime.MotorPhysics(${q(model)},${FRC.dcMotor(c)},${['gearing','inertia','mass','radius','length','min','max','initial'].map(k=>j(sim[k])).join(',')},()->${voltage},state->{${feedback}}):null;\n`;
        e.simulation+=`        if(frc_physics_${n}!=null)frc_physics_${n}.update(0.02);\n`;
      }
      continue;
    }
    if(!FRC.deviceDefinitions[c.type])continue;
    const module='edu.wpi.first.wpilibj.PneumaticsModuleType.'+c.moduleType;
    if(c.type==='servo'){e.fields+=`    private final edu.wpi.first.wpilibj.Servo ${n}=new edu.wpi.first.wpilibj.Servo(${c.pwmChannel});\n`;e.init+=`        ${n}.setAngle(${j(c.initialAngle)});\n`;e.helpers+=`    public double frc_read_${n}(){return ${n}.getAngle();}\n`;metric(n+'/commandedAngleDegrees',n+'.getAngle()');}
    if(c.type==='solenoid'){e.fields+=`    private final edu.wpi.first.wpilibj.Solenoid ${n}=new edu.wpi.first.wpilibj.Solenoid(${c.moduleId},${module},${c.channel});\n`;e.stop+=`        ${n}.set(false);\n`;metric(n+'/energized',n+'.get()?1.0:0.0');}
    if(c.type==='doublesolenoid'){e.fields+=`    private final edu.wpi.first.wpilibj.DoubleSolenoid ${n}=new edu.wpi.first.wpilibj.DoubleSolenoid(${c.moduleId},${module},${c.forwardChannel},${c.reverseChannel});\n`;e.stop+=`        ${n}.set(edu.wpi.first.wpilibj.DoubleSolenoid.Value.kOff);\n`;}
    if(c.type==='compressor'){e.fields+=`    private final edu.wpi.first.wpilibj.Compressor ${n}=new edu.wpi.first.wpilibj.Compressor(${c.moduleId},${module});\n`;e.init+=`        ${n}.${c.enabled?'enableDigital()':'disable()'};\n`;e.helpers+=`    public boolean frc_active_${n}(){return ${n}.isEnabled();}\n`;metric(n+'/pressureSwitch',n+'.getPressureSwitchValue()?1.0:0.0');}
    if(c.type==='digital'){e.fields+=`    private final edu.wpi.first.wpilibj.DigitalInput ${n}=new edu.wpi.first.wpilibj.DigitalInput(${c.dioChannel});\n`;e.helpers+=`    public boolean frc_active_${n}(){return ${c.activeLow?'!':''}${n}.get();}\n`;metric(n+'/active','frc_active_'+n+'()?1.0:0.0');}
    if(c.type==='analog'){e.fields+=`    private final edu.wpi.first.wpilibj.AnalogInput ${n}=new edu.wpi.first.wpilibj.AnalogInput(${c.analogChannel});\n`;e.helpers+=`    public double frc_read_${n}(){return ${n}.getVoltage()*${j(c.scale)}+${j(c.offset)};}\n`;metric(n+'/value','frc_read_'+n+'()');}
    if(c.type==='ultrasonic'){e.fields+=`    private final edu.wpi.first.wpilibj.Ultrasonic ${n}=new edu.wpi.first.wpilibj.Ultrasonic(${c.pingChannel},${c.echoChannel});\n`;e.init+='        edu.wpi.first.wpilibj.Ultrasonic.setAutomaticMode(true);\n';e.helpers+=`    public double frc_read_${n}(){return ${n}.isRangeValid()?${n}.getRangeMM()/1000.0:Double.NaN;}\n`;metric(n+'/rangeMeters','frc_read_'+n+'()');}
    if(c.type==='canrange'){e.fields+=`    private final com.ctre.phoenix6.hardware.CANrange ${n}=new com.ctre.phoenix6.hardware.CANrange(${c.canId},new com.ctre.phoenix6.CANBus(${q(c.canbus)}));\n`;e.helpers+=`    public double frc_read_${n}(){return ${n}.getDistance().getValueAsDouble();}\n`;metric(n+'/rangeMeters','frc_read_'+n+'()');}
    if(c.type==='relay'){e.fields+=`    private final edu.wpi.first.wpilibj.Relay ${n}=new edu.wpi.first.wpilibj.Relay(${c.relayChannel});\n`;e.stop+=`        ${n}.set(edu.wpi.first.wpilibj.Relay.Value.kOff);\n`;}
    if(c.type==='led'){e.fields+=`    private final edu.wpi.first.wpilibj.AddressableLED ${n}=new edu.wpi.first.wpilibj.AddressableLED(${c.pwmChannel});
    private final edu.wpi.first.wpilibj.AddressableLEDBuffer frc_buffer_${n}=new edu.wpi.first.wpilibj.AddressableLEDBuffer(${c.length});\n`;e.init+=`        ${n}.setLength(${c.length});${n}.setData(frc_buffer_${n});${n}.start();\n`;e.helpers+=`    public void frc_led_${n}(double r,double g,double b){for(int i=0;i<${c.length};i++)frc_buffer_${n}.setRGB(i,(int)Math.max(0,Math.min(255,r)),(int)Math.max(0,Math.min(255,g)),(int)Math.max(0,Math.min(255,b)));${n}.setData(frc_buffer_${n});}\n`;}
  }
  const controllers=new Map();for(const m of compiled.methods.values())for(const [name,gains]of m.controllers||[]){if(controllers.has(name)&&JSON.stringify(controllers.get(name))!==JSON.stringify(gains))throw Error(ss.name+': the same PID name cannot use different coefficients: '+name);controllers.set(name,gains);}
  const rumbles=new Set([...compiled.methods.values()].flatMap(m=>[...(m.rumble||[])]));for(const name of rumbles)e.stop+='        RobotIO.'+name+'.setRumble(edu.wpi.first.wpilibj.GenericHID.RumbleType.kBothRumble,0.0);\n';
  for(const [name,gains]of controllers){e.fields+=`    private final edu.wpi.first.math.controller.PIDController frc_pid_${name}=new edu.wpi.first.math.controller.PIDController(${gains.map(j).join(',')});\n`;e.stop+=`        frc_pid_${name}.reset();\n`;}
  if(FRC.driveOwner(p)?.name===ss.name){
    e.imports.push('frc.robot.runtime.DriveIO');e.implements='DriveIO';
    if(p.drive.type==='swerve'){
      e.helpers+=`    public void resetPose(edu.wpi.first.math.geometry.Pose2d pose){swerveDrive.resetOdometry(pose);}
    public edu.wpi.first.math.kinematics.ChassisSpeeds getRobotSpeeds(){return swerveDrive.getRobotVelocity();}
    public void driveRobotRelative(edu.wpi.first.math.kinematics.ChassisSpeeds speeds){frc_lastDrive=Timer.getFPGATimestamp();swerveDrive.drive(speeds);}
    public void addVisionMeasurement(edu.wpi.first.math.geometry.Pose2d pose,double timestamp,edu.wpi.first.math.Matrix<edu.wpi.first.math.numbers.N3,edu.wpi.first.math.numbers.N1> deviations){if(deviations==null)swerveDrive.addVisionMeasurement(pose,timestamp);else swerveDrive.addVisionMeasurement(pose,timestamp,deviations);}
`;
      e.fields+=`    private final edu.wpi.first.networktables.StructArrayPublisher<edu.wpi.first.math.kinematics.SwerveModuleState> frc_modulePub=edu.wpi.first.networktables.NetworkTableInstance.getDefault().getStructArrayTopic("/FRCStudio/Drive/MeasuredModules",edu.wpi.first.math.kinematics.SwerveModuleState.struct).publish();\n`;
      e.periodic+='        frc_modulePub.set(swerveDrive.getStates());\n';
    }else FRC.nonSwerveDrive(p,ss,e);
  }
  return e;
};
FRC.nonSwerveDrive=(p,ss,e)=>{
  const j=FRC.javaNumber,m=p.integrations.motion,diff=p.drive.type==='differential',slots=diff?['left','right']:['frontleft','frontright','backleft','backright'],odometry=FRC.hasOdometry(p);
  e.imports.push('edu.wpi.first.math.geometry.*','edu.wpi.first.math.kinematics.*','edu.wpi.first.math.estimator.*');
  const write=(slot,value)=>p.drive.motors[slot].map(path=>'frc_set_'+path.split('.')[1]+'('+value+');').join(' ');
  const consumer=slot=>'value -> { '+write(slot,'value')+' }';
  e.fields+=`    private final edu.wpi.first.wpilibj.drive.${diff?'DifferentialDrive':'MecanumDrive'} frc_kitDrive=new edu.wpi.first.wpilibj.drive.${diff?'DifferentialDrive':'MecanumDrive'}(${(diff?slots:['frontleft','backleft','frontright','backright']).map(consumer).join(', ')});
    private double frc_lastMotion;
`;
  e.init+='        frc_kitDrive.setDeadband(0);\n';
  if(!odometry){
    e.helpers+=`    public void drive(double x,double y,double rotation,boolean fieldRelative){frc_lastMotion=Timer.getFPGATimestamp();${diff?'frc_kitDrive.arcadeDrive(RobotIO.percent(x),RobotIO.percent(rotation),false);':'var speeds=new ChassisSpeeds(RobotIO.percent(x),RobotIO.percent(y),RobotIO.percent(rotation));if(fieldRelative)speeds=ChassisSpeeds.fromFieldRelativeSpeeds(speeds,Rotation2d.fromDegrees(RobotIO.headingDegrees()));frc_kitDrive.driveCartesian(speeds.vxMetersPerSecond,-speeds.vyMetersPerSecond,-speeds.omegaRadiansPerSecond);'}}
    public Pose2d getPose(){return new Pose2d(0,0,Rotation2d.fromDegrees(RobotIO.headingDegrees()));}
    public void resetPose(Pose2d pose){throw new IllegalStateException("Odometry sensors not configured");}
    public ChassisSpeeds getRobotSpeeds(){return new ChassisSpeeds();}
    public void driveRobotRelative(ChassisSpeeds speeds){drive(speeds.vxMetersPerSecond/${j(m.maxSpeed)},speeds.vyMetersPerSecond/${j(m.maxSpeed)},speeds.omegaRadiansPerSecond/${j(m.maxAngular)},false);}
    public void addVisionMeasurement(Pose2d pose,double timestamp,edu.wpi.first.math.Matrix<edu.wpi.first.math.numbers.N3,edu.wpi.first.math.numbers.N1> deviations){}
`;
  }else{
    const distance=slot=>'frc_'+m.encoders[slot].split('.')[1]+'Position() * '+j(Math.PI*m.wheelDiameterM/m.gearRatio),velocity=slot=>'frc_'+m.encoders[slot].split('.')[1]+'RPM() / 60.0 * '+j(Math.PI*m.wheelDiameterM/m.gearRatio);
    const kinType=diff?'DifferentialDriveKinematics':'MecanumDriveKinematics',estType=diff?'DifferentialDrivePoseEstimator':'MecanumDrivePoseEstimator';
    const translations=[[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,y])=>'new Translation2d('+j(x*m.wheelBaseM/2)+','+j(y*m.trackWidthM/2)+')');
    e.fields+=`    private final ${kinType} frc_kinematics=new ${kinType}(${diff?j(m.trackWidthM):translations.join(',')});
    private final ${estType} frc_odometry;
    private final edu.wpi.first.math.controller.SimpleMotorFeedforward frc_driveFF=new edu.wpi.first.math.controller.SimpleMotorFeedforward(${j(m.kS)},${j(m.kV)});
`;
    for(const slot of slots)e.fields+=`    private final edu.wpi.first.math.controller.PIDController frc_wheelPid_${slot}=new edu.wpi.first.math.controller.PIDController(${j(m.kP)},${j(m.kI)},${j(m.kD)});\n`;
    const positions=diff?distance('left')+', '+distance('right'):'new MecanumDriveWheelPositions('+slots.map(distance).join(',')+')';
    const measured=diff?'new DifferentialDriveWheelSpeeds('+slots.map(velocity).join(',')+')':'new MecanumDriveWheelSpeeds('+slots.map(velocity).join(',')+')';
    e.init+=`        frc_odometry=new ${estType}(frc_kinematics,Rotation2d.fromDegrees(RobotIO.headingDegrees()),${positions},new Pose2d());\n`;
    e.periodic+=`        frc_odometry.update(Rotation2d.fromDegrees(RobotIO.headingDegrees()),${positions});\n`;
    e.helpers+=`    public Pose2d getPose(){return frc_odometry.getEstimatedPosition();}
    public void resetPose(Pose2d pose){frc_odometry.resetPosition(Rotation2d.fromDegrees(RobotIO.headingDegrees()),${positions},pose);}
    public ChassisSpeeds getRobotSpeeds(){return frc_kinematics.toChassisSpeeds(${measured});}
    public void addVisionMeasurement(Pose2d pose,double timestamp,edu.wpi.first.math.Matrix<edu.wpi.first.math.numbers.N3,edu.wpi.first.math.numbers.N1> deviations){if(deviations==null)frc_odometry.addVisionMeasurement(pose,timestamp);else frc_odometry.addVisionMeasurement(pose,timestamp,deviations);}
    public void drive(double x,double y,double rotation,boolean fieldRelative){
        ChassisSpeeds speeds=new ChassisSpeeds(RobotIO.percent(x)*${j(m.maxSpeed)},RobotIO.percent(y)*${j(m.maxSpeed)},RobotIO.percent(rotation)*${j(m.maxAngular)});
        if(fieldRelative)speeds=ChassisSpeeds.fromFieldRelativeSpeeds(speeds,Rotation2d.fromDegrees(RobotIO.headingDegrees()));
        driveRobotRelative(speeds);
    }
    public void driveRobotRelative(ChassisSpeeds speeds){
        frc_lastMotion=Timer.getFPGATimestamp();
        var wheels=frc_kinematics.toWheelSpeeds(new ChassisSpeeds(RobotIO.bounded(speeds.vxMetersPerSecond,${j(m.maxSpeed)}),RobotIO.bounded(speeds.vyMetersPerSecond,${j(m.maxSpeed)}),RobotIO.bounded(speeds.omegaRadiansPerSecond,${j(m.maxAngular)})));
        wheels.desaturate(${j(m.maxSpeed)});
        double battery=Math.max(1,edu.wpi.first.wpilibj.RobotController.getBatteryVoltage());
${slots.map(slot=>{const value='wheels.'+({left:'leftMetersPerSecond',right:'rightMetersPerSecond',frontleft:'frontLeftMetersPerSecond',frontright:'frontRightMetersPerSecond',backleft:'rearLeftMetersPerSecond',backright:'rearRightMetersPerSecond'}[slot]);return '        '+write(slot,'(frc_wheelPid_'+slot+'.calculate('+velocity(slot)+','+value+') + frc_driveFF.calculate('+value+')) / battery')+'\n';}).join('')}        frc_kitDrive.feed();
    }
`;
    for(const slot of slots)e.stop+=`        frc_wheelPid_${slot}.reset();\n`;
  }
  e.periodic+='        if(!DriverStation.isEnabled()||Timer.getFPGATimestamp()-frc_lastMotion>0.1)frc_kitDrive.stopMotor();\n';
  if(odometry)e.simulation+='        RobotIO.simulateHeading(getRobotSpeeds().omegaRadiansPerSecond,0.02);\n';
  e.stop+='        frc_kitDrive.stopMotor();\n';
};
FRC.genContainer=p=>{
  const j=FRC.javaNumber,q=FRC.s,owner=FRC.driveOwner(p),i=p.integrations,instance=FRC.instance;
  const method=path=>{const [s,m]=path.split('.');return {ss:p.subsystems.find(ss=>ss.name===s),name:m,ref:'frc_ss_'+s+'::'+m,call:'frc_ss_'+s+'.'+m+'()'};};
  const command=(path,duration,stopMethod='')=>{const m=method(path),v=instance(m.ss);return `Commands.run(${m.ref},${v})${duration?'.withTimeout('+j(duration)+')':''}.finallyDo(interrupted -> { ${stopMethod?v+'.'+stopMethod.split('.')[1]+'(); ':''}${v}.stopAll(); })`;};
  const step=s=>s.type==='wait'?'Commands.waitSeconds('+j(s.duration)+')':s.type==='parallel'?'Commands.parallel('+s.methods.map(path=>command(path,s.duration)).join(',')+')':command(s.methodPath,s.duration);
  let fields=p.subsystems.map(ss=>'    private final '+ss.name+' '+instance(ss)+';\n').join(''),init='        RobotIO.initializeGyro();\n',bindings='';
  init+=p.subsystems.map(ss=>'        '+instance(ss)+'=new '+ss.name+'();\n').join('');
  init+='        RobotServices.initialize('+(owner&&FRC.hasOdometry(p)?instance(owner):'null')+');\n';
  for(const ss of p.subsystems){
    const v=instance(ss),fallback=ss.methods.find(m=>m.role==='default');
    for(const m of ss.methods)init+=`        RobotServices.registerMethod(${q(ss.name+'.'+m.name)}, () -> Commands.run(${v}::${m.name},${v}).finallyDo(interrupted -> ${v}.stopAll()));\n`;
    if(fallback)init+=`        ${v}.setDefaultCommand(Commands.run(() -> { if(DriverStation.isTeleopEnabled())${v}.${fallback.name}();else ${v}.stopAll(); },${v}).finallyDo(interrupted -> ${v}.stopAll()));\n`;
  }
  if(owner&&!owner.methods.some(m=>m.role==='default')){const v=instance(owner);init+=`        ${v}.setDefaultCommand(Commands.run(()->{if(DriverStation.isTeleopEnabled())${v}.drive(-RobotIO.axis(RobotIO.driver.getLeftY())*${j(p.drive.scale)},-RobotIO.axis(RobotIO.driver.getLeftX())*${j(p.drive.scale)},-RobotIO.axis(RobotIO.driver.getRightX())*${j(p.drive.scale)},${p.drive.fieldRelative&&p.drive.type!=='differential'});else ${v}.stopAll();},${v}).finallyDo(interrupted->${v}.stopAll()));\n`;}
  for(const b of p.controllerBindings){const controller=b.controller==='operator'?'frc_operator':'frc_controller',trigger=controller+'.'+b.button+'()';
    if(b.type==='zeroGyro'){bindings+=`        ${trigger}.onTrue(Commands.runOnce(RobotServices::zeroGyro${owner&&!b.independent?', '+instance(owner):''}));\n`;continue;}
    const m=method(b.methodPath),v=instance(m.ss),end=b.stopMethod?method(b.stopMethod):null,req=[...new Set([v,...(end?[instance(end.ss)]:[])])].join(',');
    if(b.trigger==='whileTrue')bindings+=`        ${trigger}.whileTrue(Commands.run(${m.ref},${req}).finallyDo(interrupted->{try{${end?end.call+';':''}}finally{${[...new Set([v,...(end?[instance(end.ss)]:[])])].map(v=>v+'.stopAll();').join('')}}}));\n`;
    else if(b.trigger==='onFalse'&&end)bindings+=`        ${trigger}.onFalse(Commands.runOnce(()->{${m.call};${end.call};},${req}));\n`;
    else {bindings+=`        ${trigger}.${b.trigger}(Commands.runOnce(${m.ref}${b.independent?'':', '+v}));\n`;if(end)bindings+=`        ${trigger}.onFalse(Commands.runOnce(${end.ref},${instance(end.ss)}));\n`;}
  }
  const extras=FRC.autoIntegration(p,method,command);fields+=extras.fields;init+=extras.init;
  init+='        configureBindings();\n';
  const auto='Commands.sequence('+p.autonomous.map(step).join(',')+').finallyDo(interrupted -> stopAll())';
  init+=`        frc_autoChooser.${i.autonomousMode==='blocks'?'setDefaultOption':'addOption'}("Block Autonomous",${auto});\n`+extras.chooser+'        SmartDashboard.putData("Auto Chooser",frc_autoChooser);\n';
  return `package frc.robot;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.smartdashboard.*;
import edu.wpi.first.wpilibj2.command.*;
import edu.wpi.first.wpilibj2.command.button.CommandXboxController;
import frc.robot.runtime.*;
${p.subsystems.map(ss=>'import frc.robot.subsystems.'+ss.name+';').join('\n')}
public class RobotContainer {
${fields}    private final CommandXboxController frc_controller=new CommandXboxController(${p.controllerPort});
${i.operator.enabled?'    private final CommandXboxController frc_operator=new CommandXboxController('+i.operator.port+');\n':''}    private final SendableChooser<Command> frc_autoChooser=new SendableChooser<>();
    public RobotContainer(){
${init}    }
    private void configureBindings(){
${bindings}    }
    public void stopAll(){${p.subsystems.map(ss=>instance(ss)+'.stopAll();').join('')}}
    public Command getAutonomousCommand(){return frc_autoChooser.getSelected();}
}
`;
};
FRC.autoIntegration=(p,method,command)=>{
  const result={fields:'',init:'',chooser:''},i=p.integrations,j=FRC.javaNumber,q=FRC.s,owner=FRC.driveOwner(p);
  const v=owner?FRC.instance(owner):'',sc=p.swerveConfig,m=i.motion;
  if(i.pathplanner.enabled){
    for(const e of i.pathplanner.events)result.init+=`        com.pathplanner.lib.auto.NamedCommands.registerCommand(${q(e.name)},${command(e.methodPath,e.duration,e.stopMethod)});\n`;
    const radius=p.drive.type==='swerve'?sc.physical.wheelDiameter*.0254/2:m.wheelDiameterM/2,gear=p.drive.type==='swerve'?sc.physical.driveGearRatio:m.gearRatio,max=p.drive.type==='swerve'?sc.maxSpeed:m.maxSpeed;
    const module=`new com.pathplanner.lib.config.ModuleConfig(${j(radius)},${j(max)},${j(i.pathplanner.friction)},${FRC.dcMotor(i.pathplanner.motor,i.pathplanner.motorsPerModule)}.withReduction(${j(gear)}),${j(sc.physical.driveCurrentLimit)},${i.pathplanner.motorsPerModule})`;
    let config;
    if(p.drive.type==='differential')config=`new com.pathplanner.lib.config.RobotConfig(${j(i.pathplanner.massKg)},${j(i.pathplanner.moi)},${module},${j(m.trackWidthM)})`;
    else {const offsets=p.drive.type==='swerve'?FRC.moduleNames.map(n=>[sc.modules[n].location.front*.0254,sc.modules[n].location.left*.0254]):[[m.wheelBaseM/2,m.trackWidthM/2],[m.wheelBaseM/2,-m.trackWidthM/2],[-m.wheelBaseM/2,m.trackWidthM/2],[-m.wheelBaseM/2,-m.trackWidthM/2]];config=`new com.pathplanner.lib.config.RobotConfig(${j(i.pathplanner.massKg)},${j(i.pathplanner.moi)},${module},${offsets.map(([x,y])=>`new edu.wpi.first.math.geometry.Translation2d(${j(x)},${j(y)})`).join(',')})`;}
    const controller=p.drive.type==='differential'?'new com.pathplanner.lib.controllers.PPLTVController(0.02)':`new com.pathplanner.lib.controllers.PPHolonomicDriveController(new com.pathplanner.lib.config.PIDConstants(${j(i.pathplanner.translationP)},0,0),new com.pathplanner.lib.config.PIDConstants(${j(i.pathplanner.rotationP)},0,0))`;
    result.init+=`        try {
            var config=${i.assets.some(a=>a.path==='pathplanner/settings.json')?'com.pathplanner.lib.config.RobotConfig.fromGUISettings()':config};
            com.pathplanner.lib.auto.AutoBuilder.configure(${v}::getPose,${v}::resetPose,${v}::getRobotSpeeds,${v}::driveRobotRelative,${controller},config,()->DriverStation.getAlliance().orElse(DriverStation.Alliance.Blue)==DriverStation.Alliance.Red,${v});
        }catch(Exception e){throw new IllegalStateException("PathPlanner config failed",e);}
`;
    for(const name of FRC.assetNames(p,'pathplanner'))result.chooser+=`        frc_autoChooser.${i.autonomousMode==='pathplanner'&&i.selectedAuto===name?'setDefaultOption':'addOption'}(${q('PathPlanner · '+name)},new com.pathplanner.lib.commands.PathPlannerAuto(${q(name)}).finallyDo(interrupted -> ${v}.stopAll()));\n`;
  }
  if(i.choreo.enabled){
    result.fields+='    private final choreo.auto.AutoFactory frc_choreo;\n';
    const sample=p.drive.type==='differential'?'choreo.trajectory.DifferentialSample':'choreo.trajectory.SwerveSample';
    let follower;
    if(p.drive.type==='differential'){
      result.fields+='    private final edu.wpi.first.math.controller.LTVUnicycleController frc_choreoController=new edu.wpi.first.math.controller.LTVUnicycleController(0.02);\n';
      follower=`${v}.driveRobotRelative(frc_choreoController.calculate(${v}.getPose(),s.getPose(),(s.vl+s.vr)/2.0,s.omega));`;
    }else follower=`var pose=${v}.getPose();${v}.driveRobotRelative(edu.wpi.first.math.kinematics.ChassisSpeeds.fromFieldRelativeSpeeds(s.vx+${j(i.choreo.translationP)}*(s.x-pose.getX()),s.vy+${j(i.choreo.translationP)}*(s.y-pose.getY()),s.omega+${j(i.choreo.rotationP)}*edu.wpi.first.math.MathUtil.angleModulus(s.heading-pose.getRotation().getRadians()),pose.getRotation()));`;
    result.init+=`        frc_choreo=new choreo.auto.AutoFactory(${v}::getPose,${v}::resetPose,(${sample} s)->{${follower}},true,${v});\n`;
    for(const event of i.pathplanner.events)result.init+=`        frc_choreo.bind(${q(event.name)},${command(event.methodPath,event.duration)});\n`;
    for(const [idx,name]of FRC.assetNames(p,'choreo').entries())result.chooser+=`        var routine${idx}=frc_choreo.newRoutine(${q(name)});
        var trajectory${idx}=routine${idx}.trajectory(${q(name)});
        routine${idx}.active().onTrue(Commands.sequence(trajectory${idx}.resetOdometry(),trajectory${idx}.cmd()));
        frc_autoChooser.${i.autonomousMode==='choreo'&&i.selectedAuto===name?'setDefaultOption':'addOption'}(${q('Choreo · '+name)},routine${idx}.cmd().finallyDo(interrupted -> ${v}.stopAll()));\n`;
  }
  if(i.sysid.enabled){
    const sys=i.sysid,ss=p.subsystems.find(s=>s.name===sys.subsystem),motor=ss.components.find(c=>c.name===sys.motor),inst=FRC.instance(ss),key=ss.name+'/'+motor.name,family=FRC.motorFamily(motor.motorType);
    const pos=family==='fx'?`${inst}.frc_sysIdPosition()`:`${inst}.frc_sysIdPosition()`;
    result.init+=`        var frc_sysid=new edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine(new edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine.Config(edu.wpi.first.units.Units.Volts.of(${j(sys.ramp)}).per(edu.wpi.first.units.Units.Second),edu.wpi.first.units.Units.Volts.of(${j(sys.step)}),edu.wpi.first.units.Units.Seconds.of(${j(sys.timeout)})),new edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine.Mechanism(volts->${inst}.frc_voltage_${motor.name}(volts.in(edu.wpi.first.units.Units.Volts)),log->log.motor(${q(key)}).voltage(edu.wpi.first.units.Units.Volts.of(${inst}.frc_sysIdVoltage())).angularPosition(edu.wpi.first.units.Units.Rotations.of(${pos})).angularVelocity(edu.wpi.first.units.Units.RotationsPerSecond.of(${inst}.frc_sysIdVelocity())),${inst}));\n`;
    for(const mode of ['quasistatic','dynamic'])for(const direction of ['kForward','kReverse'])result.init+=`        SmartDashboard.putData(${q('SysId/'+mode+'/'+direction)},frc_sysid.${mode}(edu.wpi.first.wpilibj2.command.sysid.SysIdRoutine.Direction.${direction}).onlyIf(DriverStation::isTestEnabled).onlyWhile(DriverStation::isTestEnabled).finallyDo(interrupted->${inst}.stopAll()));\n`;
  }
  return result;
};
FRC.genRobot=p=>`package frc.robot;
import edu.wpi.first.wpilibj.*;
import edu.wpi.first.wpilibj2.command.*;
import frc.robot.runtime.RobotServices;
public class Robot extends TimedRobot {
    private RobotContainer container;
    @Override public void robotInit(){${p.integrations.telemetry.dataLog?'DataLogManager.start();DataLogManager.logNetworkTables(true);DriverStation.startDataLog(DataLogManager.getLog());':''}container=new RobotContainer();}
    @Override public void robotPeriodic(){CommandScheduler.getInstance().run();RobotServices.periodic();}
    @Override public void disabledInit(){CommandScheduler.getInstance().cancelAll();container.stopAll();}
    @Override public void autonomousInit(){CommandScheduler.getInstance().cancelAll();container.stopAll();Command command=container.getAutonomousCommand();if(command!=null)CommandScheduler.getInstance().schedule(command);}
    @Override public void teleopInit(){CommandScheduler.getInstance().cancelAll();container.stopAll();}
    @Override public void testInit(){CommandScheduler.getInstance().cancelAll();container.stopAll();}
}
`;
FRC.integrationFiles=p=>{
  const i=p.integrations,files={},base='src/main/java/frc/robot/',runtime=base+'runtime/',j=FRC.javaNumber,q=FRC.s;
  for(const name of ['DriveIO','VisionCamera','VisionGate','MotorPhysics'])files[runtime+name+'.java']=FRC.renderTemplate(name);
  files[runtime+'RobotServices.java']=FRC.renderTemplate('RobotServices',{TELEMETRY:i.telemetry.enabled,PUBLISH_PERIOD:j(i.telemetry.publishPeriod),ELASTIC_NOTICE:i.telemetry.elastic?'Elastic.sendNotification(new Elastic.Notification(Elastic.NotificationLevel.INFO,title,message));':'',ELASTIC_TAB:i.telemetry.elastic?'Elastic.selectTab(name);':''});
  const active=i.cameras.filter(c=>c.enabled),vision=active.filter(c=>c.kind!=='usb');
  let constructors='';
  for(const c of vision){constructors+=`        cameras.put(${q(c.id)},new ${c.kind==='limelight'?'LimelightCamera':'PhotonCameraAdapter'}(${q(c.name)},${c.kind==='limelight'?c.megaTag2:'layout'},${['x','y','z','roll','pitch','yaw'].map(k=>j(c[k])).join(',')},${c.pipeline},${c.driverMode}));\n`;if(c.poseFusion)constructors+=`        fusion.add(${q(c.id)});\n`;if(c.kind==='photonvision'&&c.latestFrameOnly)constructors+=`        ((PhotonCameraAdapter)cameras.get(${q(c.id)})).setLatestFrameOnly(true);\n`;}
  for(const c of active.filter(c=>c.kind==='usb'))constructors+=`        ${c.realOnly?'if(edu.wpi.first.wpilibj.RobotBase.isReal())':''}edu.wpi.first.cameraserver.CameraServer.startAutomaticCapture(${Number(c.name)});\n`;
  const limits=['maxAge','maxAmbiguity','maxDistance','maxZ','maxJump','maxYawRate'].map(k=>j(i.vision[k])).join(',');
  files[runtime+'RobotVision.java']=FRC.renderTemplate('RobotVision',{FIELD:i.field,LIMITS:limits,CAMERA_CONSTRUCTORS:constructors,MAX_AGE:j(i.vision.maxAge),STD_XY:j(i.vision.stdXY),FUSION_CONDITION:i.vision.fusionMode==='freshness'?'m.pose()!=null&&Double.isFinite(m.timestamp())&&m.timestamp()<=now&&now-m.timestamp()<='+j(i.vision.maxAge):'gate.accept(id,m,now,rate,drive.getPose(),DriverStation.isEnabled())',VISION_NOISE:i.vision.fusionMode==='freshness'?'null':'VecBuilder.fill(xy,xy,'+j(i.vision.stdHeading)+')'});
  if(vision.some(c=>c.kind==='limelight')){files[runtime+'LimelightCamera.java']=FRC.renderTemplate('LimelightCamera');files[base+'LimelightHelpers.java']=FRC.integrationAssets.limelight;}
  if(vision.some(c=>c.kind==='photonvision')){files[runtime+'PhotonCameraAdapter.java']=FRC.renderTemplate('PhotonCameraAdapter');const v=FRC.integrationAssets.vendors.photon;files['vendordeps/'+v.fileName]=JSON.stringify(v,null,2);}
  if(i.telemetry.elastic)files[runtime+'Elastic.java']=FRC.integrationAssets.elastic;
  for(const name of ['pathplanner','choreo'])if(i[name].enabled){const v=FRC.integrationAssets.vendors[name];files['vendordeps/'+v.fileName]=JSON.stringify(v,null,2);}
  for(const a of i.assets)files['src/main/deploy/'+a.path]=a.text;
  if(p.subsystems.some(ss=>ss.components.some(c=>c.type==='canrange'))){const v=FRC.assets.vendors.ctre;files['vendordeps/'+v.fileName]=JSON.stringify(v,null,2);}
  for(const s of i.customSources)files['src/main/java/'+s.path]=s.text;
  for(const v of i.customVendors||[])files['vendordeps/'+v.fileName]=JSON.stringify(v,null,2);
  for(const [name,license]of Object.entries(FRC.integrationAssets.licenses))files['licenses/'+name+'-LICENSE.txt']=license;
  files['INTEGRATIONS.md']=`# FRC Blockly Studio 3 integrations

WPILib / GradleRIO 2026.2.1, Java 17. YAGSL 2026.2.21; PhotonLib v2026.3.4; PathPlanner 2026.1.2; Choreo 2026.0.3. The generated vendordeps pin the selected dependencies. LimelightHelpers and Elastic are copied with licenses. No dashboard or camera firmware is installed by this project.

Path files live in src/main/deploy/pathplanner/{autos,paths} and src/main/deploy/choreo. Select the autonomous routine with SmartDashboard Auto Chooser before enabling Autonomous. Named events invoke mechanism methods for the configured duration and stop on interruption. Choreo uses AutoRoutine so its bindings fire. The browser preview runs block autonomous sequences; imported paths run in WPILib simulation or on the robot.

Motor units: power -1..1; voltage V; velocity rotations/second; position motor rotations. Encoder blocks report rotations and RPM. TalonFX Motion Magic uses RPS, RPS/s and RPS/s/s. SPARK MAXMotion cruise/acceleration are automatically converted to RPM and RPM/s. Motion profiling requires enabled motor profile settings and configured PID. These gains must be tuned for the chosen mode. TalonFX TorqueCurrentFOC requires Phoenix Pro. PWM closed loop uses external feedback and software PID/voltage blocks.

Vision uses WPILib blue-origin coordinates. Robot-to-camera translation is metres; configuration Euler angles are degrees. Pose fusion requires drive odometry and rejects stale/duplicate/implausible frames. MegaTag2 receives the estimated field heading every robot loop. Configure matching camera names, pipelines and camera firmware separately.

AdvantageScope / Elastic connect to NetworkTables. /FRCStudio/Drive/Pose is Pose2d; /FRCStudio/Drive/MeasuredModules is SwerveModuleState[]; /FRCStudio/Devices contains device data. DataLogManager produces wpilog files when enabled. SysId commands are available on SmartDashboard only when configured and run only in enabled Test mode.

Build Robot Code must succeed in WPILib VS Code 2026 before deployment. First build needs network access for Gradle/vendor dependencies. Wiring, motor direction, gyro orientation, offsets, physical parameters and PID require robot-specific verification. SIMULATION.md describes desktop simulation. The simulator manifest describes a future interface; no external simulation transport is implemented in version 1.
`;
  files['src/main/deploy/frc-studio/robot-model.json']=JSON.stringify(FRC.robotManifest(p),null,2);
  files['src/main/deploy/frc-studio/robot-model.schema.json']=JSON.stringify(FRC.robotManifestSchema,null,2);
  files['SIMULATION.md']='# Simulation / AdvantageScope\n\nRun WPILib: Simulate Robot Code (desktop GUI). Use the joystick / Driver Station simulator, enable Teleop or Autonomous. No robot hardware connection is needed for desktop simulation. Mechanism models use WPILib FlywheelSim / ElevatorSim / SingleJointedArmSim; physical parameters must match the robot. YAGSL owns swerve simulation.\n\nConnect AdvantageScope or Elastic to the simulation NetworkTables server at localhost. Pose2d: /FRCStudio/Drive/Pose; SwerveModuleState[]: /FRCStudio/Drive/MeasuredModules; device data: /FRCStudio/Devices. Drag the pose into AdvantageScope 2D field / odometry and module array into Swerve. DataLogManager records NT data in .wpilog when enabled.\n\nA future external simulator can read src/main/deploy/frc-studio/robot-model.json (contract version 1). It describes the same robot, SI units and topic names. The contract alone does not implement an external physics engine. The in-editor 2D preview is a separate logic/kinematics check and does not replace the WPILib robot simulation.\n';
  return files;
};
