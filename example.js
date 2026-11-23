'use strict';
FRC.example = () => {
  const p=FRC.defaultProject();
  const number=(name,value)=>'<value name="'+name+'"><shadow type="math_number"><field name="NUM">'+value+'</field></shadow></value>';
  const start=(ss,method,body)=>'<xml xmlns="https://developers.google.com/blockly/xml"><block type="frc_method_start" x="45" y="45"><field name="SSN">'+ss+'</field><field name="MN">'+method+'</field><next>'+body+'</next></block></xml>';
  const drive=(x)=>'<block type="frc_drive">'+number('X',x)+number('Y',0)+number('ROT',0)+'</block>';
  const run='<block type="frc_if_else"><value name="COND"><block type="frc_not"><value name="V"><block type="frc_limitswitch"><field name="SWITCH">IntakeSubsystem.limit</field></block></value></block></value><statement name="DO"><block type="frc_drive_motor"><field name="MOTOR">IntakeSubsystem.intakeMotor</field>'+number('SPEED',0.2)+'</block></statement><statement name="ELSE"><block type="frc_stop_motor"><field name="MOTOR">IntakeSubsystem.intakeMotor</field></block></statement></block>';
  p.subsystems=[{name:'SwerveSubsystem',components:[],methods:[{name:'ilerle',role:'manual',blocks:start('SwerveSubsystem','ilerle',drive(0.15))},{name:'dur',role:'manual',blocks:start('SwerveSubsystem','dur',drive(0))}]},
    {name:'IntakeSubsystem',components:[{type:'motor',name:'intakeMotor',...FRC.motorDefaults(),canId:20},{type:'encoder',name:'intakeEncoder',encType:'builtin',parentMotor:'intakeMotor',inverted:false},{type:'limitswitch',name:'limit',dioChannel:0,normallyOpen:true}],methods:[{name:'calistir',role:'manual',blocks:start('IntakeSubsystem','calistir',run)},{name:'durdur',role:'manual',blocks:start('IntakeSubsystem','durdur','<block type="frc_stop_motor"><field name="MOTOR">IntakeSubsystem.intakeMotor</field></block>')},{name:'izle',role:'periodic',blocks:start('IntakeSubsystem','izle','<block type="frc_telemetry"><field name="KEY">RPM</field><value name="VALUE"><block type="frc_enc_vel"><field name="ENCODER">IntakeSubsystem.intakeEncoder</field></block></value></block>')}]}];
  p.controllerBindings=[{button:'a',type:'method',methodPath:'IntakeSubsystem.calistir',trigger:'whileTrue',stopMethod:'IntakeSubsystem.durdur'},{button:'back',type:'zeroGyro'}];
  p.autonomous=[{type:'wait',duration:0.2},{type:'method',methodPath:'SwerveSubsystem.ilerle',duration:1}];
  return p;
};
