"""Compile and run the generated 2026 robot fixtures without downloading libraries."""
from pathlib import Path
import argparse,glob,json,os,platform,shutil,subprocess,sys,zipfile

HERE=Path(__file__).resolve().parent
OUTPUT=Path(os.environ.get('FRC_TEST_OUTPUT',str(HERE/'test-output'))).expanduser().resolve()
FIXTURES=OUTPUT/'fixtures'

def env_paths(name):
    return [Path(value).expanduser() for value in os.environ.get(name,'').split(os.pathsep) if value.strip()]

def wpilib_home():
    configured=os.environ.get('WPILIB_HOME')
    candidates=[Path(configured).expanduser()] if configured else []
    if os.environ.get('PUBLIC'):candidates.append(Path(os.environ['PUBLIC'])/'wpilib'/'2026')
    candidates.extend([Path.home()/'wpilib'/'2026',Path.home()/'wpilib'])
    for candidate in candidates:
        if (candidate/'maven').is_dir():return candidate
        if (candidate/'2026'/'maven').is_dir():return candidate/'2026'
        if candidate.name=='maven' and candidate.is_dir():return candidate.parent
    raise RuntimeError('WPILib 2026 was not found. Set WPILIB_HOME to its directory containing maven and jdk.')

def java_binary(home):
    binary='java.exe' if os.name=='nt' else 'java'
    roots=([Path(os.environ['JAVA_HOME'])] if os.environ.get('JAVA_HOME') else [])+[home/'jdk']
    for root in roots:
        candidate=root/'bin'/binary
        if candidate.is_file():return str(candidate)
        # Some macOS JDK archives use the standard application-bundle layout.
        candidate=root/'Contents/Home/bin'/binary
        if candidate.is_file():return str(candidate)
    found=shutil.which('java')
    if found:return found
    raise RuntimeError('Java 17 JDK was not found. Check JAVA_HOME or the WPILib JDK installation.')

def vendor_roots():
    configured=env_paths('FRC_VENDOR_JARS')
    if configured:return configured
    cache=Path.home()/'.gradle/caches/modules-2/files-2.1'
    return [cache] if cache.is_dir() else []

def jar_files(roots):
    result=[]
    for root in roots:
        matches=[Path(item) for item in glob.glob(str(root))] if any(char in str(root) for char in '*?[') else [root]
        for item in matches:
            candidates=item.rglob('*.jar') if item.is_dir() else [item]
            result.extend(p.resolve() for p in candidates if p.is_file() and p.suffix=='.jar' and '-sources' not in p.name and '-javadoc' not in p.name)
    return list(dict.fromkeys(result))

def native_platform():
    machine=platform.machine().lower()
    if sys.platform=='win32':return 'windowsx86-64'
    if sys.platform=='darwin':return 'osxuniversal'
    return 'linuxarm64' if machine in ['arm64','aarch64'] else 'linuxx86-64'

def native_name(name):
    lower=name.lower()
    return lower.endswith('.dll') or '.so' in lower or lower.endswith('.dylib')

def extract_natives(roots):
    destination=OUTPUT/'natives';destination.mkdir(parents=True,exist_ok=True)
    tag=native_platform()
    for root in roots:
        if not root.exists():continue
        if root.is_dir():
            files=root.rglob('*')
        else:
            files=[root]
        for candidate in files:
            if not candidate.is_file():continue
            if native_name(candidate.name):
                target=destination/candidate.name
                if candidate.resolve()!=target.resolve():shutil.copy2(candidate,target)
            elif candidate.suffix=='.zip' and tag in candidate.name and not any(word in candidate.name.lower() for word in ['debug','static','headers']):
                with zipfile.ZipFile(candidate) as archive:
                    for entry in archive.infolist():
                        name=Path(entry.filename).name
                        if not entry.is_dir() and native_name(name):
                            # Flatten only native filenames; never trust archive directory paths.
                            (destination/name).write_bytes(archive.read(entry))
    return destination

def command_run(command,log,cwd=None,env=None):
    result=subprocess.run(command,cwd=cwd,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180)
    text=result.stdout+result.stderr
    log.parent.mkdir(parents=True,exist_ok=True);log.write_text(text,encoding='utf-8')
    print(text,end='' if text.endswith('\n') else '\n',flush=True)
    return result.returncode==0

def compile_sources(name,sources,java,classpath):
    output=OUTPUT/'compiled'/name;output.mkdir(parents=True,exist_ok=True)
    listing=OUTPUT/'source-lists'/(name+'.txt');listing.parent.mkdir(exist_ok=True)
    listing.write_text('\n'.join(str(p.resolve()) for p in sources),encoding='utf-8')
    # The official JavaCompiler API performs normal Java compilation. A short-lived
    # source launcher avoids a Windows sandbox ZipFS-close issue in javac's CLI.
    ok=command_run([java,str(HERE/'java/CompileDriver.java'),classpath,str(output),str(listing)],OUTPUT/'logs'/(name+'-compile.txt'))
    return output if ok else None

def fixture_sources(name):
    folder=FIXTURES/name/'src/main/java'
    if not folder.is_dir():raise RuntimeError('Test project not found: '+name+'. Run node tests-v3/browser.cjs first; use the same FRC_TEST_OUTPUT for both runners.')
    return list(folder.rglob('*.java'))

def prepare_paths():
    runtime=OUTPUT/'path-runtime'
    for fixture in json.loads((HERE/'fixtures/path-assets.json').read_text(encoding='utf-8')):
        path=runtime/'src/main/deploy'/fixture['path']
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(fixture['text'],encoding='utf-8')
    return runtime

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--suite',choices=['all','compile','runtime','paths','tank','openloop'],default='all')
    parser.add_argument('--fixture',help='Compile only the selected fixture (with --suite compile).')
    parser.add_argument('--list-dependencies',action='store_true')
    args=parser.parse_args();OUTPUT.mkdir(parents=True,exist_ok=True)
    home=wpilib_home();java=java_binary(home);vendors=vendor_roots();jars=jar_files([home/'maven']+vendors)
    if not jars:raise RuntimeError('No library JAR files were found for compilation.')
    classpath=os.pathsep.join(map(str,jars))
    print('WPILib:',home,'\nJDK:',java,'\nClasspath JAR count:',len(jars),flush=True)
    if args.list_dependencies:
        for jar in jars:print(jar)
        return 0
    results=[]
    if args.suite in ['all','compile']:
        if not FIXTURES.is_dir():raise RuntimeError('No generated fixtures found. Run node tests-v3/browser.cjs first.')
        for project in sorted(FIXTURES.iterdir()):
            if project.is_dir():
                if args.fixture and project.name!=args.fixture:continue
                sources=fixture_sources(project.name)
                passed=compile_sources('fixture-'+project.name,sources,java,classpath) is not None
                results.append({'name':'compile:'+project.name,'passed':passed,'sources':len(sources)})
    suites=['runtime','paths','tank','openloop'] if args.suite=='all' else [] if args.suite=='compile' else [args.suite]
    if suites:
        natives=extract_natives([home/'maven']+vendors+env_paths('FRC_NATIVE_PATH'))
        env=os.environ.copy()
        for key in ['PATH','LD_LIBRARY_PATH','DYLD_LIBRARY_PATH']:env[key]=str(natives)+os.pathsep+env.get(key,'')
        for suite in suites:
            if suite=='runtime':
                sources=fixture_sources('idle')+[FIXTURES/'all/src/main/java/frc/robot/runtime/LimelightCamera.java',FIXTURES/'all/src/main/java/frc/robot/runtime/PhotonCameraAdapter.java',FIXTURES/'all/src/main/java/frc/robot/LimelightHelpers.java',HERE/'java/RuntimeReview.java']
                jobs=[('runtime',sources,'RuntimeReview',[],OUTPUT)]
            elif suite=='paths':jobs=[('paths',[HERE/'java/PathsReview.java'],'PathsReview',[],prepare_paths())]
            elif suite=='tank':jobs=[('tank',fixture_sources('tank-pwm-quadrature')+[HERE/'java/TankRuntimeReview.java'],'TankRuntimeReview',[],FIXTURES/'tank-pwm-quadrature')]
            else:jobs=[('openloop-'+kind,fixture_sources(kind+'-pwm-openloop')+[HERE/'java/OpenLoopReview.java'],'OpenLoopReview',[kind],FIXTURES/(kind+'-pwm-openloop')) for kind in ['tank','mecanum']]
            for name,sources,main_class,arguments,cwd in jobs:
                compiled=compile_sources(name,sources,java,classpath)
                passed=compiled is not None and command_run([java,'-Djava.library.path='+str(natives),'-Dfrc.test.nativeDir='+str(natives),'-cp',str(compiled)+os.pathsep+classpath,main_class]+arguments,OUTPUT/'logs'/(name+'-runtime.txt'),cwd=cwd,env=env)
                results.append({'name':name,'passed':passed})
    (OUTPUT/'java-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print('JAVA SUITES:',sum(result['passed'] for result in results),'/',len(results),flush=True)
    return 0 if results and all(result['passed']for result in results) else 1

if __name__=='__main__':
    try:raise SystemExit(main())
    except (RuntimeError,subprocess.TimeoutExpired,OSError,zipfile.BadZipFile) as error:
        print('Test setup / execution failed:',error,file=sys.stderr);raise SystemExit(1)
