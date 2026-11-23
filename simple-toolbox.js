'use strict';
// One set of building blocks for all mechanisms, arranged by basic operation.
FRC.toolbox=()=>({kind:'categoryToolbox',contents:[
 ['Motors and hardware','#e94560',['frc_drive_motor','frc_stop_motor','frc_drive_velocity','frc_motor_voltage','frc_drive_current','frc_motor_position','frc_profile_position','frc_profile_velocity','frc_motor_neutral','frc_motor_resume','frc_encoder_zero','frc_servo','frc_solenoid','frc_compressor','frc_relay','frc_led','frc_led_pixel']],
 ['Math','#ec4899',['math_number','math_arithmetic','math_single','math_modulo','math_constrain','frc_trig','frc_pid','frc_feedforward']],
 ['Logic and loops','#3b82f6',['frc_if','frc_if_else','frc_compare','frc_bool','frc_not','logic_boolean','frc_finite','frc_for_index']],
 ['Variables and time','#f59e0b',['frc_initvar','frc_setvar','frc_getvar','frc_time','frc_robot_mode']],
 ['Controller and drive','#84cc16',['frc_controller_axis','frc_operator_axis','frc_drive','frc_drive_field','frc_drive_speed','frc_swerve_stream','frc_zero_gyro','frc_pose_reset','frc_rumble']],
 ['Sensors and cameras','#0d9488',['frc_motor_value','frc_enc_pos','frc_enc_vel','frc_limitswitch','frc_device_value','frc_device_active','frc_gyro_angle','frc_pose_value','frc_vision_target','frc_vision_value','frc_tag_present','frc_tag_value','frc_tags_present','frc_tags_yaw','frc_vision_pipeline','frc_vision_led','frc_vision_driver']],
 ['Methods and autonomous','#a855f7',['frc_call','frc_schedule']],
 ['Display and communication','#5eead4',['frc_telemetry','frc_nt_number','frc_nt_boolean','frc_nt_write','frc_nt_bool_write','frc_dashboard_notice','frc_dashboard_tab']]
].map(([name,colour,types])=>({kind:'category',name,colour,contents:types.map(type=>{const input={frc_drive_motor:['SPEED',.2],frc_drive_velocity:['VEL',1],frc_drive_current:['CUR',5],frc_setvar:['VAL',0],frc_telemetry:['VALUE',0]}[type];return {kind:'block',type,...(input?{inputs:{[input[0]]:{shadow:{type:'math_number',fields:{NUM:input[1]}}}}}:{})};})}))});
// Generic motor configuration remains part of the motor form.
const simpleMotorEdit=editComponent;
editComponent=function(type,index=-1){simpleMotorEdit(type,index);if(type!=='motor'||!$('modal-body'))return;const ss=P.subsystems[activeSS],c=ss.components[index]||{};
 $('modal-body').insertAdjacentHTML('beforeend','<details><summary>SPARK output and follower settings</summary>'+select('motor-leader','Leader SPARK motor',[['Independent motor',''],...ss.components.filter(m=>m.type==='motor'&&m!==c&&['max','flex'].includes(FRC.motorFamily(m.motorType))).map(m=>[m.name,m.name])],c.followLeader||'')+checkbox('motor-follow-inverted','Invert follower direction',c.followInverted||false)+field('motor-secondary','Secondary current limit (A)',c.secondaryCurrent??60,'number')+field('motor-voltage','Voltage compensation (V)',c.voltageCompensation??12,'number')+field('motor-min','Closed-loop minimum output',c.outputMin??-1,'number','step="any"')+field('motor-max','Closed-loop maximum output',c.outputMax??1,'number','step="any"')+checkbox('motor-persist','Persist settings to controller memory',c.persistConfiguration||false)+'</details>');
 const save=$('modal-save').onclick;$('modal-save').onclick=()=>{const values={followLeader:$('motor-leader').value,followInverted:$('motor-follow-inverted').checked,secondaryCurrent:number('motor-secondary'),voltageCompensation:number('motor-voltage'),outputMin:number('motor-min'),outputMax:number('motor-max'),persistConfiguration:$('motor-persist').checked};save();if(!$('modal-save')){Object.assign(index<0?ss.components.at(-1):ss.components[index],values);commit(false);}};
};
const simpleRename=renameReferences;
renameReferences=function(a,b){simpleRename(a,b);const [ss,n]=a.split('.'),[ns,nn]=b.split('.');if(ss===ns&&n)for(const owner of P.subsystems.filter(s=>s.name===ss))for(const c of owner.components)if(c.followLeader===n)c.followLeader=nn;};
const simpleRenderAuto=renderAuto;
renderAuto=function(){simpleRenderAuto();const i=P.integrations;if(!P.autonomous.length&&i.autonomousMode!=='blocks'&&i.selectedAuto){const empty=$('auto-list').querySelector('.empty');if(empty)empty.textContent='Startup autonomous: '+(i.autonomousMode==='pathplanner'?'PathPlanner':'Choreo')+' → '+i.selectedAuto+' · You can change this on the Tools tab.';}};
