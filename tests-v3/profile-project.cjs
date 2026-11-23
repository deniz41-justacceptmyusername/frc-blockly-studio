'use strict';
// Passed directly to Playwright evaluate; FRC is the loaded application's API.
module.exports=function profileProject(){
 const p=FRC.defaultProject();p.drive.type='none';p.swerveConfig.gyro.type='none';p.integrations.operator.enabled=true;
 const B=FRC.xmlBlock,F=FRC.xmlField,N=FRC.xmlNumber,ss={name:'ProfilesSubsystem',components:[],methods:[]},commands=[];
 for(const [index,[name,motorType]]of [['kraken','TalonFX_KrakenX44'],['sparkMax','SparkMax_NEO'],['sparkFlex','SparkFlex_Vortex']].entries()){
  ss.components.push({type:'motor',name,...FRC.motorDefaults(),motorType,canId:20+index,closedLoopConfigured:true,focLicensed:true,p:1,ff:.1,motion:{configured:true,cruise:12,acceleration:34,jerk:56,tolerance:.07}});
  const path=ss.name+'.'+name;
  for(const [type,input,value]of [['frc_profile_position','POSITION',2],['frc_profile_velocity','VELOCITY',3],['frc_motor_position','POSITION',1],['frc_motor_voltage','VOLTAGE',4],['frc_drive_velocity','VEL',5],['frc_drive_current','CUR',6]])commands.push([type,F('MOTOR',path)+N(input,value)]);
 }
 commands.push(['frc_telemetry',F('KEY','time')+'<value name="VALUE">'+B('frc_time')+'</value>']);
 for(const op of ['SIN','COS','TAN'])commands.push(['frc_telemetry',F('KEY',op)+'<value name="VALUE">'+B('frc_trig',F('OP',op)+N('ANGLE',.5))+'</value>']);
 commands.push(['frc_rumble',F('CONTROLLER','driver')+N('POWER',.2)],['frc_rumble',F('CONTROLLER','operator')+N('POWER',.3)],['frc_telemetry',F('KEY','operator')+'<value name="VALUE">'+B('frc_operator_axis',F('AXIS','LeftY'))+'</value>']);
 ss.methods.push({name:'testProfiles',role:'manual',blocks:FRC.xmlMethod(commands.reduceRight((next,[type,body])=>B(type,body,next),''))});p.subsystems.push(ss);
 const compile=FRC.compileAll(p);if(compile.errors.length)throw Error(compile.errors.join('; '));
 const files=FRC.buildFiles(p).files,source=files['src/main/java/frc/robot/subsystems/ProfilesSubsystem.java'];
 const checks=[
  {name:'Profile fixture accepts all TalonFX/MAX/Flex control and utility blocks',passed:compile.errors.length===0},
  {name:'TalonFX motion cruise and acceleration remain RPS and RPS per second',passed:source.includes('frc_cfg_kraken.MotionMagic.MotionMagicCruiseVelocity = 12.0;')&&source.includes('frc_cfg_kraken.MotionMagic.MotionMagicAcceleration = 34.0;')&&source.includes('.withAcceleration(34.0)')},
  {name:'SPARK MAX and Flex motion cruise and acceleration convert to RPM units',passed:['sparkMax','sparkFlex'].every(name=>source.includes('frc_cfg_'+name+'.closedLoop.maxMotion.cruiseVelocity(720.0).maxAcceleration(2040.0)'))},
  {name:'Profile source includes both vendor modes, time, trig, and driver/operator rumble',passed:source.includes('MotionMagicVoltage')&&source.includes('MotionMagicVelocityVoltage')&&source.includes('kMAXMotionPositionControl')&&source.includes('kMAXMotionVelocityControl')&&['Math.sin','Math.cos','Math.tan','Timer.getFPGATimestamp()','RobotIO.driver.setRumble','RobotIO.operator.setRumble'].every(text=>source.includes(text))}
 ];
 return {files,checks};
};
