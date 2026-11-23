'use strict';
FRC.integrationDefaults=()=>({
  cameras:[],field:'k2026RebuiltWelded',vision:{maxAge:0.5,maxAmbiguity:0.2,maxDistance:6,maxZ:0.4,maxJump:3,stdXY:0.7,stdHeading:999999,maxYawRate:540},
  pathplanner:{enabled:false,translationP:5,rotationP:4,massKg:50,moi:6,friction:1.1,motor:'krakenx60',motorsPerModule:1,events:[]},
  choreo:{enabled:false,translationP:5,rotationP:4},
  telemetry:{enabled:true,dataLog:true,elastic:true,robotModel:'',publishPeriod:0.05},
  sysid:{enabled:false,subsystem:'',motor:'',ramp:1,step:4,timeout:5},
  operator:{enabled:false,port:1},
  motion:{wheelDiameterM:0.1016,gearRatio:6.75,trackWidthM:0.6,wheelBaseM:0.6,maxSpeed:4.5,maxAngular:8,encoders:{},kP:1,kI:0,kD:0,kS:0.2,kV:2.3},
  assets:[],autonomousMode:'blocks',selectedAuto:'',customSources:[],customVendors:[]
});
FRC.cameraDefaults=()=>({id:'frontCamera',kind:'limelight',name:'limelight',enabled:true,pipeline:0,driverMode:false,poseFusion:false,megaTag2:true,x:0.25,y:0,z:0.5,roll:0,pitch:0,yaw:0});
FRC.deviceDefinitions={
  servo:{label:'Servo (PWM)',fields:[['pwmChannel','PWM channel','integer',0],['initialAngle','Initial angle (degrees)','number',90]]},
  solenoid:{label:'Tek solenoid',fields:[['moduleType','Module','pneumatics','REVPH'],['moduleId','Module CAN ID','integer',1],['channel','Kanal','integer',0]]},
  doublesolenoid:{label:'Double solenoid',fields:[['moduleType','Module','pneumatics','REVPH'],['moduleId','Module CAN ID','integer',1],['forwardChannel','Forward channel','integer',0],['reverseChannel','Geri kanal','integer',1]]},
  compressor:{label:'Compressor',fields:[['moduleType','Module','pneumatics','REVPH'],['moduleId','Module CAN ID','integer',1],['enabled','Run automatically using pressure switch','boolean',true]]},
  digital:{label:'Digital sensor / beam break',fields:[['dioChannel','DIO channel','integer',0],['activeLow','Active low','boolean',true]]},
  analog:{label:'Analog sensor',fields:[['analogChannel','Analog kanal','integer',0],['scale','Measurement scale per volt','number',1],['offset','Measurement offset','number',0]]},
  ultrasonic:{label:'Ultrasonik (ping / echo)',fields:[['pingChannel','Ping DIO','integer',0],['echoChannel','Echo DIO','integer',1]]},
  canrange:{label:'CTRE CANrange',fields:[['canId','CAN ID','integer',30],['canbus','CAN bus','text','rio']]},
  relay:{label:'Relay',fields:[['relayChannel','Relay channel','integer',0]]},
  led:{label:'Addressable LED',fields:[['pwmChannel','PWM channel','integer',0],['length','LED count','integer',60]]}
};
FRC.extendedComponentTypes=Object.keys(FRC.deviceDefinitions);
FRC.physicsDefaults=()=>({enabled:true,model:'flywheel',motorModel:'auto',gearing:1,inertia:0.002,mass:5,radius:0.025,length:0.5,min:0,max:1.5,initial:0});
FRC.motionDefaults=()=>({configured:false,cruise:20,acceleration:40,jerk:0,tolerance:0.05});
for(const n of ['DriveIO','RobotServices','RobotVision','VisionCamera','MotorPhysics','Elastic','resetPose','getRobotSpeeds','driveRobotRelative','addVisionMeasurement','Encoder'])FRC.reserved.add(n);
FRC.extraComponentDefaults=type=>({type,name:'',...Object.fromEntries((FRC.deviceDefinitions[type]?.fields||[]).map(([k,,type,v])=>[k,v]))});
FRC.driveOwner=p=>{if(p.drive.type==='none')return null;if(p.drive.type==='swerve')return p.subsystems.find(s=>s.name===p.drive.subsystem);const slots=p.drive.type==='differential'?['left','right']:FRC.moduleNames,paths=slots.flatMap(slot=>p.drive.motors[slot]||[]);return p.subsystems.find(s=>paths.some(path=>path.startsWith(s.name+'.')));};
FRC.hasOdometry=p=>p.drive.type==='swerve'||['differential','mecanum'].includes(p.drive.type)&&(p.drive.type==='differential'?['left','right']:FRC.moduleNames).every(slot=>!!p.integrations.motion.encoders[slot]);
FRC.assetPath=path=>typeof path==='string'&&/^(pathplanner\/(autos\/[A-Za-z0-9 _.-]+\.auto|paths\/[A-Za-z0-9 _.-]+\.path|(?:settings|navgrid)\.json)|choreo\/[A-Za-z0-9 _.-]+\.traj)$/.test(path)&&!path.includes('..')&&!path.includes('\\');
FRC.validCustomVendor=v=>v&&typeof v==='object'&&v.frcYear==='2026'&&/^[A-Za-z0-9_.-]+\.json$/.test(v.fileName)&&!v.fileName.includes('..')&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v.uuid)&&typeof v.name==='string'&&Array.isArray(v.mavenUrls)&&v.mavenUrls.every(u=>typeof u==='string'&&u.startsWith('https://'))&&Array.isArray(v.javaDependencies)&&v.javaDependencies.every(d=>d&&['groupId','artifactId','version'].every(k=>typeof d[k]==='string'&&d[k].length));
FRC.assetNames=(p,kind)=>p.integrations.assets.filter(a=>a.path.startsWith(kind==='pathplanner'?'pathplanner/autos/':'choreo/')&&a.path.endsWith(kind==='pathplanner'?'.auto':'.traj')).map(a=>a.path.split('/').at(-1).replace(/\.(auto|traj)$/,''));
FRC.extraNormalize=(p,raw,notes)=>{
  if(!p.integrations||typeof p.integrations!=='object'||Array.isArray(p.integrations))throw Error('Invalid integration settings.');
  const i=p.integrations;
  if(i.field==='k2026RebuiltAndyMark'){i.field='k2026RebuiltAndymark';notes.push('Corrected the 2026 AndyMark field enum name.');}
  for(const key of ['cameras','assets','customSources','customVendors'])if(!Array.isArray(i[key]))throw Error(key+' must be a list.');
  for(const key of ['vision','pathplanner','choreo','telemetry','operator','motion','sysid'])if(!i[key]||typeof i[key]!=='object'||Array.isArray(i[key]))throw Error(key+' settings are invalid.');
  if(!Array.isArray(i.pathplanner.events)||!i.motion.encoders||typeof i.motion.encoders!=='object')throw Error('Invalid event / encoder settings.');
  if(i.cameras.length>16||i.assets.length>300||i.customSources.length>100||i.customVendors.length>50)throw Error('Integration file / camera limit exceeded.');
  for(const c of i.cameras)if(!c||typeof c!=='object')throw Error('Invalid camera entry.');
  for(const ss of p.subsystems)for(const c of ss.components)if(FRC.extendedComponentTypes.includes(c.type))Object.assign(c,{...FRC.extraComponentDefaults(c.type),...c});
  for(const ss of p.subsystems)for(const c of ss.components){if(c.type==='motor'){c.simulation={...FRC.physicsDefaults(),...c.simulation};c.motion={...FRC.motionDefaults(),...c.motion};}if(c.type==='encoder'&&c.encType==='quadrature')Object.assign(c,{channelA:0,channelB:1,countsPerRev:2048,...c});}
  if((raw.schemaVersion||1)<3)notes.push('Project migrated to Studio 3 format; existing blocks and hardware settings were preserved.');
};
FRC.validateIntegrations=(p,ctx)=>{
  const {err,warn,resource,port,can,finite,integer,boolean,paths}=ctx,i=p.integrations;
  if(!i){err('Integration','Settings structure is missing.');return;}
  boolean(i.operator,['enabled'],'Operator');
  if(!integer(i.operator.port,0,5))err('Operator','USB port must be 0–5.');
  if(i.operator.enabled&&i.operator.port===p.controllerPort)err('Operator','Driver and operator cannot use the same port.');
  const cameraIds=new Set(),cameraNames=new Set();
  for(const c of i.cameras){
    const label='Kamera '+c.id;
    if(!FRC.identifier(c.id)||cameraIds.has(c.id))err(label,'Enter a unique, valid camera ID.');cameraIds.add(c.id);
    if(!['limelight','photonvision','usb'].includes(c.kind))err(label,'Unsupported camera type.');
    if(typeof c.name!=='string'||!c.name.trim()||c.name.length>120||cameraNames.has(c.kind+':'+c.name))err(label,'Enter a unique camera / NetworkTables name.');cameraNames.add(c.kind+':'+c.name);
    boolean(c,['enabled','poseFusion','driverMode','megaTag2'],label);
    if(!integer(c.pipeline,0,255))err(label,'Pipeline must be 0–255.');
    for(const k of ['x','y','z'])if(!finite(c[k],-10,10))err(label,k+' is invalid in metres.');
    for(const k of ['roll','pitch','yaw'])if(!finite(c[k],-360,360))err(label,k+' is invalid in degrees.');
    if(c.enabled&&c.poseFusion&&!FRC.hasOdometry(p))err(label,'Pose fusion requires a gyro and drive odometry.');
    if(c.kind==='usb'&&(!integer(Number(c.name),0,9)||c.poseFusion))err(label,'USB camera name must be a device number from 0–9; pose fusion is unavailable.');
  }
  for(const k of ['maxAge','maxDistance','maxZ','maxJump','stdXY','stdHeading','maxYawRate'])if(!finite(i.vision[k],0.001,k==='stdHeading'?1e9:10000))err('Vision',k+' must be positive.');
  if(!finite(i.vision.maxAmbiguity,0,1))err('Vision','Ambiguity limit must be 0–1.');
  if(!['k2026RebuiltWelded','k2026RebuiltAndymark','k2025ReefscapeWelded','k2025ReefscapeAndyMark'].includes(i.field))err('Vision','Invalid AprilTag field layout.');
  for(const [key,c] of Object.entries({PathPlanner:i.pathplanner,Choreo:i.choreo})){
    boolean(c,['enabled'],key);
    if(c.enabled&&!FRC.hasOdometry(p))err(key,'Path following requires complete drive odometry.');
    if(c.enabled&&p.drive.type==='none')err(key,'No drive system.');
    if(c.enabled&&key==='Choreo'&&p.drive.type==='mecanum')err(key,'Choreo supports swerve/differential samples; use PathPlanner for mecanum.');
    for(const g of ['translationP','rotationP'])if(!finite(c[g],0,1e4))err(key,g+' is invalid.');
  }
  for(const key of ['massKg','moi','friction'])if(!finite(i.pathplanner[key],0.01,2000))err('PathPlanner',key+' must be positive.');
  if(!['krakenx60','falcon500','neo','vortex'].includes(i.pathplanner.motor)||!integer(i.pathplanner.motorsPerModule,1,4))err('PathPlanner','Invalid motor model / count.');
  if(!finite(i.telemetry.publishPeriod,0.02,1))err('Telemetri','Publish period must be 0.02–1 seconds.');
  boolean(i.telemetry,['enabled','dataLog','elastic'],'Telemetri');
  if(!['blocks','pathplanner','choreo'].includes(i.autonomousMode))err('Autonomous','Invalid autonomous source type.');
  if(i.autonomousMode!=='blocks'&&(!i[i.autonomousMode].enabled||!FRC.assetNames(p,i.autonomousMode).includes(i.selectedAuto)))err('Autonomous','Select an autonomous file imported for the enabled integration.');
  const assetPaths=new Set();
  for(const a of i.assets){
    if(!a||!FRC.assetPath(a.path)||typeof a.text!=='string'||a.text.length>5e6){err('File','Invalid deploy file.');continue;}
    if(assetPaths.has(a.path))err(a.path,'The same deploy file was added twice.');assetPaths.add(a.path);
    let json;try{json=JSON.parse(a.text);}catch{err(a.path,'Invalid JSON.');continue;}
    if(!json||typeof json!=='object'||Array.isArray(json)){err(a.path,'A JSON object is required.');continue;}
    if(a.path.endsWith('.path')&&(!Array.isArray(json.waypoints)||json.waypoints.length<2))err(a.path,'PathPlanner path must contain at least two waypoints.');
    if(a.path.endsWith('.auto')&&(!json.command||typeof json.command!=='object'))err(a.path,'PathPlanner auto command tree is missing.');
    if(a.path.endsWith('.traj')&&(!json.trajectory||!Array.isArray(json.trajectory.samples)||!json.trajectory.samples.length))err(a.path,'Choreo trajectory.samples eksik.');
    if(a.path.endsWith('.traj')&&json.trajectory?.sampleType!==(p.drive.type==='differential'?'Differential':'Swerve'))err(a.path,'Choreo sampleType does not match the selected drive system.');
    if(a.path.endsWith('.traj')){
      if(json.version!==3)err(a.path,'Choreo 2026 requires version 3 .traj output.');
      let previous=-1;const keys=p.drive.type==='differential'?['t','x','y','heading','vl','vr','omega','al','ar','alpha','fl','fr']:['t','x','y','heading','vx','vy','omega','ax','ay','alpha'];
      for(const s of json.trajectory?.samples||[]){if(!s||keys.some(k=>!finite(s[k],-1e7,1e7))||s.t<0||s.t<=previous){err(a.path,'Trajectory samples must contain finite SI values and increasing timestamps.');break;}if(p.drive.type!=='differential'&&['fx','fy'].some(k=>!Array.isArray(s[k])||s[k].length!==4||s[k].some(v=>!finite(v,-1e7,1e7)))){err(a.path,'Swerve sample requires four wheel forces (fx/fy).');break;}previous=s.t;}
    }
    if(a.path.endsWith('.path')||a.path.endsWith('.auto'))if(typeof json.version!=='string'||json.version.split('.')[0]!=='2025')err(a.path,'PathPlanner 2026 requires the 2025.x file schema.');
    if(a.path.endsWith('.path')){
      for(const w of json.waypoints||[])for(const k of ['anchor','prevControl','nextControl'])if((k==='anchor'||w[k]!=null)&&(!w[k]||!finite(w[k].x,-1000,1000)||!finite(w[k].y,-1000,1000)))err(a.path,'Invalid waypoint / control point.');
      for(const k of ['maxVelocity','maxAcceleration','maxAngularVelocity','maxAngularAcceleration','nominalVoltage'])if(!finite(json.globalConstraints?.[k],.001,10000))err(a.path,'globalConstraints.'+k+' must be positive.');
      for(const k of ['goalEndState','idealStartingState'])if(!(k==='idealStartingState'&&json[k]==null)&&(!json[k]||!finite(json[k].velocity,0,1000)||!finite(json[k].rotation,-1e7,1e7)))err(a.path,k+' velocity / heading values are missing.');
    }
    if(a.path==='pathplanner/settings.json'){
      for(const k of ['robotMass','robotMOI','driveWheelRadius','driveGearing','maxDriveSpeed','wheelCOF','driveCurrentLimit'])if(!finite(json[k],.00001,1e6))err(a.path,k+' must be positive.');
      if(json.holonomicMode!==(p.drive.type!=='differential'))err(a.path,'holonomicMode does not match the drive type.');
      if(!['krakenX60','krakenX60FOC','falcon500','falcon500FOC','vortex','NEO','CIM','miniCIM'].includes(json.driveMotorType))err(a.path,'Unsupported driveMotorType.');
      if(json.holonomicMode){for(const k of ['fl','fr','bl','br'])for(const axis of ['X','Y'])if(!finite(json[k+'Module'+axis],-10,10))err(a.path,k+' module location is invalid.');}else if(!finite(json.robotTrackwidth,.01,10))err(a.path,'invalid robotTrackwidth.');
    }
  }
  const eventNames=new Set();
  for(const e of i.pathplanner.events){
    if(!e||typeof e.name!=='string'||!e.name.trim()||eventNames.has(e.name))err('PathPlanner event','A unique event name is required.');else eventNames.add(e.name);
    if(paths.get(e?.methodPath)?.type!=='method')err('PathPlanner event','Method not found.');
    if(!finite(e?.duration,0.02,15))err('PathPlanner event','Duration must be 0.02–15 seconds.');
    if(e?.methodPath?.startsWith(FRC.driveOwner(p)?.name+'.')&&!e.allowDrive)err('PathPlanner event','An event requiring the drive subsystem interrupts the path command; select a mechanism method.');
  }
  function inspectCommand(node,label,seen=new Set()){
    if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
    if(!['wait','named','path','sequential','parallel','race','deadline'].includes(node.type)||!node.data||typeof node.data!=='object'){err(label,'Invalid PathPlanner command tree.');return;}
    if(node.type==='wait'&&!finite(node.data.waitTime,0,1e5))err(label,'Invalid wait duration.');
    if(['sequential','parallel','race','deadline'].includes(node.type)&&!Array.isArray(node.data.commands))err(label,'Command group must contain a commands list.');
    if(node.type==='named'&&!eventNames.has(node.data?.name))err(label,'Named command is not defined: '+node.data?.name);
    if(node.type==='path'&&!assetPaths.has('pathplanner/paths/'+node.data?.pathName+'.path'))err(label,'Missing path file: '+node.data?.pathName);
    if(node.data?.commands)for(const c of node.data.commands)inspectCommand(c,label,seen);
    if(node.command)inspectCommand(node.command,label,seen);
  }
  for(const a of i.assets)try{const j=JSON.parse(a.text);if(a.path.endsWith('.auto')){if(j.choreoAuto)err(a.path,'Select Choreo files directly from the Choreo source; PathPlanner choreoAuto is not supported in this version.');inspectCommand(j.command,a.path);}if(a.path.endsWith('.path'))for(const e of j.eventMarkers||[])if(e.command)inspectCommand(e.command,a.path);if(a.path.endsWith('.traj'))for(const e of j.events||[])if(e.name&&!eventNames.has(e.name))err(a.path,'Bind the Choreo event to a method: '+e.name);}catch{}
  if(['differential','mecanum'].includes(p.drive.type)){
    const slots=p.drive.type==='differential'?['left','right']:FRC.moduleNames;
    for(const k of ['wheelDiameterM','gearRatio','trackWidthM','wheelBaseM','maxSpeed','maxAngular'])if(!finite(i.motion[k],0.001,1000))err('Drive physics',k+' must be positive.');
    for(const k of ['kP','kI','kD','kS','kV'])if(!finite(i.motion[k],0,10000))err('Drive control',k+' is invalid.');
    const any=slots.some(s=>i.motion.encoders[s]);
    if(any){
      if(p.swerveConfig.gyro.type==='none')err('Odometry','Select a gyro.');
      const sensors=new Set();for(const slot of slots){const path=i.motion.encoders[slot],c=paths.get(path);if(!c||c.type!=='encoder'||!['builtin','quadrature'].includes(c.encType)||!path.startsWith(FRC.driveOwner(p)?.name+'.'))err('Odometry '+slot,'Select a cumulative motor / quadrature encoder from the drive subsystem.');else{const identity=c.encType==='builtin'?path.split('.')[0]+'.'+c.parentMotor:path;if(sensors.has(identity))err('Odometry '+slot,'The same physical encoder cannot be used for two wheel groups.');sensors.add(identity);if(c.encType==='builtin'&&!p.drive.motors[slot]?.includes(path.split('.')[0]+'.'+c.parentMotor))err('Odometry '+slot,'The encoder motor must belong to this wheel group.');if(c.encType==='quadrature'&&!c.parentMotor)warn('Odometry '+slot,'Select the associated motor for the quadrature encoder to move in simulation.');}}
    }
  }
  const modules=new Set();
  for(const ss of p.subsystems)for(const c of ss.components){const label=ss.name+'.'+c.name;
    if(c.type==='encoder'&&c.encType==='quadrature'){port(c.channelA,label+' A','DIO',25);port(c.channelB,label+' B','DIO',25);if(!finite(c.countsPerRev,1,1e7))err(label,'Pulses per rotation must be positive.');}
    if(!FRC.deviceDefinitions[c.type])continue;
    if(c.type==='servo'){port(c.pwmChannel,label,'PWM',19);if(!finite(c.initialAngle,0,180))err(label,'Initial angle must be 0–180.');}
    if(c.type==='led'){port(c.pwmChannel,label,'PWM',19);if(!integer(c.length,1,1000))err(label,'LED count must be 1–1000.');resource('AddressableLED:engine',label);}
    if(['solenoid','doublesolenoid','compressor'].includes(c.type)){
      if(!['REVPH','CTREPCM'].includes(c.moduleType)||!integer(c.moduleId,0,62))err(label,'Invalid pneumatic module / CAN ID.');
      const mod=c.moduleType+':'+c.moduleId;if(!modules.has(mod)){can({id:c.moduleId,canbus:'rio'},label,false,'pneumatic-'+c.moduleType);modules.add(mod);}
      const max=c.moduleType==='REVPH'?15:7;
      for(const key of c.type==='solenoid'?['channel']:c.type==='doublesolenoid'?['forwardChannel','reverseChannel']:[]){if(!integer(c[key],0,max))err(label,key+' exceeds the channel limit.');else resource('PNEU:'+mod+':'+c[key],label);}
      if(c.type==='compressor'){resource('Compressor:'+mod,label);boolean(c,['enabled'],label);}
    }
    if(c.type==='digital'){port(c.dioChannel,label,'DIO',25);boolean(c,['activeLow'],label);}
    if(c.type==='analog'){port(c.analogChannel,label,'Analog',7);for(const k of ['scale','offset'])if(!finite(c[k],-1e9,1e9))err(label,k+' is invalid.');}
    if(c.type==='ultrasonic'){port(c.pingChannel,label+' ping','DIO',25);port(c.echoChannel,label+' echo','DIO',25);}
    if(c.type==='canrange')can({id:c.canId,canbus:c.canbus},label,false,'ctre-canrange');
    if(c.type==='relay')port(c.relayChannel,label,'Relay',3);
  }
  if(i.sysid.enabled){
    const c=paths.get(i.sysid.subsystem+'.'+i.sysid.motor);
    if(!c||c.type!=='motor')err('SysId','Select a valid subsystem / motor.');
    else if(!['fx','max','flex'].includes(FRC.motorFamily(c.motorType))||!FRC.isBrushless(c))err('SysId','Select a TalonFX or brushless SPARK motor with an internal position / velocity sensor.');
    for(const k of ['ramp','step','timeout'])if(!finite(i.sysid[k],0.01,k==='step'?8:15))err('SysId',k+' is invalid.');
    warn('SysId','Dashboard test commands run only in Test mode; prepare the mechanism.');
  }
  for(const ss of p.subsystems)for(const c of ss.components)if(c.type==='motor'){
    const s={...FRC.physicsDefaults(),...c.simulation},label=ss.name+'.'+c.name+' simulation';
    const motion={...FRC.motionDefaults(),...c.motion};boolean(motion,['configured'],ss.name+'.'+c.name+' profil');
    for(const k of ['cruise','acceleration','tolerance'])if(!finite(motion[k],.000001,1e6))err(ss.name+'.'+c.name,'Profil '+k+' must be positive.');
    if(!finite(motion.jerk,0,1e7))err(ss.name+'.'+c.name,'Invalid profile jerk.');
    if(motion.configured&&(!['fx','max','flex'].includes(FRC.motorFamily(c.motorType))||!FRC.isBrushless(c)))err(ss.name+'.'+c.name,'Select a brushless CAN motor with a sensor for Motion Magic / MAXMotion.');
    boolean(s,['enabled'],label);
    if(!['flywheel','elevator','arm'].includes(s.model))err(label,'Invalid physics model.');
    if(!['auto','cim','neo','neo550','vortex','falcon500','krakenx60','krakenx44','775pro'].includes(s.motorModel))err(label,'Invalid physics motor model.');
    for(const k of ['gearing','inertia','mass','radius','length'])if(!finite(s[k],0.000001,1e6))err(label,k+' must be positive.');
    if(!finite(s.min,-10000,10000)||!finite(s.max,-10000,10000)||s.min>=s.max||!finite(s.initial,s.min,s.max))err(label,'Initial position must be within the lower / upper limits.');
  }
  for(const [idx,s]of p.autonomous.entries())if(s.type==='parallel'){
    if(!Array.isArray(s.methods)||s.methods.length<2||s.methods.length>16){err('Parallel step '+(idx+1),'Select at least two methods.');continue;}
    const owners=new Set();for(const path of s.methods){if(paths.get(path)?.type!=='method')err('Parallel step','Method not found: '+path);const owner=String(path).split('.')[0];if(owners.has(owner))err('Parallel step','Two parallel commands cannot use the same subsystem.');owners.add(owner);}
  }
  for(const b of p.controllerBindings){if(b.controller&&!['driver','operator'].includes(b.controller))err('Controller','Invalid controller type.');if(b.controller==='operator'&&!i.operator.enabled)err('Controller','Enable the operator controller.');}
  const sourcePaths=new Set();for(const c of i.customSources){if(!c||typeof c.path!=='string'||!/^frc\/robot\/custom\/(?:[A-Za-z_]\w*\/)*[A-Za-z_]\w*\.java$/.test(c.path)||typeof c.text!=='string'||c.text.length>1e6)err('Custom Java','Files must be .java under frc/robot/custom (up to 1 MB).');if(sourcePaths.has(c?.path))err('Custom Java','The same source path was added twice.');sourcePaths.add(c?.path);}
  const vendorNames=new Set(Object.values(FRC.assets?.vendors||{}).map(v=>v.fileName)),vendorIds=new Set(Object.values(FRC.assets?.vendors||{}).map(v=>v.uuid));
  for(const v of Object.values(FRC.integrationAssets?.vendors||{})){vendorNames.add(v.fileName);vendorIds.add(v.uuid);}
  for(const v of i.customVendors||[]){if(!FRC.validCustomVendor(v))err('Vendordep','A valid 2026 vendordep is required.');else if(vendorNames.has(v.fileName)||vendorIds.has(v.uuid))err('Vendordep','Built-in or duplicate vendors cannot be overwritten.');else{vendorNames.add(v.fileName);vendorIds.add(v.uuid);}}
};
