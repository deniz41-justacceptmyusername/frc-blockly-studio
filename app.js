'use strict';
let P,activeSS=-1,activeMeth=-1,workspace=null,selMod='frontleft',loadingBlocks=false,checkTimer,saveTimer,lastCheck;
const $=id=>document.getElementById(id),H=value=>FRC.html(value);
const STORAGE='frc-blockly-project-v2',BACKUP=STORAGE+'-backup';
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function options(list,value){return list.map(([label,key])=>'<option value="'+H(key)+'"'+(key===value?' selected':'')+'>'+H(label)+'</option>').join('');}
function field(id,label,value,type='text',extra=''){return '<label for="'+id+'">'+H(label)+'</label><input id="'+id+'" type="'+type+'" value="'+H(value)+'" '+extra+'>';}
function select(id,label,list,value){return '<label for="'+id+'">'+H(label)+'</label><select id="'+id+'">'+options(list,value)+'</select>';}
function checkbox(id,label,value){return '<label class="check-label"><input id="'+id+'" type="checkbox"'+(value?' checked':'')+'>'+H(label)+'</label>';}
const number=id=>$(id).value.trim()===''?NaN:Number($(id).value);
function showModal(title,body,onSave,{wide=false,saveLabel='Save'}={}){
  const c=$('modal-container');c.innerHTML='<div class="modal-overlay"><div class="modal'+(wide?' wide':'')+'" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">'+H(title)+'</h3><div id="modal-body">'+body+'</div><div id="modal-error" role="alert"></div><div class="modal-actions"><button id="modal-cancel">Kapat</button>'+(onSave?'<button class="primary" id="modal-save">'+H(saveLabel)+'</button>':'')+'</div></div></div>';
  $('modal-cancel').onclick=closeModal;
  c.firstChild.onclick=e=>{if(e.target===c.firstChild)closeModal();};
  if(onSave)$('modal-save').onclick=()=>{try{saveBlocks();if(onSave()!==false){closeModal();commit(false);}}catch(e){$('modal-error').textContent=e.message;}};
  c.querySelector('input,select,button')?.focus();
}
function closeModal(){$('modal-container').innerHTML='';}
function validName(name){if(!FRC.identifier(name)||FRC.reserved.has(name)||/^frc_/.test(name))throw Error('Enter a name that starts with a letter, contains no spaces and is not reserved (e.g. IntakeSubsystem, intakeMotor).');}
function renameReferences(oldPath,newPath){
  for(const ss of P.subsystems)for(const m of ss.methods)if(m.blocks){const xml=Blockly.utils.xml.textToDom(m.blocks);for(const f of xml.getElementsByTagName('field'))if(['MOTOR','ENCODER','SWITCH','METHOD','DEVICE','GLOBALMETHOD'].includes(f.getAttribute('name'))&&(f.textContent===oldPath||f.textContent.startsWith(oldPath+'.')))f.textContent=newPath+f.textContent.slice(oldPath.length);m.blocks=Blockly.Xml.domToText(xml);}
  for(const b of P.controllerBindings)for(const k of ['methodPath','stopMethod'])if(b[k]&&(b[k]===oldPath||b[k].startsWith(oldPath+'.')))b[k]=newPath+b[k].slice(oldPath.length);
  for(const a of P.autonomous)if(a.methodPath&&(a.methodPath===oldPath||a.methodPath.startsWith(oldPath+'.')))a.methodPath=newPath+a.methodPath.slice(oldPath.length);
  for(const [k,list] of Object.entries(P.drive.motors))P.drive.motors[k]=list.map(v=>(v===oldPath||v.startsWith(oldPath+'.'))?newPath+v.slice(oldPath.length):v);
  if(P.drive.subsystem===oldPath)P.drive.subsystem=newPath;
}
function commit(flush=true){
  if(flush)saveBlocks();
  clearTimeout(checkTimer);checkTimer=setTimeout(()=>checkProject(false),350);
  clearTimeout(saveTimer);$('save-state').textContent='Saving…';
  saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(P));$('save-state').textContent='Autosaved in this browser';}catch(e){$('save-state').textContent='No autosave — save JSON';}},400);
}
function saveBlocks(){if(!workspace||loadingBlocks||activeSS<0||activeMeth<0)return;const method=P.subsystems[activeSS]?.methods[activeMeth];if(method)method.blocks=Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));}
function loadBlocks(xmlText){
  loadingBlocks=true;Blockly.Events.disable();
  try{
    workspace.clear();workspace.frcProject=P;workspace.frcOwner=P.subsystems[activeSS]?.name;
    const xml=xmlText?Blockly.utils.xml.textToDom(xmlText):null;workspace.frcExtras=xml?FRC.xmlExtras(xml):{};
    if(xml)Blockly.Xml.domToWorkspace(xml,workspace);
    else if(activeSS>=0&&activeMeth>=0){const b=workspace.newBlock('frc_method_start');b.initSvg();b.render();b.moveBy(45,45);}
    for(const b of workspace.getAllBlocks(false).filter(b=>b.type==='frc_method_start')){b.setFieldValue(P.subsystems[activeSS].name,'SSN');b.setFieldValue(P.subsystems[activeSS].methods[activeMeth].name,'MN');b.setDeletable(false);b.setMovable(false);}
    workspace.updateToolbox(FRC.toolbox());
  }catch(e){toast('Could not open blocks: '+e.message);$('workspace-state').textContent='Loading error; edit the method to preserve the saved data.';throw e;}
  finally{workspace.clearUndo();Blockly.Events.enable();loadingBlocks=false;}
}
function clearWorkspace(){loadingBlocks=true;try{workspace.clear();}finally{loadingBlocks=false;}renderWorkspaceState();}
function renderWorkspaceState(){const ss=P.subsystems[activeSS],m=ss?.methods[activeMeth];$('method-label').textContent=m?ss.name+'.'+m.name+'()':'Select a method';$('workspace-empty').hidden=!!m;$('method-options').hidden=!m;$('workspace-state').textContent=m?'Every change is autosaved':'';}
function selectSS(i){saveBlocks();activeSS=i;activeMeth=-1;clearWorkspace();renderSS();renderComponents();}
function selectMethod(i){
  saveBlocks();const candidate=P.subsystems[activeSS].methods[i];
  if(candidate.blocks){try{const result=FRC.compileMethod(P,P.subsystems[activeSS],candidate);if(result.errors.some(e=>e.includes('Unknown block type')))throw Error(result.errors.join('\n'));}catch(e){toast(e.message);return;}}
  activeMeth=i;try{loadBlocks(candidate.blocks);}catch(e){activeMeth=-1;clearWorkspace();return;}
  saveBlocks();renderMethods();renderWorkspaceState();commit(false);
}
function editSubsystem(index=-1){
  const existing=P.subsystems[index];showModal(existing?'Edit subsystem':'Add subsystem',field('ss-name','Java class name',existing?.name||'')+'<p class="hint">Example: IntakeSubsystem, ShooterSubsystem. Renaming updates block and button references.</p>',()=>{
    const name=$('ss-name').value.trim();validName(name);if(P.subsystems.some((s,i)=>i!==index&&s.name===name))throw Error('This subsystem name is already in use.');
    if(existing){const old=existing.name;renameReferences(old,name);existing.name=name;if(activeSS===index&&activeMeth>=0)loadBlocks(existing.methods[activeMeth].blocks);}
    else{P.subsystems.push({name,components:[],methods:[]});selectSS(P.subsystems.length-1);}
    renderSS();renderComponents();renderSettings();renderBindings();renderAuto();
  });
}
function deleteSS(i){if(!confirm(P.subsystems[i].name+' will be deleted. Continue? Its blocks and actions will be reported as errors by project validation.'))return;saveBlocks();P.subsystems.splice(i,1);activeSS=-1;activeMeth=-1;clearWorkspace();renderAll();commit(false);}
function renderSS(){
  $('subsystem-list').innerHTML=P.subsystems.map((s,i)=>'<div class="item'+(i===activeSS?' active':'')+'"><button class="name" data-ss="'+i+'">'+H(s.name)+'<small>'+s.components.length+' components · '+s.methods.length+' methods</small></button><button class="small" data-edit-ss="'+i+'" aria-label="Edit subsystem">✎</button><button class="danger" data-delete-ss="'+i+'" aria-label="Delete subsystem">×</button></div>').join('')||'<p class="empty">No subsystems yet.</p>';
  $('subsystem-list').querySelectorAll('[data-ss]').forEach(b=>b.onclick=()=>selectSS(Number(b.dataset.ss)));
  $('subsystem-list').querySelectorAll('[data-edit-ss]').forEach(b=>b.onclick=()=>editSubsystem(Number(b.dataset.editSs)));
  $('subsystem-list').querySelectorAll('[data-delete-ss]').forEach(b=>b.onclick=()=>deleteSS(Number(b.dataset.deleteSs)));
}
function editComponent(type,index=-1){
  if(activeSS<0){toast('Select a subsystem first.');return;}
  const ss=P.subsystems[activeSS],old=ss.components[index],c=old?FRC.clone(old):{type,name:'',...(type==='motor'?FRC.motorDefaults():{encType:'builtin',parentMotor:'',canId:20,canbus:'rio',dioChannel:0,normallyOpen:true,inverted:false})};
  let body=field('c-name','Component name',c.name);
  if(type==='motor')body+=select('c-motor','Motor / controller',FRC.motorTypes,c.motorType)+'<div class="row">'+field('c-id','CAN ID',c.canId,'number','min="0" max="62"')+field('c-bus','CAN bus',c.canbus)+'</div>'+field('c-pwm','PWM channel',c.pwmChannel,'number','min="0" max="19"')+checkbox('c-invert','Invert motor direction',c.inverted)+checkbox('c-brake','Fren modu (CAN)',c.brake)+checkbox('c-current-enabled','Enable TalonFX current limits',c.currentLimitEnabled!==false)+field('c-limit','Current limit (A, CAN)',c.currentLimit,'number')+'<h2>Closed loop</h2><p class="hint">Target velocity is in RPS. TalonFX kV: V/RPS; SPARK kV: V/RPM. Tune the coefficients for your mechanism.</p><div class="row">'+['p','i','d','ff'].map(k=>field('c-'+k,k==='ff'?'kV':k.toUpperCase(),c[k],'number','step="any"')).join('')+'</div>'+checkbox('c-tuned','I have configured PID / kV values for this mechanism',c.closedLoopConfigured)+checkbox('c-pro','I have a Phoenix Pro license for TalonFX current control',c.focLicensed);
  if(type==='encoder')body+=select('c-encoder','Encoder type',FRC.encoderTypes,c.encType)+select('c-parent','Motor for internal / attached encoder',[['Select',''],...ss.components.filter(x=>x.type==='motor').map(x=>[x.name,x.name])],c.parentMotor)+'<div class="row">'+field('c-id','CAN ID',c.canId,'number')+field('c-bus','CAN bus',c.canbus)+'</div>'+field('c-dio','DIO channel (duty cycle)',c.dioChannel,'number')+checkbox('c-invert','Invert encoder sign',c.inverted);
  if(type==='limitswitch')body+=field('c-dio','DIO channel',c.dioChannel,'number')+checkbox('c-no','Normally open (DIO low when pressed)',c.normallyOpen)+'<p class="hint">With NC selected, pressed is true when DIO is high. Check the circuit wiring.</p>';
  if(type==='motor')body+=field('c-max-rps','Closed-loop maximum motor velocity (RPS)',c.maxRps,'number','min="0.1" max="1000" step="any"');
  if(type==='motor')body+=FRC.physicsForm?.(c)||'';
  if(type==='motor')body+=FRC.motionForm?.(c)||'';
  if(type==='encoder')body+='<h2>Quadrature encoder</h2><div class="row">'+field('c-channel-a','DIO A',c.channelA??0,'number')+field('c-channel-b','DIO B',c.channelB??1,'number')+'</div>'+field('c-cpr','Pulses per rotation (WPILib count)',c.countsPerRev??2048,'number');
  showModal(old?'Edit component':'Add component',body,()=>{
    const name=$('c-name').value.trim();validName(name);if(ss.components.some((v,i)=>i!==index&&v.name===name))throw Error('This name is already in use.');c.name=name;
    if(type==='motor'){c.motorType=$('c-motor').value;c.connection=FRC.motorFamily(c.motorType)==='pwm'?'PWM':'CAN';c.canId=number('c-id');c.canbus=$('c-bus').value.trim();c.pwmChannel=number('c-pwm');c.inverted=$('c-invert').checked;c.brake=$('c-brake').checked;c.currentLimitEnabled=$('c-current-enabled').checked;c.currentLimit=number('c-limit');for(const k of ['p','i','d','ff'])c[k]=number('c-'+k);c.closedLoopConfigured=$('c-tuned').checked;c.focLicensed=$('c-pro').checked;}
    if(type==='encoder'){c.encType=$('c-encoder').value;c.parentMotor=$('c-parent').value;c.canId=number('c-id');c.canbus=$('c-bus').value.trim();c.dioChannel=number('c-dio');c.inverted=$('c-invert').checked;}
    if(type==='limitswitch'){c.dioChannel=number('c-dio');c.normallyOpen=$('c-no').checked;}
    if(type==='motor')c.maxRps=number('c-max-rps');
    if(type==='motor'&&FRC.readPhysicsForm)c.simulation=FRC.readPhysicsForm();
    if(type==='motor'&&FRC.readMotionForm)c.motion=FRC.readMotionForm();
    if(type==='encoder'&&c.encType==='quadrature'){c.channelA=number('c-channel-a');c.channelB=number('c-channel-b');c.countsPerRev=number('c-cpr');}
    if(old){renameReferences(ss.name+'.'+old.name,ss.name+'.'+name);for(const v of ss.components)if(v.parentMotor===old.name)v.parentMotor=name;ss.components[index]=c;}
    else ss.components.push(c);
    if(activeMeth>=0)loadBlocks(ss.methods[activeMeth].blocks);
    renderComponents();renderSettings();
  });
  if(type==='motor'){
    const update=()=>{const pwm=FRC.motorFamily($('c-motor').value)==='pwm';for(const key of ['c-id','c-bus'])$(key).disabled=pwm;$('c-pwm').disabled=!pwm;};$('c-motor').onchange=update;update();
  }
}
function renderComponents(){
  const ss=P.subsystems[activeSS];$('components-area').hidden=!ss;if(!ss){$('component-list').innerHTML='';renderMethods();return;}
  $('comp-label').textContent=ss.name;
  $('component-list').innerHTML=ss.components.map((c,i)=>'<div class="item"><button class="name" data-comp="'+i+'">'+H(c.name)+'<small>'+H(c.type==='motor'?c.motorType+' · '+(c.connection==='PWM'?'PWM '+c.pwmChannel:c.canbus+' CAN '+c.canId):c.type==='encoder'?c.encType+' '+(c.parentMotor||''):('DIO '+c.dioChannel+' · '+(c.normallyOpen?'NO':'NC')))+'</small></button><button class="danger" data-del-comp="'+i+'" aria-label="Delete component">×</button></div>').join('')||'<p class="empty">Add a motor or sensor.</p>';
  $('component-list').querySelectorAll('[data-comp]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.comp);editComponent(ss.components[i].type,i);});
  $('component-list').querySelectorAll('[data-del-comp]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.delComp);if(!confirm(ss.components[i].name+' will be deleted. Continue?'))return;saveBlocks();ss.components.splice(i,1);if(activeMeth>=0)loadBlocks(ss.methods[activeMeth].blocks);renderComponents();renderSettings();commit(false);});
  renderMethods();
}
function editMethod(index=-1){
  if(activeSS<0){toast('Add / select a subsystem first.');return;}
  const ss=P.subsystems[activeSS],old=ss.methods[index];
  showModal(old?'Method settings':'Add method',field('m-name','Method name',old?.name||'')+select('m-role','Execution mode',[['Called by a button / autonomous / another method','manual'],['Default teleop (every 20 ms)','default'],['Enabled periodic (for monitoring)','periodic'],['Every loop (including disabled; LED / monitoring)','always']],old?.role||'manual')+'<p class="hint">The default method runs through the command scheduler. Use periodic methods for monitoring; they should not compete with motor commands.</p>',()=>{
    const name=$('m-name').value.trim();validName(name);if(ss.methods.some((m,i)=>i!==index&&m.name===name))throw Error('Method name is already in use.');
    if(old){renameReferences(ss.name+'.'+old.name,ss.name+'.'+name);old.name=name;old.role=$('m-role').value;if(activeMeth===index)loadBlocks(old.blocks);}
    else{ss.methods.push({name,role:$('m-role').value,blocks:null});selectMethod(ss.methods.length-1);}
    renderMethods();renderWorkspaceState();renderBindings();renderAuto();
  });
}
function renderMethods(){
  const ss=P.subsystems[activeSS];$('method-list').innerHTML=ss?ss.methods.map((m,i)=>'<div class="item'+(i===activeMeth?' active':'')+'"><button class="name" data-method="'+i+'">'+H(m.name)+'()<small>'+H({manual:'When called',default:'Default teleop',periodic:'Enabled periodic',always:'Every loop (LED / monitoring)'}[m.role])+'</small></button><button class="small" data-edit-method="'+i+'">✎</button><button class="danger" data-del-method="'+i+'" aria-label="Metodu sil">×</button></div>').join('')||'<p class="empty">Add a method to start programming with blocks.</p>':'';
  $('method-list').querySelectorAll('[data-method]').forEach(b=>b.onclick=()=>selectMethod(Number(b.dataset.method)));
  $('method-list').querySelectorAll('[data-edit-method]').forEach(b=>b.onclick=()=>editMethod(Number(b.dataset.editMethod)));
  $('method-list').querySelectorAll('[data-del-method]').forEach(b=>b.onclick=()=>{if(!confirm('Delete this method?'))return;saveBlocks();const i=Number(b.dataset.delMethod);ss.methods.splice(i,1);activeMeth=-1;clearWorkspace();renderMethods();renderBindings();renderAuto();commit(false);});
}
function methodOptions(){return P.subsystems.flatMap(s=>s.methods.map(m=>[s.name+'.'+m.name+'()',s.name+'.'+m.name]));}
function bindButton(button){
  const old=P.controllerBindings.find(b=>b.button===button)||{type:'method',trigger:'whileTrue',methodPath:'',stopMethod:''},mo=[['Select',''],...methodOptions()];
  showModal(button+' button binding',select('b-action','Action',[['Run method','method'],['Zero gyro','zeroGyro']],old.type)+select('b-method','Method',mo,old.methodPath)+select('b-trigger','Trigger',[['Continuously while held; stop motors on release','whileTrue'],['Once when pressed','onTrue'],['Once when released','onFalse']],old.trigger)+select('b-stop','Additional method on stop (optional)',[['None',''],...methodOptions()],old.stopMethod)+'<p class="hint">Motors also stop when a held command is canceled. A one-shot method output may remain active until another command stops it.</p>',()=>{
    const b={button,type:$('b-action').value};if(b.type==='method'){b.methodPath=$('b-method').value;b.trigger=$('b-trigger').value;b.stopMethod=$('b-stop').value;if(!b.methodPath)throw Error('Select a method.');}
    P.controllerBindings=P.controllerBindings.filter(v=>v.button!==button);P.controllerBindings.push(b);renderBindings();
  });
  const update=()=>{for(const id of ['b-method','b-trigger','b-stop'])$(id).disabled=$('b-action').value==='zeroGyro';};$('b-action').onchange=update;update();
}
function renderBindings(){
  $('ctrl-map').innerHTML=FRC.buttons.map(([id,label])=>'<button data-button="'+id+'" class="'+(P.controllerBindings.some(b=>b.button===id)?'bound':'')+'">'+label+'</button>').join('');
  $('ctrl-map').querySelectorAll('[data-button]').forEach(b=>b.onclick=()=>bindButton(b.dataset.button));
  $('bindings-list').innerHTML=P.controllerBindings.map((b,i)=>'<div class="item"><button class="name" data-bind="'+i+'">'+H(b.button)+'<small>'+H(b.type==='zeroGyro'?'Zero gyro':b.methodPath+' · '+b.trigger)+'</small></button><button class="danger" data-del-bind="'+i+'" aria-label="Delete button binding">×</button></div>').join('')||'<p class="empty">No buttons assigned yet.</p>';
  $('bindings-list').querySelectorAll('[data-bind]').forEach(b=>b.onclick=()=>bindButton(P.controllerBindings[Number(b.dataset.bind)].button));
  $('bindings-list').querySelectorAll('[data-del-bind]').forEach(b=>b.onclick=()=>{P.controllerBindings.splice(Number(b.dataset.delBind),1);renderBindings();commit();});
}
function editAuto(index=-1){
  const old=P.autonomous[index]||{type:'method',duration:1,methodPath:''};
  showModal('Autonomous step',select('a-type','Step',[['Run method','method'],['Wait','wait']],old.type)+select('a-method','Method',[['Select',''],...methodOptions()],old.methodPath)+field('a-duration','Duration (seconds)',old.duration,'number','min="0.02" max="15" step="0.02"'),()=>{
    const step={type:$('a-type').value,duration:number('a-duration')};if(step.type==='method'){step.methodPath=$('a-method').value;if(!step.methodPath)throw Error('Select a method.');}if(!Number.isFinite(step.duration)||step.duration<0.02||step.duration>15)throw Error('Duration must be 0.02–15 seconds.');if(index<0)P.autonomous.push(step);else P.autonomous[index]=step;renderAuto();
  });
  const update=()=>{$('a-method').disabled=$('a-type').value==='wait';};$('a-type').onchange=update;update();
}
function renderAuto(){
  $('auto-list').innerHTML=P.autonomous.map((a,i)=>'<div class="item"><button class="name" data-auto="'+i+'">'+(i+1)+'. '+H(a.type==='wait'?'Wait':a.methodPath)+'<small>'+H(a.duration)+' seconds</small></button><button class="small" data-up="'+i+'"'+(i===0?' disabled':'')+' aria-label="Move step up">↑</button><button class="danger" data-del-auto="'+i+'" aria-label="Delete step">×</button></div>').join('')||'<p class="empty">Autonomous is empty; the robot receives no autonomous drive commands.</p>';
  $('auto-list').querySelectorAll('[data-auto]').forEach(b=>b.onclick=()=>editAuto(Number(b.dataset.auto)));
  $('auto-list').querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.up);[P.autonomous[i-1],P.autonomous[i]]=[P.autonomous[i],P.autonomous[i-1]];renderAuto();commit();});
  $('auto-list').querySelectorAll('[data-del-auto]').forEach(b=>b.onclick=()=>{P.autonomous.splice(Number(b.dataset.delAuto),1);renderAuto();commit();});
}
function setPath(path,value){const keys=path.split('.');let obj=P;for(const key of keys.slice(0,-1))obj=obj[key];obj[keys.at(-1)]=value;commit();}
function configInput(path,label,value,type='number',step='any'){
  return '<label>'+H(label)+'</label><input data-path="'+H(path)+'" data-kind="'+type+'" type="'+(type==='number'?'number':'text')+'" step="'+step+'" value="'+H(value)+'">';
}
function configSelect(path,label,list,value){return '<label>'+H(label)+'</label><select data-path="'+H(path)+'">'+options(list,value)+'</select>';}
function configCheck(path,label,value){return '<label class="check-label"><input type="checkbox" data-path="'+H(path)+'"'+(value?' checked':'')+'>'+H(label)+'</label>';}
function wireConfig(root){root.querySelectorAll('[data-path]').forEach(el=>el.onchange=()=>{const value=el.type==='checkbox'?el.checked:el.dataset.kind==='number'?(el.value.trim()===''?NaN:Number(el.value)):el.value;setPath(el.dataset.path,value);if(root.id==='swerve-module-editor')drawSwerve();});}
function renderSettings(){
  let body=configInput('name','Project name',P.name,'text')+configInput('team','Team number',P.team,'number','1')+configInput('controllerPort','Controller USB port',P.controllerPort,'number','1')+configSelect('drive.type','Drive layout',[['Swerve','swerve'],['Differential / tank (arcade control)','differential'],['Mecanum','mecanum'],['No automatic drive; block methods','none']],P.drive.type)+configInput('drive.scale','Teleop drive power scale (0.01–1)',P.drive.scale)+configInput('swerveConfig.deadband','Controller deadband',P.swerveConfig.deadband);
  if(P.drive.type==='swerve')body+=configSelect('drive.subsystem','Swerve subsystem',[['Select',''],...P.subsystems.map(s=>[s.name,s.name])],P.drive.subsystem)+'<button id="create-swerve" class="small" style="margin-top:8px">Create SwerveSubsystem</button>'+configCheck('drive.fieldRelative','Teleop field-relative drive',P.drive.fieldRelative);
  if(['differential','mecanum'].includes(P.drive.type))for(const slot of P.drive.type==='differential'?['left','right']:FRC.moduleNames){const current=P.drive.motors[slot]||[];body+='<label>'+H(slot)+' motors (Ctrl for multiple selection)</label><select multiple size="4" data-drive-slot="'+slot+'">'+P.subsystems.flatMap(s=>s.components.filter(c=>c.type==='motor').map(c=>{const path=s.name+'.'+c.name;return '<option value="'+H(path)+'"'+(current.includes(path)?' selected':'')+'>'+H(path)+'</option>';})).join('')+'</select>';}
  body+='<h2>Robot project</h2><p class="hint">WPILib 2026 Java + YAGSL. Open the Tools tab for Vision, PathPlanner, Choreo, SysId, odometry and telemetry. Build the generated project with WPILib and run it in simulation.</p><button id="download-backup" class="small">Download previous autosave</button>';
  $('project-settings').innerHTML=body;wireConfig($('project-settings'));
  $('project-settings').querySelector('[data-path="drive.type"]').onchange=e=>{setPath('drive.type',e.target.value);renderSettings();};
  $('create-swerve')?.addEventListener('click',()=>{saveBlocks();if(!P.subsystems.some(s=>s.name==='SwerveSubsystem'))P.subsystems.push({name:'SwerveSubsystem',components:[],methods:[]});P.drive.subsystem='SwerveSubsystem';renderSS();renderSettings();commit(false);});
  $('project-settings').querySelectorAll('[data-drive-slot]').forEach(el=>el.onchange=()=>{P.drive.motors[el.dataset.driveSlot]=[...el.selectedOptions].map(o=>o.value);commit();});
  $('download-backup').onclick=()=>{const raw=localStorage.getItem(BACKUP);if(raw)download('frc_previous_project.json',new Blob([raw],{type:'application/json'}));else toast('No previous save yet.');};
}
function renderModule(){
  const sc=P.swerveConfig;
  $('module-tabs').innerHTML=[...FRC.moduleNames,'global'].map((k,i)=>'<button data-module="'+k+'" class="'+(selMod===k?'active':'')+'">'+['FL','FR','BL','BR','General'][i]+'</button>').join('');
  $('module-tabs').querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>{selMod=b.dataset.module;renderModule();drawSwerve();});
  let body='';
  if(selMod==='global'){
    body='<h2>Gyro / IMU</h2>'+configSelect('swerveConfig.gyro.type','Actual sensor model',FRC.gyros,sc.gyro.type)+'<div class="row">'+configInput('swerveConfig.gyro.id','CAN ID (CAN gyro)',sc.gyro.id,'number','1')+configInput('swerveConfig.gyro.canbus','CAN bus',sc.gyro.canbus,'text')+'</div>'+configCheck('swerveConfig.gyro.inverted','Invert gyro direction',sc.gyro.inverted)+'<p class="hint">ADIS16470: SPI CS0, Z yaw. ADIS16448: MXP SPI. Verify the sensor model and mounting axis.</p><h2>Physical values</h2>'+configInput('swerveConfig.maxSpeed','Maximum velocity (m/s)',sc.maxSpeed)+'<div class="row">';
    for(const [k,label] of [['wheelDiameter','Wheel diameter (inches)'],['driveGearRatio','Drive gear ratio'],['angleGearRatio','Angle gear ratio'],['driveCurrentLimit','Drive current limit (A)'],['angleCurrentLimit','Angle current limit (A)']])body+=configInput('swerveConfig.physical.'+k,label,sc.physical[k]);
    body+='</div><h2>Swerve PID</h2><p class="hint">YAGSL conversion units: drive m/s; angle degrees. These are separate from mechanism motor PID values.</p><div class="row">';
    for(const k of Object.keys(sc.pid))body+=configInput('swerveConfig.pid.'+k,k,sc.pid[k]);
    body+='</div><h2>Heading controller</h2><div class="row">';for(const k of ['angleDeadband','headingP','headingI','headingD'])body+=configInput('swerveConfig.controller.'+k,k,sc.controller[k]);body+='</div>';
  }else{
    const m=sc.modules[selMod],prefix='swerveConfig.modules.'+selMod;
    body='<h2>'+H(selMod)+'</h2><div class="row">'+configInput(prefix+'.location.front','Distance forward (inches)',m.location.front)+configInput(prefix+'.location.left','Distance left (inches)',m.location.left)+'</div>';
    for(const [kind,label] of [['drive','Drive motor'],['angle','Steering motor'],['encoder','Absolute encoder']]){
      const d=m[kind];body+='<h2>'+label+'</h2>'+configSelect(prefix+'.'+kind+'.type','Type',kind==='encoder'?FRC.swerveEncoders:FRC.swerveMotors,d.type)+'<div class="row">'+configInput(prefix+'.'+kind+'.id',kind==='encoder'?'CAN ID / DIO / analog kanal':'CAN ID',d.id,'number','1')+configInput(prefix+'.'+kind+'.canbus','CAN bus',d.canbus,'text')+'</div>'+configCheck(prefix+'.'+kind+'.inverted','Invert direction',d.inverted);
      if(kind==='encoder')body+=configInput(prefix+'.encoder.offset','Zero offset (degrees)',d.offset);
    }
    body+='<p class="hint">For an attached encoder, select a MAX / Flex port compatible with the angle controller. CAN and channel 0 are valid.</p>';
  }
  $('swerve-module-editor').innerHTML=body;wireConfig($('swerve-module-editor'));
}
function drawSwerve(){
  const cv=$('swerve-canvas'),ctx=cv.getContext('2d'),cx=140,cy=150;
  ctx.clearRect(0,0,280,280);ctx.fillStyle='#1d3049';ctx.fillRect(77,75,126,150);ctx.strokeStyle='#3b526e';ctx.strokeRect(77,75,126,150);
  ctx.fillStyle='#fb7185';ctx.font='bold 12px Segoe UI';ctx.textAlign='center';ctx.fillText('ROBOT FRONT ↑',cx,38);
  const coords=[[75,75],[205,75],[75,225],[205,225]];
  coords.forEach(([x,y],i)=>{const name=FRC.moduleNames[i],m=P.swerveConfig.modules[name];ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.fillStyle=name===selMod?'#d94565':'#284361';ctx.fill();ctx.fillStyle='white';ctx.font='bold 12px Segoe UI';ctx.fillText(['FL','FR','BL','BR'][i],x,y+4);ctx.font='9px Segoe UI';ctx.fillStyle='#b7c6d7';ctx.fillText(m.drive.id+' / '+m.angle.id+' / '+m.encoder.id,x,y+(i<2?-30:35));});
  ctx.fillStyle='#b7c6d7';ctx.font='10px Segoe UI';ctx.fillText('drive / angle / encoder',cx,155);
}
function checkProject(flush=true){
  if(flush)saveBlocks();
  try{lastCheck=FRC.compileAll(P);}catch(e){lastCheck={errors:['Invalid project structure: '+e.message],warnings:[]};}
  $('diagnostics').innerHTML=(lastCheck.errors.length?'<div class="diagnostic error"><strong>'+lastCheck.errors.length+' errors · export blocked</strong></div>':'<div class="diagnostic success">Block and configuration validation passed. Hardware calibration is still required.</div>')+lastCheck.errors.map(e=>'<div class="diagnostic error">'+H(e)+'</div>').join('')+lastCheck.warnings.map(w=>'<div class="diagnostic warning">'+H(w)+'</div>').join('');
  return lastCheck;
}
function previewCode(){
  saveBlocks();const check=checkProject(false);if(check.errors.length){toast('Fix the project validation errors first.');return;}
  try{const {files}=FRC.buildFiles(P),names=Object.keys(files).filter(n=>typeof files[n]==='string'&&(/\.java$|\.json$|\.gradle$/.test(n)));
    showModal('Generated robot code',select('preview-file','File',names.map(n=>[n,n]),names.find(n=>n.endsWith('RobotContainer.java')))+'<pre id="code-preview"></pre>',null,{wide:true});const update=()=>{$('code-preview').textContent=files[$('preview-file').value];};$('preview-file').onchange=update;update();
  }catch(e){toast(e.message);}
}
function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function saveProject(){saveBlocks();download(P.name+'_blocks.json',new Blob([JSON.stringify(P,null,2)],{type:'application/json'}));toast('Block project saved.');}
async function exportProject(){
  saveBlocks();const check=checkProject(false);if(check.errors.length){toast('For export, '+check.errors.length+' errors must be fixed.');return;}
  const btn=$('export');btn.disabled=true;btn.textContent='Paketleniyor…';
  try{const {files}=FRC.buildFiles(P),zip=new JSZip();for(const [name,content] of Object.entries(files)){const opts=typeof content==='object'?{base64:true}:{};opts.unixPermissions=name==='gradlew'?0o100755:0o100644;zip.file(P.name+'/'+name,typeof content==='object'?content.base64:content,opts);}download(P.name+'_2026.zip',await zip.generateAsync({type:'blob',compression:'DEFLATE',platform:'UNIX'}));toast('WPILib 2026 project is ready.');}
  catch(e){toast('Export failed: '+e.message);}
  finally{btn.disabled=false;btn.textContent='Export robot project';}
}
async function loadProject(event){
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>25*1024*1024)throw Error('Project file exceeds the 25 MB limit.');
    const {project,notes}=FRC.normalize(JSON.parse(await file.text()));FRC.compileAll(project);
    saveBlocks();try{localStorage.setItem(BACKUP,JSON.stringify(P));}catch{}
    P=project;activeSS=-1;activeMeth=-1;clearWorkspace();renderAll();commit(false);toast(notes.length?'Project loaded; check the migrated settings.':'Project loaded.');
    if(notes.length)showModal('Legacy project migrated',notes.map(n=>'<p>'+H(n)+'</p>').join(''),null);
  }catch(e){showModal('Could not load project','<p>'+H(e.message)+'</p><p>Your current project was preserved.</p>',null);}
  finally{event.target.value='';}
}
function renderAll(){renderSS();renderComponents();renderBindings();renderAuto();renderSettings();renderModule();drawSwerve();renderWorkspaceState();checkProject(false);}
function loadExample(){
  if(!confirm('Preserve the current project as the previous autosave and open the example Ashina project?'))return;
  saveBlocks();try{localStorage.setItem(BACKUP,JSON.stringify(P));}catch{}
  P=FRC.example();activeSS=-1;activeMeth=-1;clearWorkspace();renderAll();selectSS(0);if(P.subsystems[0].methods.length)selectMethod(0);commit(false);
}
function init(){
  if(!window.Blockly||!window.JSZip||!window.FRC?.assets){document.body.innerHTML='<div class="fatal"><h1>Application files could not be loaded.</h1><p>Extract the entire ZIP into a folder; index.html, vendor and the other files must remain together.</p></div>';return;}
  P=FRC.defaultProject();P.subsystems.push({name:'SwerveSubsystem',components:[],methods:[]});FRC.installBlocks();
  try{const raw=localStorage.getItem(STORAGE);if(raw){const recovered=FRC.normalize(JSON.parse(raw)).project;FRC.compileAll(recovered);P=recovered;}}catch(e){try{const raw=localStorage.getItem(STORAGE);if(raw)localStorage.setItem(BACKUP,raw);}catch{}toast('Could not read autosave; the previous save was backed up. You can open your JSON backup.');}
  workspace=Blockly.inject('blocklyDiv',{toolbox:FRC.toolbox(),media:'vendor/media/',sounds:false,grid:{spacing:20,length:3,colour:'#314057',snap:true},zoom:{controls:true,wheel:true},trashcan:true,theme:Blockly.Theme.defineTheme('frc2026',{base:Blockly.Themes.Classic,componentStyles:{workspaceBackgroundColour:'#101827',toolboxBackgroundColour:'#172438',toolboxForegroundColour:'#edf3fa',flyoutBackgroundColour:'#20324a',flyoutForegroundColour:'#edf3fa',scrollbarColour:'#60718a',scrollbarOpacity:0.6}})});
  workspace.addChangeListener(event=>{if(!loadingBlocks&&activeSS>=0&&activeMeth>=0&&!event.isUiEvent&&event.type!==Blockly.Events.FINISHED_LOADING)commit();});
  new ResizeObserver(()=>Blockly.svgResize(workspace)).observe($('workspace-wrap'));
  $('add-subsystem').onclick=()=>editSubsystem();$('add-method').onclick=()=>editMethod();$('method-options').onclick=()=>editMethod(activeMeth);
  $('add-first-method').onclick=()=>{if(activeSS<0&&P.subsystems.length)selectSS(0);if(activeSS<0)editSubsystem();else editMethod();};
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>editComponent(b.dataset.add));
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));for(const name of ['subsystems','swerve','settings'])$('tab-'+name).hidden=b.dataset.tab!==name;if(b.dataset.tab==='swerve')drawSwerve();});
  $('save-json').onclick=saveProject;$('load-json').onclick=()=>$('load-file').click();$('load-file').onchange=loadProject;$('export').onclick=exportProject;$('preview').onclick=previewCode;$('check').onclick=()=>checkProject();$('add-auto').onclick=()=>editAuto();$('load-example').onclick=loadExample;
  $('swerve-canvas').onclick=e=>{const r=e.target.getBoundingClientRect(),x=(e.clientX-r.left)*280/r.width,y=(e.clientY-r.top)*280/r.height;for(const [i,[mx,my]] of [[75,75],[205,75],[75,225],[205,225]].entries())if(Math.hypot(x-mx,y-my)<27){selMod=FRC.moduleNames[i];renderModule();drawSwerve();}};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject();}if(e.key==='Escape')closeModal();});
  window.addEventListener('beforeunload',()=>{saveBlocks();try{localStorage.setItem(STORAGE,JSON.stringify(P));}catch{}});
  renderAll();$('save-state').textContent='Runs locally · portable via JSON';
}
document.addEventListener('DOMContentLoaded',()=>{try{init();}catch(e){console.error(e);$('diagnostics').innerHTML='<div class="diagnostic error">Startup error: '+H(e.message)+'</div>';}});
