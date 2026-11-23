'use strict';
// Shared project model. No user-supplied source is evaluated.
const FRC = window.FRC = {};
FRC.version = 3;
FRC.motorTypes = [
  ['Talon FX · Kraken X60','TalonFX_KrakenX60'],['Talon FX · Kraken X44','TalonFX_KrakenX44'],['Talon FX · Falcon 500','TalonFX_Falcon500'],
  ['SPARK MAX · NEO','SparkMax_NEO'],['SPARK MAX · NEO 550','SparkMax_NEO550'],['SPARK MAX · Vortex','SparkMax_Vortex'],['SPARK MAX · brushed (CIM vb.)','SparkMax_Brushed'],
  ['SPARK Flex · NEO','SparkFlex_NEO'],['SPARK Flex · Vortex','SparkFlex_Vortex'],['SPARK Flex · brushed','SparkFlex_Brushed'],
  ['Talon SRX (CAN)','TalonSRX'],['Victor SPX (CAN)','VictorSPX'],
  ['Talon FX (PWM)','PWMTalonFX'],['SPARK MAX (PWM)','PWMSparkMax'],['Talon SRX (PWM)','PWMTalonSRX'],['Victor SPX (PWM)','PWMVictorSPX'],['Victor SP (PWM)','VictorSP'],['SPARK (PWM)','Spark'],['Talon (PWM)','Talon']
];
FRC.swerveMotors = [
  ['Talon FX · Kraken X60','krakenx60'],['Talon FX · Kraken X44','krakenx44'],['Talon FX · Falcon 500','falcon500'],
  ['SPARK MAX · NEO','sparkmax_neo'],['SPARK MAX · NEO 550','sparkmax_neo550'],['SPARK MAX · Vortex','sparkmax_vortex'],
  ['SPARK Flex · NEO','sparkflex_neo'],['SPARK Flex · NEO 550','sparkflex_neo550'],['SPARK Flex · Vortex','sparkflex_vortex'],
  ['Talon FXS · NEO','talonfxs_neo'],['Talon FXS · NEO 550','talonfxs_neo550'],['Talon FXS · Vortex','talonfxs_vortex'],['Talon FXS · Minion','talonfxs_minion']
];
FRC.encoderTypes = [['Quadrature (two DIO)','quadrature'],['Internal motor sensor','builtin'],['CANcoder','cancoder'],['CANandmag (CAN)','canandmag'],['Through Bore / HEX (DIO duty cycle)','throughbore_dio'],['SPARK absolute encoder port','throughbore_attached']];
FRC.swerveEncoders = [['CANcoder','cancoder'],['CANandmag (CAN)','canandmag_can'],['Duty cycle / Through Bore (DIO)','dutycycle'],['SPARK MAX absolute port','attached'],['SPARK Flex absolute port','sparkflex_attached'],['Analog (roboRIO)','analog']];
FRC.gyros = [['ADIS16470 (SPI onboard CS0, Z yaw)','adis16470'],['ADIS16448 (SPI MXP)','adis16448'],['ADXRS450 (SPI onboard CS0)','adxrs450'],['Pigeon 2 (CAN)','pigeon2'],['navX / navX2 (SPI MXP)','navx_spi'],['CANandgyro (CAN)','canandgyro']];
FRC.buttons = [['a','A'],['b','B'],['x','X'],['y','Y'],['leftBumper','LB'],['rightBumper','RB'],['start','Start'],['back','Back'],['leftStick','LS'],['rightStick','RS'],['povUp','↑'],['povDown','↓'],['povLeft','←'],['povRight','→']];
FRC.gyros.push(['No gyro (non-swerve only)','none']);
FRC.moduleNames = ['frontleft','frontright','backleft','backright'];
FRC.motorFamily = t => t?.startsWith('TalonFX_')?'fx':t?.startsWith('SparkMax_')?'max':t?.startsWith('SparkFlex_')?'flex':t==='TalonSRX'?'srx':t==='VictorSPX'?'spx':'pwm';
FRC.isBrushless = c => !c.motorType.endsWith('_Brushed');
FRC.s = value => JSON.stringify(String(value)).replace(/\\u2028/g,'\\u2028').replace(/\\u2029/g,'\\u2029');
FRC.html = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
FRC.clone = obj => JSON.parse(JSON.stringify(obj));
const JAVA_WORDS = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null var yield record sealed permits non-sealed _').split(' '));
FRC.identifier = n => typeof n==='string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(n) && !JAVA_WORDS.has(n);
FRC.reserved = new Set(['Robot','Main','RobotContainer','Constants','RobotIO','SwerveDrive','periodic','simulationPeriodic','stopAll','getHeading','zeroGyro','drive','getSwerveDrive','getPose','getName','setName','close','run','runOnce','startEnd','startRun','register','getDefaultCommand','getCurrentCommand','setDefaultCommand','removeDefaultCommand']);
FRC.defaultSwerve = () => ({
  gyro:{type:'adis16470',id:0,canbus:'rio',inverted:false},
  physical:{driveGearRatio:6.75,wheelDiameter:4,angleGearRatio:12.8,driveCurrentLimit:40,angleCurrentLimit:20},
  pid:{driveP:0.1,driveI:0,driveD:0,angleP:0.01,angleI:0,angleD:0},
  controller:{angleDeadband:0.05,headingP:0.4,headingI:0,headingD:0.01},
  modules:Object.fromEntries(FRC.moduleNames.map((name,i)=>[name,{
    location:{front:i<2?10:-10,left:i%2===0?10:-10},
    drive:{type:'krakenx60',id:i*3+1,canbus:'rio',inverted:false},
    angle:{type:'krakenx60',id:i*3+2,canbus:'rio',inverted:false},
    encoder:{type:'cancoder',id:i*3+3,canbus:'rio',offset:0,inverted:false}
  }])),maxSpeed:4.5,deadband:0.05
});
for(const name of ['SubsystemBase','DriverStation','Timer','SmartDashboard','TalonFX','TalonFXConfiguration','SparkMax','SparkFlex','SparkMaxConfig','SparkFlexConfig','CANcoder','DigitalInput','DutyCycleEncoder','Canandmag','Pose2d','Translation2d','ChassisSpeeds','Field2d','SwerveParser','SwerveDriveTelemetry','File','Command','Commands','CommandXboxController','Double','Math','String','Object','Override','wait','notify','notifyAll','getClass','hashCode','toString','equals','clone','finalize','initSendable','getSubsystem','setSubsystem','addChild'])FRC.reserved.add(name);
FRC.defaultProject = () => ({schemaVersion:3,integrations:FRC.integrationDefaults(),team:10576,name:'AshinaRobot',controllerPort:0,subsystems:[],controllerBindings:[],swerveConfig:FRC.defaultSwerve(),drive:{type:'swerve',subsystem:'SwerveSubsystem',scale:0.35,fieldRelative:true,motors:{}},autonomous:[]});
FRC.motorDefaults = () => ({motorType:'TalonFX_KrakenX60',connection:'CAN',canId:20,canbus:'rio',pwmChannel:0,inverted:false,brake:true,currentLimitEnabled:true,currentLimit:35,maxRps:100,p:0,i:0,d:0,ff:0,closedLoopConfigured:false,focLicensed:false,motion:FRC.motionDefaults()});
function mergeDefaults(base, value) {
  const result=FRC.clone(base);
  for(const [k,v] of Object.entries(value||{})) {
    if(['__proto__','constructor','prototype'].includes(k)) throw Error('Invalid project key.');
    result[k]=v && typeof v==='object' && !Array.isArray(v) && base[k] && typeof base[k]==='object'?mergeDefaults(base[k],v):v;
  }
  return result;
}
FRC.normalize = raw => {
  if(!raw || typeof raw!=='object' || Array.isArray(raw) || !Array.isArray(raw.subsystems)) throw Error('Project does not contain a subsystems list.');
  if(raw.schemaVersion>3) throw Error('This project was saved with a newer application version.');
  if(raw.subsystems.length>100) throw Error('Up to 100 subsystems may be loaded.');
  const p=mergeDefaults(FRC.defaultProject(),raw),notes=[];
  if(!Array.isArray(p.controllerBindings)||!Array.isArray(p.autonomous)) throw Error('Invalid binding / autonomous list.');
  const object=(x)=>x && typeof x==='object' && !Array.isArray(x);
  if(!object(p.drive)||!object(p.drive.motors)||!object(p.swerveConfig)||!object(p.swerveConfig.gyro)||!object(p.swerveConfig.modules)||!object(p.swerveConfig.pid)||!object(p.swerveConfig.physical)||!object(p.swerveConfig.controller))throw Error('Invalid drive / swerve settings structure.');
  if(p.controllerBindings.length>100||p.autonomous.length>200)throw Error('Binding / autonomous step limit exceeded.');
  if(p.controllerBindings.some(b=>!object(b))||p.autonomous.some(s=>!object(s)))throw Error('Invalid binding / autonomous entry.');
  for(const list of Object.values(p.drive.motors))if(!Array.isArray(list)||list.some(n=>typeof n!=='string'))throw Error('Invalid drive motor list.');
  for(const name of FRC.moduleNames){const m=p.swerveConfig.modules[name];if(!object(m)||['location','drive','angle','encoder'].some(k=>!object(m[k])))throw Error(name+': invalid module configuration.');}
  for(const ss of p.subsystems) {
    if(!ss || !Array.isArray(ss.components)||!Array.isArray(ss.methods)) throw Error('Invalid subsystem component / method list.');
    if(ss.components.length>200||ss.methods.length>200) throw Error('Subsystem size limit exceeded.');
    ss.components=ss.components.map(c=>{
      if(!c || !['motor','encoder','limitswitch',...(FRC.extendedComponentTypes||[])].includes(c.type)) throw Error('Unknown component type.');
      if(c.type==='motor') {
        const out={...FRC.motorDefaults(),...c};
        if(FRC.motorFamily(out.motorType)==='pwm') out.connection='PWM';
        if(!Object.hasOwn(c,'pwmChannel') && out.connection==='PWM') {out.pwmChannel=null;notes.push(ss.name+'.'+c.name+': the legacy PWM channel is ambiguous; edit it and select a channel.');}
        return out;
      }
      return {canbus:'rio',canId:0,dioChannel:0,normallyOpen:true,inverted:false,...c};
    });
    ss.methods=ss.methods.map(m=>{
      if(!m||typeof m.name!=='string'||(m.blocks!=null && typeof m.blocks!=='string')) throw Error('Invalid method entry.');
      return {role:'manual',blocks:null,...m};
    });
  }
  if(!raw.drive) {
    const sw=p.subsystems.find(x=>/swerve/i.test(x.name));
    p.drive.type=sw?'swerve':'none';p.drive.subsystem=sw?.name||'SwerveSubsystem';
    notes.push('Legacy project migrated to the 2026 format; check the hardware mappings.');
  }
  const motorMap={neo:'sparkmax_neo',neo550:'sparkmax_neo550',vortex:'sparkmax_vortex'};
  const encMap={cancoder_can:'cancoder',canandmag_attached:'attached',revthroughbore_attached:'attached',revthroughbore_dio:'dutycycle',andymarkhexbore_attached:'attached',andymarkhexbore_dio:'dutycycle',analog_attached:'UNSUPPORTED_analog_attached',dutycycle_attached:'attached'};
  for(const name of FRC.moduleNames) {
    const m=p.swerveConfig.modules[name];
    for(const kind of ['drive','angle']) if(motorMap[m[kind].type]) {m[kind].type=motorMap[m[kind].type];notes.push(name+' '+kind+': the legacy motor name was migrated to SPARK MAX; verify the controller.');}
    if(encMap[m.encoder.type]) m.encoder.type=encMap[m.encoder.type];
  }
  p.controllerBindings=p.controllerBindings.map(b=>({...b,button:b.button==='pov0'?'povUp':b.button}));
  FRC.extraNormalize?.(p,raw,notes);
  p.schemaVersion=3;
  return {project:p,notes};
};
FRC.validate = p => {
  const errors=[],warnings=[],err=(where,msg)=>errors.push(where+': '+msg),warn=(where,msg)=>warnings.push(where+': '+msg);
  const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  const boolean=(obj,keys,label)=>{for(const k of keys)if(typeof obj[k]!=='boolean')err(label,k+' must be true/false.');};
  const devices=new Map();
  const canAddresses=new Map();
  function resource(key,label){if(devices.has(key))err(label,'duplicate binding '+devices.get(key)+' is also used by ('+key+').');else devices.set(key,label);}
  function bus(b,label,rev=false){if(typeof b!=='string'||!b.trim()||b.length>80)err(label,'CAN bus name is empty / invalid.');else if(rev && b!=='rio')err(label,'REV controllers use the roboRIO CAN bus; bus must be rio.');}
  function can(d,label,rev=false,group='ctre-talon'){
    const max=group.startsWith('rev-')||group.startsWith('redux')?63:62;
    if(!integer(d.id,0,max))err(label,'CAN ID 0–'+max+' must be an integer within the range.');bus(d.canbus,label,rev);
    if(integer(d.id,0,max)){
      resource('CAN:'+d.canbus+':'+group+':'+d.id,label);
      const address=d.canbus+':'+d.id,previous=canAddresses.get(address);
      if(previous&&previous.group!==group)warn(label,'CAN '+d.id+' different device types '+previous.label+' also uses this ID; the same ID is allowed across device types.');
      else canAddresses.set(address,{group,label});
    }
  }
  function port(channel,label,kind,max){if(!integer(channel,0,max))err(label,kind+' channel 0–'+max+' must be an integer within the range.');else resource(kind+':'+channel,label);}
  if(!integer(p.team,1,99999))err('Team','Enter a team number between 1–99999.');
  if(!FRC.identifier(p.name))err('Project','enter a project name without spaces (e.g. AshinaRobot).');
  if(!integer(p.controllerPort,0,5))err('Controller','USB port must be 0–5.');
  if(!finite(p.drive.scale,0.01,1))err('Drive','power scale must be 0.01–1.');
  if(!['none','swerve','differential','mecanum'].includes(p.drive.type))err('Drive','invalid drive type.');
  boolean(p.drive,['fieldRelative'],'Drive');
  const names=new Set(),paths=new Map();
  for(const ss of p.subsystems){
    if(!FRC.identifier(ss.name)||FRC.reserved.has(ss.name))err(ss.name||'Subsystem','enter a valid, non-reserved Java class name.');
    if(names.has(ss.name))err(ss.name,'the same subsystem name is used twice.');names.add(ss.name);
    const members=new Set();let defaults=0;
    for(const c of ss.components){
      const label=ss.name+'.'+c.name;
      if(!FRC.identifier(c.name)||FRC.reserved.has(c.name)||c.name===ss.name||/^frc_|^m_gyro$|^swerveDrive$/.test(c.name))err(label,'invalid / reserved component name.');
      if(members.has(c.name))err(label,'duplicate component name.');members.add(c.name);paths.set(label,c);
      if(c.type==='motor'){
        boolean(c,['inverted','brake','closedLoopConfigured','focLicensed'],label);
        if(!FRC.motorTypes.some(x=>x[1]===c.motorType)){err(label,'unsupported motor controller: '+c.motorType);continue;}
        const family=FRC.motorFamily(c.motorType);
        if(family==='pwm'){if(c.connection!=='PWM')err(label,'controller uses a PWM connection.');port(c.pwmChannel,label,'PWM',19);}
        else {if(c.connection!=='CAN')err(label,'A CAN controller is selected; select a PWM controller type for PWM.');can({id:c.canId,canbus:c.canbus},label,['max','flex','srx','spx'].includes(family),['max','flex'].includes(family)?'rev-spark':family==='spx'?'ctre-victor':'ctre-talon');}
        if(!integer(c.currentLimit,1,120))err(label,'current limit must be 1–120 A.');
        if(!finite(c.maxRps,0.1,1000))err(label,'maximum motor velocity must be 0.1–1000 RPS.');
        for(const key of ['p','i','d','ff'])if(!finite(c[key],0,1e6))err(label,key+' coefficient must be finite and nonnegative.');
        if(family==='pwm'||family==='spx')warn(label,'this connection has no software current limit / brake configuration; check the hardware settings.');
      }else if(c.type==='encoder'){
        boolean(c,['inverted'],label);
        if(!FRC.encoderTypes.some(x=>x[1]===c.encType)&&!['hexbore_dio','quadrature'].includes(c.encType))err(label,'unsupported encoder type: '+c.encType);
        if(['builtin','throughbore_attached'].includes(c.encType)){
          const motor=ss.components.find(x=>x.type==='motor'&&x.name===c.parentMotor),family=FRC.motorFamily(motor?.motorType);
          if(!motor||!['fx','max','flex'].includes(family))err(label,'select a compatible CAN motor with an internal sensor.');
          if(c.encType==='throughbore_attached'&&!['max','flex'].includes(family))err(label,'attached absolute encoder requires a SPARK MAX/Flex port.');
          if(c.encType==='builtin'&&motor&&!FRC.isBrushless(motor)&&family!=='fx')err(label,'use an external encoder for a brushed SPARK motor.');
        }else if(['cancoder','canandmag'].includes(c.encType))can({id:c.canId,canbus:c.canbus},label,c.encType==='canandmag',c.encType==='cancoder'?'ctre-cancoder':'redux-canandmag');
        else if(c.encType!=='quadrature')port(c.dioChannel,label,'DIO',25);
      }else if(c.type==='limitswitch'){boolean(c,['normallyOpen'],label);port(c.dioChannel,label,'DIO',25);}
    }
    const methodNames=new Set();
    for(const m of ss.methods){
      const label=ss.name+'.'+m.name;
      if(!FRC.identifier(m.name)||FRC.reserved.has(m.name)||m.name===ss.name||/^frc_/.test(m.name))err(label,'invalid / reserved method name.');
      if(methodNames.has(m.name))err(label,'duplicate method name.');methodNames.add(m.name);paths.set(label,{type:'method',ss,m});
      if(!['manual','default','periodic','always'].includes(m.role))err(label,'invalid method execution type.');
      if(m.role==='default')defaults++;
    }
    if(defaults>1)err(ss.name,'only one default teleop method may be selected.');
  }
  const sc=p.swerveConfig;
  boolean(sc.gyro,['inverted'],'Gyro');
  if(!finite(sc.deadband,0,0.5))err('Controller','deadband must be 0–0.5.');
  if(p.drive.type==='swerve'){
    if(sc.gyro.type==='none')err('Swerve','swerve cannot be created without a gyro.');
    if(!names.has(p.drive.subsystem))err('Swerve','drive subsystem has not been created.');
    if(!finite(sc.maxSpeed,0.1,15))err('Swerve','maximum velocity must be 0.1–15 m/s.');
    for(const k of ['driveGearRatio','angleGearRatio','wheelDiameter','driveCurrentLimit','angleCurrentLimit'])if(!finite(sc.physical[k],0.01,k.includes('Current')?120:1000))err('Swerve',k+' must be positive and within the limits.');
    for(const [k,v] of Object.entries(sc.pid))if(!finite(v,0,1e6))err('Swerve PID',k+' must be a finite, nonnegative number.');
    for(const [k,v] of Object.entries(sc.controller))if(!finite(v,0,k==='angleDeadband'?1:1e6))err('Swerve controller',k+' is invalid.');
    const positions=[];
    for(const name of FRC.moduleNames){
      const m=sc.modules[name];
      for(const k of ['front','left'])if(!finite(m.location[k],-200,200))err(name,k+' position is invalid (inches).');
      positions.push(m.location);
      for(const kind of ['drive','angle']){
        boolean(m[kind],['inverted'],name+' '+kind);
        if(!FRC.swerveMotors.some(x=>x[1]===m[kind].type))err(name+' '+kind,'unsupported motor type: '+m[kind].type);
        can(m[kind],name+' '+kind,m[kind].type.startsWith('spark'),m[kind].type.startsWith('spark')?'rev-spark':m[kind].type.startsWith('talonfxs')?'ctre-talonfxs':'ctre-talon');
      }
      const en=m.encoder;
      boolean(en,['inverted'],name+' encoder');
      if(!FRC.swerveEncoders.some(x=>x[1]===en.type))err(name,'unsupported absolute encoder: '+en.type);
      if(['cancoder','canandmag_can'].includes(en.type))can(en,name+' encoder',en.type==='canandmag_can',en.type==='cancoder'?'ctre-cancoder':'redux-canandmag');
      if(en.type==='dutycycle')port(en.id,name+' encoder','DIO',25);
      if(en.type==='analog')port(en.id,name+' encoder','Analog',7);
      if(en.type==='attached'&&!m.angle.type.startsWith('sparkmax'))err(name,'angle controller must be SPARK MAX for an attached encoder.');
      if(en.type==='sparkflex_attached'&&!m.angle.type.startsWith('sparkflex'))err(name,'angle controller must be SPARK Flex for sparkflex_attached.');
      if(!finite(en.offset,-360,360))err(name,'encoder offset must be between −360–360 degrees.');
    }
    if(new Set(positions.map(x=>x.front+','+x.left)).size!==4)err('Swerve','all four module locations must be different.');
    const area=positions.slice(1).some((b,i)=>positions.slice(i+2).some(c=>Math.abs((b.front-positions[0].front)*(c.left-positions[0].left)-(b.left-positions[0].left)*(c.front-positions[0].front))>1e-6));
    if(!area)err('Swerve','module locations cannot be collinear / at a single point.');
    warn('Swerve','module offsets, inversions, gear ratios and PID values must be calibrated on the real robot.');
  }
  if(!FRC.gyros.some(x=>x[1]===sc.gyro.type))err('Gyro','unsupported gyro: '+sc.gyro.type);
  if(sc.gyro.type==='adis16448')for(const channel of [10,18,19])resource('DIO:'+channel,'ADIS16448 SPI / reset / status');
  if(['pigeon2','canandgyro'].includes(sc.gyro.type))can(sc.gyro,'Gyro',sc.gyro.type==='canandgyro',sc.gyro.type==='pigeon2'?'ctre-pigeon2':'redux-canandgyro');
  const bindingButtons=new Set();
  for(const b of p.controllerBindings){
    if(!FRC.buttons.some(x=>x[0]===b.button))err('Controller','invalid button: '+b.button);
    const bindingKey=(b.controller||'driver')+':'+b.button;
    if(bindingButtons.has(bindingKey))err('Controller',bindingKey+' is assigned twice.');bindingButtons.add(bindingKey);
    if(!['method','zeroGyro'].includes(b.type))err('Controller','invalid action.');
    if(b.type==='zeroGyro'&&sc.gyro.type==='none')err('Controller','select a gyro to zero the gyro.');
    if(b.type==='method'){
      if(paths.get(b.methodPath)?.type!=='method')err(b.button,'method not found: '+b.methodPath);
      if(b.stopMethod&&paths.get(b.stopMethod)?.type!=='method')err(b.button,'stop method not found: '+b.stopMethod);
      if(!['onTrue','whileTrue','onFalse'].includes(b.trigger))err(b.button,'invalid trigger type.');
      if(b.trigger==='onTrue'&&!b.independent)warn(b.button,'a one-shot motor output remains active; use a stop method or while-held behavior.');
    }
  }
  if(p.drive.type==='differential'||p.drive.type==='mecanum'){
    const slots=p.drive.type==='differential'?['left','right']:FRC.moduleNames;
    const selected=[];
    for(const slot of slots){const list=p.drive.motors[slot];if(!Array.isArray(list)||!list.length)err('Drive '+slot,'select at least one motor.');else for(const path of list){if(paths.get(path)?.type!=='motor')err(slot,'motor not found: '+path);selected.push(path);}}
    if(new Set(selected).size!==selected.length)err('Drive','a motor cannot be used in two drive groups.');
    if(new Set(selected.map(path=>path.split('.')[0])).size>1)err('Drive','keep drive motors in a single subsystem so default command ownership is explicit.');
  }
  for(const [i,step] of p.autonomous.entries()){
    if(!['method','wait','parallel'].includes(step.type))err('Autonomous '+(i+1),'invalid step type.');
    if(!finite(step.duration,0.02,15))err('Autonomous '+(i+1),'duration must be 0.02–15 seconds.');
    if(step.type==='method'&&paths.get(step.methodPath)?.type!=='method')err('Autonomous '+(i+1),'method not found: '+step.methodPath);
  }
  if(p.autonomous.reduce((a,s)=>a+(Number(s.duration)||0),0)>15)warn('Autonomous','total duration exceeds 15 seconds.');
  FRC.validateIntegrations?.(p,{err,warn,resource,port,can,finite,integer,boolean,paths,names});
  return {errors,warnings};
};
