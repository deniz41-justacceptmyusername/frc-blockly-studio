'use strict';
FRC.dropdown = (block, kind) => {
  const ws=block.workspace,p=ws.frcProject||P,owner=ws.frcOwner??P.subsystems[activeSS]?.name;
  let options=[];
  for(const ss of p.subsystems.filter(s=>s.name===owner)) {
    const source=kind==='METHOD'?ss.methods:ss.components.filter(c=>c.type===({MOTOR:'motor',ENCODER:'encoder',SWITCH:'limitswitch'}[kind]));
    for(const item of source)options.push([item.name,ss.name+'.'+item.name]);
  }
  for(const value of ws.frcExtras?.[kind]||[])if(!options.some(o=>o[1]===value))options.push(['⚠ '+value,value]);
  return options.length?options:[['Add a component first','']];
};
FRC.xmlExtras = xml => {
  const extras={};
  for(const f of xml.getElementsByTagName('field'))if(['MOTOR','ENCODER','SWITCH','METHOD','DEVICE','CAMERA','GLOBALMETHOD'].includes(f.getAttribute('name'))){const k=f.getAttribute('name');(extras[k]??=new Set()).add(f.textContent);}
  return extras;
};
FRC.installBlocks = () => {
  for(const kind of ['MOTOR','ENCODER','SWITCH','METHOD'])Blockly.Extensions.register('frc_'+kind.toLowerCase()+'_menu',function(){this.getField(kind).menuGenerator_=()=>FRC.dropdown(this,kind);});
  const menu=(name)=>({type:'field_dropdown',name,options:[['Select component','']]}),num=(name)=>({type:'input_value',name,check:'Number'}),bool=(name)=>({type:'input_value',name,check:'Boolean'});
  const statement=(type,message0,args0,colour,extensions=[])=>({type,message0,args0,previousStatement:null,nextStatement:null,colour,extensions});
  FRC.installExtraBlocks?.();
  Blockly.defineBlocksWithJsonArray([
    {type:'frc_method_start',message0:'when %1 . %2 is called',args0:[{type:'field_label',name:'SSN',text:'Subsystem'},{type:'field_label',name:'MN',text:'method'}],nextStatement:null,colour:120,hat:'cap'},
    statement('frc_drive_motor','%1 motor power %2',[menu('MOTOR'),num('SPEED')],230,['frc_motor_menu']),
    statement('frc_drive_velocity','%1 target velocity %2 RPS',[menu('MOTOR'),num('VEL')],230,['frc_motor_menu']),
    statement('frc_drive_current','%1 target current %2 A',[menu('MOTOR'),num('CUR')],230,['frc_motor_menu']),
    statement('frc_stop_motor','stop %1 motor',[menu('MOTOR')],230,['frc_motor_menu']),
    ...[['frc_enc_pos','%1 position (rotations)'],['frc_enc_vel','%1 velocity (RPM)']].map(([type,message0])=>({type,message0,args0:[menu('ENCODER')],output:'Number',colour:180,extensions:['frc_encoder_menu']})),
    {type:'frc_limitswitch',message0:'is %1 pressed?',args0:[menu('SWITCH')],output:'Boolean',colour:120,extensions:['frc_switch_menu']},
    {type:'frc_gyro_angle',message0:'Gyro angle (degrees)',output:'Number',colour:290},
    statement('frc_zero_gyro','Zero gyro',[],290),
    {type:'frc_if',message0:'If %1',args0:[bool('COND')],message1:'do %1',args1:[{type:'input_statement',name:'DO'}],previousStatement:null,nextStatement:null,colour:210},
    {type:'frc_if_else',message0:'If %1',args0:[bool('COND')],message1:'do %1',args1:[{type:'input_statement',name:'DO'}],message2:'else %1',args2:[{type:'input_statement',name:'ELSE'}],previousStatement:null,nextStatement:null,colour:210},
    {type:'frc_compare',message0:'%1 %2 %3',args0:[num('A'),{type:'field_dropdown',name:'OP',options:[['>','GT'],['<','LT'],['≥','GTE'],['≤','LTE'],['=','EQ'],['≠','NEQ']]},num('B')],output:'Boolean',colour:210},
    {type:'frc_bool',message0:'%1 %2 %3',args0:[bool('A'),{type:'field_dropdown',name:'OP',options:[['AND','AND'],['OR','OR']]},bool('B')],output:'Boolean',colour:210},
    {type:'frc_not',message0:'NOT %1',args0:[bool('V')],output:'Boolean',colour:210},
    statement('frc_setvar','set %1 variable to %2',[{type:'field_input',name:'VAR',text:'target'},num('VAL')],330),
    {type:'frc_getvar',message0:'%1',args0:[{type:'field_input',name:'VAR',text:'target'}],output:'Number',colour:330},
    {type:'frc_controller_axis',message0:'Controller %1',args0:[{type:'field_dropdown',name:'AXIS',options:[['left X','LeftX'],['left Y','LeftY'],['right X','RightX'],['right Y','RightY'],['left trigger','LeftTriggerAxis'],['right trigger','RightTriggerAxis']]}],output:'Number',colour:65},
    statement('frc_call','call %1 method',[menu('METHOD')],120,['frc_method_menu']),
    statement('frc_telemetry','Dashboard %1 = %2',[{type:'field_input',name:'KEY',text:'value'},num('VALUE')],45),
    statement('frc_drive','Drive forward %1 left %2 rotation %3',[num('X'),num('Y'),num('ROT')],65)
  ]);
};
FRC.toolbox = () => ({kind:'categoryToolbox',contents:[
  ['Motor','#e94560',['frc_drive_motor','frc_drive_velocity','frc_drive_current','frc_stop_motor']],
  ['Sensor','#0d9488',['frc_enc_pos','frc_enc_vel','frc_limitswitch','frc_gyro_angle','frc_zero_gyro']],
  ['Logic','#3b82f6',['frc_if','frc_if_else','frc_compare','frc_bool','frc_not','logic_boolean']],
  ['Numbers / operations','#ec4899',['math_number','math_arithmetic','math_single','math_modulo','math_constrain']],
  ['Variable','#f59e0b',['frc_setvar','frc_getvar']],
  ['Controller / drive','#84cc16',['frc_controller_axis','frc_drive']],
  ['Methods / telemetry','#a855f7',['frc_call','frc_telemetry']]
,...(FRC.extraToolbox?.()||[])].map(([name,colour,types])=>({kind:'category',name,colour,contents:types.map(type=>{
  const item={kind:'block',type},input={frc_drive_motor:['SPEED',0.2],frc_drive_velocity:['VEL',1],frc_drive_current:['CUR',5],frc_setvar:['VAL',0],frc_telemetry:['VALUE',0]}[type];
  if(input)item.inputs={[input[0]]:{shadow:{type:'math_number',fields:{NUM:input[1]}}}};
  return item;
})}))});
FRC.compileMethod = (p,ss,m) => {
  const result={code:'',variables:new Set(),reads:new Set(),calls:new Set(),actuates:false,errors:[],warnings:[]};
  if(!m.blocks){result.warnings.push(ss.name+'.'+m.name+': method is empty.');return result;}
  const ws=new Blockly.Workspace();ws.frcProject=p;ws.frcOwner=ss.name;
  const fail=(block,msg)=>{throw Error(msg+' [block '+block.type+' / '+block.id+']');};
  let depth=0;
  const nameOf=b=>{const n=b.getFieldValue('VAR');if(!FRC.identifier(n))fail(b,'Invalid variable name: '+n);return n;};
  function component(b,field,type){
    const path=b.getFieldValue(field),prefix=ss.name+'.';
    if(!path?.startsWith(prefix))fail(b,'This method only allows components from '+ss.name+': '+path);
    const c=ss.components.find(c=>c.name===path.slice(prefix.length)&&c.type===type);
    if(!c)fail(b,'Component deleted or not found: '+path);return c;
  }
  function input(b,key,type){const target=b.getInputTargetBlock(key);if(!target)fail(b,key+' input requires a connected block.');const e=expression(target);if(e.type!==type)fail(b,key+' input '+type+' is required.');return e.code;}
  function expression(b){
    if(!b.isEnabled())fail(b,'Enable or replace the disabled value block.');
    if(++depth>128)fail(b,'Block nesting limit exceeded.');
    try{
      let code,type='Number';
      switch(b.type){
        case 'math_number': {const n=Number(b.getFieldValue('NUM'));if(!Number.isFinite(n))fail(b,'Number must be finite.');code=FRC.javaNumber(n);break;}
        case 'logic_boolean':code=b.getFieldValue('BOOL')==='TRUE'?'true':'false';type='Boolean';break;
        case 'frc_enc_pos':case 'frc_enc_vel':{const c=component(b,'ENCODER','encoder');if(b.type==='frc_enc_vel'&&['throughbore_dio','hexbore_dio'].includes(c.encType))result.warnings.push(ss.name+'.'+m.name+': DIO absolute encoder RPM is calculated from differences between samples; with a 20 ms loop, velocities above 1500 RPM cannot be measured because of aliasing.');code='frc_'+c.name+(b.type==='frc_enc_pos'?'Position()':'RPM()');break;}
        case 'frc_limitswitch':{const c=component(b,'SWITCH','limitswitch');code=(c.normallyOpen?'!':'')+c.name+'.get()';type='Boolean';break;}
        case 'frc_gyro_angle':if(p.swerveConfig.gyro.type==='none')fail(b,'Select a gyro to use the gyro block.');code='RobotIO.headingDegrees()';break;
        case 'frc_getvar':{const n=nameOf(b);result.reads.add(n);code='frc_var_'+n;break;}
        case 'frc_controller_axis':{const axis=b.getFieldValue('AXIS');if(!['LeftX','LeftY','RightX','RightY','LeftTriggerAxis','RightTriggerAxis'].includes(axis))fail(b,'Invalid controller axis.');code='RobotIO.driver.get'+axis+'()';break;}
        case 'frc_compare':case 'logic_compare':{const ops={GT:'>',LT:'<',GTE:'>=',LTE:'<=',EQ:'==',NEQ:'!='},op=ops[b.getFieldValue('OP')];if(!op)fail(b,'Invalid comparison.');code='('+input(b,'A','Number')+' '+op+' '+input(b,'B','Number')+')';type='Boolean';break;}
        case 'frc_bool':case 'logic_operation':code='('+input(b,'A','Boolean')+(b.getFieldValue('OP')==='AND'?' && ':' || ')+input(b,'B','Boolean')+')';type='Boolean';break;
        case 'frc_not':code='(!'+input(b,'V','Boolean')+')';type='Boolean';break;
        case 'logic_negate':code='(!'+input(b,'BOOL','Boolean')+')';type='Boolean';break;
        case 'math_arithmetic':{const a=input(b,'A','Number'),c=input(b,'B','Number'),op=b.getFieldValue('OP'),ops={ADD:'+',MINUS:'-',MULTIPLY:'*',DIVIDE:'/'};code=op==='POWER'?'Math.pow('+a+', '+c+')':ops[op]?'('+a+' '+ops[op]+' '+c+')':fail(b,'Invalid operation.');break;}
        case 'math_single':{const v=input(b,'NUM','Number'),op=b.getFieldValue('OP'),fn={ROOT:'sqrt',ABS:'abs',LN:'log',LOG10:'log10',EXP:'exp'}[op];code=fn?'Math.'+fn+'('+v+')':op==='NEG'?'(-'+v+')':op==='POW10'?'Math.pow(10.0, '+v+')':fail(b,'Unsupported math operation.');break;}
        case 'math_modulo':code='('+input(b,'DIVIDEND','Number')+' % '+input(b,'DIVISOR','Number')+')';break;
        case 'math_constrain':code='Math.max('+input(b,'LOW','Number')+', Math.min('+input(b,'HIGH','Number')+', '+input(b,'VALUE','Number')+'))';break;
        default:{const emitted=FRC.extensionExpression?.(b,{p,ss,m,component,input,fail,result});if(!emitted)fail(b,'Unsupported value block.');code=emitted.code;type=emitted.type;break;}
      }
      return {code,type};
    }finally{depth--;}
  }
  const indent=n=>'    '.repeat(n);
  function chain(first,level=2){let code='';for(let b=first;b;b=b.getNextBlock()){
    if(!b.isEnabled())continue;
    if(['frc_drive_motor','frc_stop_motor','frc_drive_velocity','frc_drive_current','frc_drive','frc_zero_gyro'].includes(b.type))result.actuates=true;
    const pad=indent(level);let line;
    switch(b.type){
      case 'frc_drive_motor':{const c=component(b,'MOTOR','motor');line='frc_set_'+c.name+'('+input(b,'SPEED','Number')+');';break;}
      case 'frc_stop_motor':{const c=component(b,'MOTOR','motor');line='frc_stop_'+c.name+'();';break;}
      case 'frc_drive_velocity':case 'frc_drive_current':{
        const c=component(b,'MOTOR','motor'),fam=FRC.motorFamily(c.motorType),velocity=b.type==='frc_drive_velocity';
        if(!['fx','max','flex'].includes(fam))fail(b,'Velocity / current control requires a TalonFX or SPARK CAN controller.');
        if(!c.closedLoopConfigured)fail(b,c.name+': edit and confirm the closed-loop PID settings.');
        if(velocity&&!FRC.isBrushless(c))fail(b,'A feedback adapter must be configured for brushed motor velocity control.');
        if(!velocity&&fam==='fx'&&!c.focLicensed)fail(b,'TalonFX TorqueCurrentFOC requires confirmation of a Phoenix Pro license.');
        line='frc_'+(velocity?'velocity_':'current_')+c.name+'('+input(b,velocity?'VEL':'CUR','Number')+');';break;
      }
      case 'frc_zero_gyro':if(p.swerveConfig.gyro.type==='none')fail(b,'Select a gyro to use the gyro block.');line='RobotServices.zeroGyro();';break;
      case 'frc_setvar':{const n=nameOf(b);result.variables.add(n);line='frc_var_'+n+' = '+input(b,'VAL','Number')+';';break;}
      case 'frc_if':case 'frc_if_else':{
        code+=pad+'if ('+input(b,'COND','Boolean')+') {\n'+chain(b.getInputTargetBlock('DO'),level+1)+pad+'}';
        if(b.type==='frc_if_else')code+=' else {\n'+chain(b.getInputTargetBlock('ELSE'),level+1)+pad+'}';code+='\n';continue;
      }
      case 'frc_call':{const path=b.getFieldValue('METHOD'),method=ss.methods.find(x=>ss.name+'.'+x.name===path);if(!method)fail(b,'Select a valid method in the same subsystem.');result.calls.add(method.name);line='this.'+method.name+'();';break;}
      case 'frc_telemetry':line='SmartDashboard.putNumber('+FRC.s(ss.name+'/'+b.getFieldValue('KEY'))+', '+input(b,'VALUE','Number')+');';break;
      case 'frc_drive':if(FRC.driveOwner(p)?.name!==ss.name)fail(b,'This block may be used in drive subsystem methods.');line='drive('+input(b,'X','Number')+', '+input(b,'Y','Number')+', '+input(b,'ROT','Number')+', false);';break;
      default:{const emitted=FRC.extensionStatement?.(b,{p,ss,m,component,input,fail,result,chain,level});if(emitted==null)fail(b,'Unsupported command block.');line=emitted;break;}
    }
    code+=pad+line+'\n';
  }return code;}
  try{
    const xml=Blockly.utils.xml.textToDom(m.blocks);
    const rawBlocks=[...xml.getElementsByTagName('*')].filter(n=>['block','shadow'].includes(n.tagName.toLowerCase()));
    if(rawBlocks.length>2000)throw Error('A method may contain up to 2000 blocks.');
    for(const n of rawBlocks){
      const type=n.getAttribute('type');if(!Blockly.Blocks[type])throw Error('Unknown block type: '+type);
      const allowed={frc_compare:['GT','LT','GTE','LTE','EQ','NEQ'],logic_compare:['GT','LT','GTE','LTE','EQ','NEQ'],frc_bool:['AND','OR'],logic_operation:['AND','OR'],math_arithmetic:['ADD','MINUS','MULTIPLY','DIVIDE','POWER'],math_single:['ROOT','ABS','NEG','LN','LOG10','EXP','POW10']}[type];
      for(const field of [...n.children].filter(x=>x.tagName.toLowerCase()==='field')){
        const name=field.getAttribute('name'),value=field.textContent;
        const choices=FRC.extraFieldEnums?.[type]?.[name];if(choices&&!choices.includes(value))throw Error(type+': invalid '+name+' field '+value);
        if((type==='frc_initvar'&&name==='INITIAL'||type.startsWith('frc_tag')&&name==='TAG')&&(value.trim()===''||!Number.isFinite(Number(value))||name==='TAG'&&(!Number.isInteger(Number(value))||Number(value)<0||Number(value)>65535)))throw Error(type+': invalid '+name+' count');
        if(['frc_pid','frc_feedforward'].includes(type)&&['KP','KI','KD','KS','KG','KV'].includes(name)&&(value.trim()===''||!Number.isFinite(Number(value))||Number(value)<0||type==='frc_pid'&&Number(value)>10000))throw Error(type+': invalid coefficient '+name);
        if(name==='OP'&&allowed&&!allowed.includes(value))throw Error(type+': invalid operation field '+value);
        if(name==='AXIS'&&!['LeftX','LeftY','RightX','RightY','LeftTriggerAxis','RightTriggerAxis'].includes(value))throw Error('Invalid controller axis: '+value);
        if(name==='BOOL'&&!['TRUE','FALSE'].includes(value))throw Error('Invalid boolean field: '+value);
        if(type==='math_number'&&name==='NUM'&&(value.trim()===''||!Number.isFinite(Number(value))))throw Error('Invalid numeric field: '+value);
      }
    }
    ws.frcExtras=FRC.xmlExtras(xml);Blockly.Xml.domToWorkspace(xml,ws);
    if(ws.getAllBlocks(false).length>2000)throw Error('A method may contain up to 2000 blocks.');
    const tops=ws.getTopBlocks(true).filter(b=>b.isEnabled()),hats=tops.filter(b=>b.type==='frc_method_start');
    if(hats.length!==1||tops.length!==1)throw Error('Connect commands to a single method start block; do not leave disconnected blocks.');
    result.code=chain(hats[0].getNextBlock());
  }catch(e){result.errors.push(ss.name+'.'+m.name+': '+e.message);}
  finally{ws.dispose();}
  return result;
};
FRC.compileAll = p => {
  const result=FRC.validate(p),compiled=new Map();
  for(const ss of p.subsystems){
    const vars=new Set(),reads=new Set(),methods=new Map();
    for(const m of ss.methods){const r=FRC.compileMethod(p,ss,m);methods.set(m.name,r);r.variables.forEach(v=>vars.add(v));r.reads.forEach(v=>reads.add(v));result.errors.push(...r.errors);result.warnings.push(...r.warnings);}
    for(const v of reads)if(!vars.has(v))result.errors.push(ss.name+': '+v+' variable is read but is not defined in any method.');
    const controllers=new Map();for(const method of methods.values())for(const [name,gains]of method.controllers||[]){if(controllers.has(name)&&JSON.stringify(controllers.get(name))!==JSON.stringify(gains))result.errors.push(ss.name+': PID '+name+' uses different coefficients.');controllers.set(name,gains);}
    const visiting=new Set(),done=new Set();
    function visit(name){if(visiting.has(name)){result.errors.push(ss.name+'.'+name+': recursive method calls are blocked.');return;}if(done.has(name))return;visiting.add(name);for(const target of methods.get(name)?.calls||[])visit(target);visiting.delete(name);done.add(name);}
    for(const name of methods.keys())visit(name);
    const actuates=(name,seen=new Set())=>{if(seen.has(name))return false;seen.add(name);const m=methods.get(name);return !!m&&(m.actuates||[...m.calls].some(n=>actuates(n,seen)));};
    for(const m of ss.methods)if(['periodic','always'].includes(m.role)&&actuates(m.name))result.errors.push(ss.name+'.'+m.name+': periodic method contains a motor / gyro command; use a default teleop or called method.');
    compiled.set(ss.name,{vars,methods});
  }
  result.compiled=compiled;return result;
};
