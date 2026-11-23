'use strict';
// Reusable capabilities needed by complete robots; no team-specific Java is hidden in blocks.
const advancedValidate=FRC.validateIntegrations;
FRC.validateIntegrations=(p,ctx)=>{advancedValidate(p,ctx);const {err,finite,boolean}=ctx;
  if(p.swerveConfig.moduleOrder&&(!Array.isArray(p.swerveConfig.moduleOrder)||p.swerveConfig.moduleOrder.length!==4||new Set(p.swerveConfig.moduleOrder).size!==4||p.swerveConfig.moduleOrder.some(n=>!FRC.moduleNames.includes(n))))err('Swerve','Module order must contain each of the four modules exactly once.');
  if(p.integrations.vision.fusionMode&&!['filtered','freshness'].includes(p.integrations.vision.fusionMode))err('Vision','Invalid pose fusion filter.');
  for(const e of p.integrations.pathplanner.events){
    if(e.stopMethod&&(!p.subsystems.some(ss=>ss.methods.some(m=>ss.name+'.'+m.name===e.stopMethod))||e.stopMethod.split('.')[0]!==e.methodPath?.split('.')[0]))err('Autonomous event','End method must be a valid method in the same subsystem.');
    if(e.methodPath?.startsWith(FRC.driveOwner(p)?.name+'.'))for(const a of p.integrations.assets){try{const data=JSON.parse(a.text),contains=node=>node&&typeof node==='object'&&(node.type==='named'&&node.data?.name===e.name||Object.values(node).some(v=>Array.isArray(v)?v.some(contains):contains(v)));if(a.path.endsWith('.path')&&(data.eventMarkers||[]).some(m=>m.name===e.name||contains(m.command))||a.path.endsWith('.traj')&&(data.events||[]).some(m=>m.name===e.name))err(a.path,'Drive named command cannot be used in a path marker event: '+e.name);}catch{}}
  }
  const pins=new Set();for(const v of p.integrations.pinnedVendors||[]){if(!FRC.validCustomVendor(v))err('Vendor version','A valid 2026 vendordep is required.');if(pins.has(v?.uuid))err('Vendor version','Yinelenen vendor UUID.');pins.add(v?.uuid);}

};
const advancedInstall=FRC.installExtraBlocks;
FRC.installExtraBlocks=()=>{advancedInstall();const n=name=>({type:'input_value',name,check:'Number'}),f=(name,text)=>({type:'field_input',name,text}),menu=name=>({type:'field_dropdown',name,options:[['Select','']]}),choice=(name,options)=>({type:'field_dropdown',name,options}),num=(name,value)=>({type:'field_number',name,value}),stmt=(type,message0,args0,colour=200,extensions=[])=>({type,message0,args0,colour,extensions,previousStatement:null,nextStatement:null}),expr=(type,message0,args0,output='Number',extensions=[])=>({type,message0,args0,output,colour:180,extensions});
  Blockly.defineBlocksWithJsonArray([
    stmt('frc_initvar','%1 initial value %2 (at robot startup)',[f('VAR','sayac'),num('INITIAL',0)],330),
    {type:'frc_for_index',message0:'%1 counter from %2 inclusive → %3 exclusive',args0:[f('VAR','i'),n('FROM'),n('TO')],message1:'for each number %1',args1:[{type:'input_statement',name:'DO'}],colour:210,previousStatement:null,nextStatement:null},
    expr('frc_robot_mode','Robot mode %1?',[choice('MODE',[['autonomous enabled','AUTO'],['teleop enabled','TELEOP'],['test enabled','TEST'],['disabled','DISABLED'],['simulation','SIM'],['red alliance','RED']])],'Boolean'),
    stmt('frc_nt_bool_write','NT %1 boolean = %2',[f('KEY','/SmartDashboard/ready'),{type:'input_value',name:'VALUE',check:'Boolean'}],45),
    stmt('frc_motor_neutral','%1 idle mode %2',[menu('MOTOR'),choice('MODE',[['fren','BRAKE'],['serbest','COAST']])],230,['frc_motor_menu']),
    stmt('frc_led_pixel','%1 LED index %2 R %3 G %4 B %5',[menu('DEVICE'),n('INDEX'),n('R'),n('G'),n('B')],40,['studio_device']),
    expr('frc_tag_present','does %1 camera see tag %2?',[menu('CAMERA'),num('TAG',26)],'Boolean',['studio_camera']),
    expr('frc_tag_value','%1 tag %2 %3',[menu('CAMERA'),num('TAG',26),choice('METRIC',[['yaw (degrees)','yaw'],['area (%)','area']])],'Number',['studio_camera']),
    expr('frc_tags_present','does %1 camera see any tag in [%2]?',[menu('CAMERA'),f('IDS','21,26,28,2,5,10')],'Boolean',['studio_camera']),
    expr('frc_tags_yaw','%1 camera [%2] mean yaw (degrees)',[menu('CAMERA'),f('IDS','21,26,28,2,5,10')],'Number',['studio_camera']),
    stmt('frc_swerve_stream','YAGSL input stream forward %1 left %2 rotation %3 initial scale %4 alliance-relative %5',[n('X'),n('Y'),n('ROT'),n('SCALE'),choice('ALLIANCE',[['yes','TRUE'],['no','FALSE']])],65),
    stmt('frc_drive_speed','Robot-relative drive X %1 m/s Y %2 m/s rotation %3 rad/s',[n('X'),n('Y'),n('ROT')],65)
  ]);
};
FRC.parseTagIds=text=>{if(typeof text!=='string'||!/^[\d,\s]+$/.test(text))throw Error('Tag list must contain comma-separated integers.');const ids=text.split(',').map(s=>s.trim()===''?NaN:Number(s.trim()));if(!ids.length||ids.length>64||ids.some(n=>!Number.isInteger(n)||n<0||n>65535))throw Error('Tag ID must be 0–65535.');return [...new Set(ids)];};
const advancedExpression=FRC.extensionExpression;
FRC.extensionExpression=(b,ctx)=>{const {p,input,fail,result}=ctx,{device,camera}=FRC.extensionContext(b,ctx),q=FRC.s;let code,type='Number';switch(b.type){
  case 'frc_robot_mode':code={AUTO:'DriverStation.isAutonomousEnabled()',TELEOP:'DriverStation.isTeleopEnabled()',TEST:'DriverStation.isTestEnabled()',DISABLED:'DriverStation.isDisabled()',SIM:'edu.wpi.first.wpilibj.RobotBase.isSimulation()',RED:'DriverStation.getAlliance().orElse(DriverStation.Alliance.Blue)==DriverStation.Alliance.Red'}[b.getFieldValue('MODE')];if(!code)fail(b,'Invalid robot mode.');type='Boolean';break;
  case 'frc_tag_present':case 'frc_tag_value':{const id=Number(b.getFieldValue('TAG')),cam=camera();if(!Number.isInteger(id)||id<0||id>65535)fail(b,'Invalid tag ID.');if(cam.kind!=='photonvision')fail(b,'Select a PhotonVision camera for tag selection.');code=b.type==='frc_tag_present'?'RobotServices.vision().hasTag('+q(cam.id)+','+id+')':'RobotServices.vision().tagValue('+q(cam.id)+','+id+','+q(b.getFieldValue('METRIC'))+')';if(b.type==='frc_tag_present')type='Boolean';break;}
  case 'frc_tags_present':case 'frc_tags_yaw':{const ids=FRC.parseTagIds(b.getFieldValue('IDS')),cam=camera();if(cam.kind!=='photonvision')fail(b,'Select a PhotonVision camera for tag selection.');code='RobotServices.vision().'+(b.type==='frc_tags_present'?'hasAnyTag':'averageYaw')+'('+q(cam.id)+','+ids.join(',')+')';if(b.type==='frc_tags_present')type='Boolean';break;}
  default:return advancedExpression(b,ctx);
}return {code,type};};
const advancedStatement=FRC.extensionStatement;
FRC.extensionStatement=(b,ctx)=>{const {p,ss,m,component,input,fail,result,chain,level}=ctx,{device,drive}=FRC.extensionContext(b,ctx),q=FRC.s,j=FRC.javaNumber;switch(b.type){
  case 'frc_initvar':{const name=b.getFieldValue('VAR'),initial=Number(b.getFieldValue('INITIAL'));if(!FRC.identifier(name)||!Number.isFinite(initial))fail(b,'Enter a valid variable name and initial number.');result.variables.add(name);(result.initials??=new Map()).set(name,initial);return '// Initial value declared in the subsystem field.';}
  case 'frc_for_index':{const name=b.getFieldValue('VAR');if(!FRC.identifier(name))fail(b,'Invalid counter name.');result.variables.add(name);const id=(result.loopCount=(result.loopCount||0)+1),pad='    '.repeat(level),a=input(b,'FROM','Number'),z=input(b,'TO','Number');return 'double frc_from'+id+'=RobotIO.bounded('+a+',1000000.0);\n'+pad+'double frc_to'+id+'=RobotIO.bounded('+z+',1000000.0);\n'+pad+'for(int frc_loop'+id+'=0;frc_loop'+id+'<1000&&(frc_var_'+name+'=frc_from'+id+'+frc_loop'+id+')<frc_to'+id+';frc_loop'+id+'++){\n'+chain(b.getInputTargetBlock('DO'),level+1)+pad+'}';}
  case 'frc_nt_bool_write':return 'RobotServices.publishFlag('+q(b.getFieldValue('KEY'))+','+input(b,'VALUE','Boolean')+');';
  case 'frc_motor_neutral':{result.actuates=true;const c=component(b,'MOTOR','motor');if(FRC.motorFamily(c.motorType)!=='fx')fail(b,'This dynamic brake block is for TalonFX.');return c.name+'.setNeutralMode(com.ctre.phoenix6.signals.NeutralModeValue.'+(b.getFieldValue('MODE')==='BRAKE'?'Brake':'Coast')+');';}
  case 'frc_led_pixel':{const c=device(['led']);return 'frc_pixel_'+c.name+'('+['INDEX','R','G','B'].map(k=>input(b,k,'Number')).join(',')+');';}
  case 'frc_swerve_stream':{result.actuates=true;drive();if(p.drive.type!=='swerve')fail(b,'This block is for YAGSL swerve.');const streams=result.streams??=[],name=m.name+'_'+streams.length;streams.push({name,x:input(b,'X','Number'),y:input(b,'Y','Number'),rotation:input(b,'ROT','Number'),scale:input(b,'SCALE','Number'),alliance:b.getFieldValue('ALLIANCE')==='TRUE'});return 'frc_follow_'+name+'();';}
  case 'frc_drive_speed':result.actuates=true;drive();return 'driveRobotRelative(new edu.wpi.first.math.kinematics.ChassisSpeeds('+['X','Y','ROT'].map(k=>input(b,k,'Number')).join(',')+'));';
  default:return advancedStatement(b,ctx);
}};
const advancedCompile=FRC.compileAll;
FRC.compileAll=p=>{const r=advancedCompile(p);for(const ss of p.subsystems){const methods=r.compiled?.get(ss.name)?.methods||new Map(),initials=new Map();for(const m of methods.values())for(const [k,v]of m.initials||[]){if(initials.has(k)&&initials.get(k)!==v)r.errors.push(ss.name+': '+k+' has two different initial values.');initials.set(k,v);}}
  const actuates=(ssName,methodName,seen=new Set())=>{if(seen.has(methodName))return false;seen.add(methodName);const m=r.compiled?.get(ssName)?.methods.get(methodName);return !!m&&(m.actuates||[...m.calls].some(n=>actuates(ssName,n,seen)));};
  for(const b of p.controllerBindings)if(b.independent&&b.type==='method'){const [s,m]=b.methodPath.split('.');if(b.trigger==='whileTrue'||actuates(s,m))r.errors.push(b.methodPath+': independent buttons support only one-shot methods that do not drive motors.');}
  return r;
};
const advancedSubsystem=FRC.extraSubsystem;
FRC.extraSubsystem=(p,ss,compiled)=>{const e=advancedSubsystem(p,ss,compiled),j=FRC.javaNumber,q=FRC.s;
  for(const c of ss.components){if(c.type==='led'){
    e.helpers+='    public void frc_pixel_'+c.name+'(double index,double r,double g,double b){if(!Double.isFinite(index))return;int n=(int)index;if(n<0||n>='+c.length+')return;frc_buffer_'+c.name+'.setRGB(n,(int)Math.max(0,RobotIO.bounded(r,255)),(int)Math.max(0,RobotIO.bounded(g,255)),(int)Math.max(0,RobotIO.bounded(b,255)));}\n';e.periodic+='        '+c.name+'.setData(frc_buffer_'+c.name+');\n';
  }}
  for(const m of compiled.methods.values())for(const s of m.streams||[]){
    e.fields+='    private final swervelib.SwerveInputStream frc_stream_'+s.name+';\n';
    e.init+='        frc_stream_'+s.name+'=swervelib.SwerveInputStream.of(swerveDrive,()->'+s.x+',()->'+s.y+').withControllerRotationAxis(()->'+s.rotation+').deadband('+j(p.swerveConfig.deadband)+').scaleTranslation('+s.scale+').allianceRelativeControl('+s.alliance+');\n';
    e.helpers+='    private void frc_follow_'+s.name+'(){frc_lastDrive=Timer.getFPGATimestamp();swerveDrive.driveFieldOriented(frc_stream_'+s.name+'.get());}\n';
  }
  if(p.integrations.simulationStart&&FRC.driveOwner(p)?.name===ss.name){const pose=p.integrations.simulationStart;e.init+='        if(edu.wpi.first.wpilibj.RobotBase.isSimulation())resetPose(new edu.wpi.first.math.geometry.Pose2d('+j(pose.x)+','+j(pose.y)+',edu.wpi.first.math.geometry.Rotation2d.fromDegrees('+j(pose.angle)+')));\n';}
  return e;
};
const advancedFiles=FRC.integrationFiles;
FRC.integrationFiles=p=>{const files=advancedFiles(p);
  for(const v of p.integrations.pinnedVendors||[]){for(const key of Object.keys(files).filter(k=>k.startsWith('vendordeps/')))try{if(JSON.parse(files[key]).uuid===v.uuid)delete files[key];}catch{}files['vendordeps/'+v.fileName]=JSON.stringify(v,null,2);}
  return files;};
const advancedAuto=FRC.autoIntegration;
FRC.autoIntegration=(p,method,command)=>{const r=advancedAuto(p,method,command);if(p.integrations.pathplanner.enabled)for(const e of p.integrations.pathplanner.events){const marker=p.integrations.assets.some(a=>{if(!a.path.endsWith('.path'))return false;try{return JSON.parse(a.text).eventMarkers?.some(m=>m.name===e.name&&!m.command);}catch{return false;}});if(marker)r.init+='        new com.pathplanner.lib.events.EventTrigger('+FRC.s(e.name)+').onTrue('+command(e.methodPath,e.duration,e.stopMethod)+');\n';}return r;};
Object.assign(FRC.extraFieldEnums,{frc_robot_mode:{MODE:['AUTO','TELEOP','TEST','DISABLED','SIM','RED']},frc_motor_neutral:{MODE:['BRAKE','COAST']},frc_swerve_stream:{ALLIANCE:['TRUE','FALSE']},frc_tag_value:{METRIC:['yaw','area']}});
