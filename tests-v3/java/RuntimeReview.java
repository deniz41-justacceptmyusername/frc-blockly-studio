import edu.wpi.first.hal.HAL;
import edu.wpi.first.math.Matrix;
import edu.wpi.first.math.geometry.*;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.numbers.*;
import edu.wpi.first.math.system.plant.DCMotor;
import edu.wpi.first.networktables.NetworkTableInstance;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.simulation.*;
import edu.wpi.first.wpilibj2.command.*;
import frc.robot.runtime.*;
import java.util.concurrent.atomic.*;
import org.photonvision.PhotonCamera;
import org.photonvision.targeting.*;
import org.photonvision.common.networktables.PacketPublisher;
import java.util.List;

public class RuntimeReview {
  static int passed,failed;
  static void check(String name,Runnable run){try{run.run();passed++;System.out.println("PASS "+name);}catch(Throwable t){failed++;System.out.println("FAIL "+name+": "+t);}}
  static void yes(boolean ok,String why){if(!ok)throw new AssertionError(why);}
  static void near(double a,double b,double tolerance){yes(Double.isFinite(a)&&Math.abs(a-b)<=tolerance,"Expected "+b+", got "+a);}
  static VisionGate gate(){return new VisionGate(new VisionGate.Limits(.5,.2,6,.4,3,540,16.54,8.07));}
  static VisionCamera.Measurement m(double x,double y,double z,double yaw,double stamp,int count,double ambiguity,double distance){return new VisionCamera.Measurement(new Pose3d(x,y,z,new Rotation3d(0,0,yaw)),stamp,count,ambiguity,distance);}
  static boolean accept(VisionCamera.Measurement measurement){return gate().accept("front",measurement,10,0,new Pose2d(1,1,new Rotation2d()),true);}
  static void tick(){DriverStationSim.notifyNewData();DriverStation.refreshData();CommandScheduler.getInstance().run();SimHooks.stepTiming(.02);}
  static final class Drive extends SubsystemBase implements DriveIO {
    Pose2d pose=new Pose2d(1,2,Rotation2d.fromDegrees(90));
    public Pose2d getPose(){return pose;}
    public void resetPose(Pose2d value){pose=value;}
    public ChassisSpeeds getRobotSpeeds(){return new ChassisSpeeds();}
    public void driveRobotRelative(ChassisSpeeds v){}
    public void addVisionMeasurement(Pose2d p,double t,Matrix<N3,N1> deviations){}
  }
  public static void main(String[] args) throws Exception {
    yes(HAL.initialize(500,0),"HAL initialization failed");SimHooks.pauseTiming();
    DriverStationSim.setDsAttached(true);DriverStationSim.setEnabled(true);DriverStationSim.setAutonomous(false);tick();
    check("Vision accepts a fresh plausible single-tag measurement",()->yes(accept(m(1,1,0,0,9.8,1,.1,2)),"Rejected good measurement"));
    check("Vision rejects missing estimate",()->yes(!accept(null),"Accepted null"));
    check("Vision rejects zero tags",()->yes(!accept(m(1,1,0,0,9.8,0,.1,2)),"Accepted zero tags"));
    check("Vision rejects stale frames",()->yes(!accept(m(1,1,0,0,9.49,2,0,2)),"Accepted old frame"));
    check("Vision accepts exact maximum frame age",()->yes(accept(m(1,1,0,0,9.5,2,0,2)),"Boundary rejected"));
    check("Vision rejects future frames",()->yes(!accept(m(1,1,0,0,10.03,2,0,2)),"Accepted future frame"));
    check("Vision deduplicates frames per camera",()->{var g=gate();var frame=m(1,1,0,0,9.8,2,0,2);yes(g.accept("a",frame,10,0,new Pose2d(),false),"First rejected");yes(!g.accept("a",frame,10,0,new Pose2d(),false),"Duplicate accepted");yes(g.accept("b",frame,10,0,new Pose2d(),false),"Other camera rejected");});
    check("Vision rejects out of field estimate",()->yes(!accept(m(-1,1,0,0,9.8,2,0,2)),"Outside field accepted"));
    check("Vision rejects elevated estimate",()->yes(!accept(m(1,1,.5,0,9.8,2,0,2)),"Z accepted"));
    check("Vision rejects large tilt",()->yes(!gate().accept("a",new VisionCamera.Measurement(new Pose3d(1,1,0,new Rotation3d(.5,0,0)),9.8,2,0,2),10,0,new Pose2d(),false),"Tilt accepted"));
    check("Vision rejects ambiguous single tag",()->yes(!accept(m(1,1,0,0,9.8,1,.21,2)),"Ambiguous accepted"));
    check("Vision rejects unknown single-tag ambiguity",()->yes(!accept(m(1,1,0,0,9.8,1,-1,2)),"Unknown ambiguity accepted"));
    check("Vision accepts multi-tag estimate with unknown ambiguity",()->yes(accept(m(1,1,0,0,9.8,2,-1,2)),"Multitag rejected"));
    check("Vision rejects long-distance estimate",()->yes(!accept(m(1,1,0,0,9.8,2,0,6.1)),"Distance accepted"));
    check("Vision rejects fast yaw",()->yes(!gate().accept("a",m(1,1,0,0,9.8,2,0,2),10,541,new Pose2d(),false),"Fast yaw accepted"));
    check("Vision rejects enabled pose jump",()->yes(!accept(m(10,5,0,0,9.8,2,0,2)),"Jump accepted"));
    check("Vision permits disabled localization jump",()->yes(gate().accept("a",m(10,5,0,0,9.8,2,0,2),10,0,new Pose2d(),false),"Disabled jump rejected"));
    check("Vision rejects NaN coordinates",()->yes(!accept(m(Double.NaN,1,0,0,9.8,2,0,2)),"NaN coordinate accepted"));
    check("Vision rejects NaN orientation",()->yes(!accept(m(1,1,0,Double.NaN,9.8,2,0,2)),"NaN orientation accepted"));
    check("Vision rejects infinite orientation",()->yes(!accept(m(1,1,0,Double.POSITIVE_INFINITY,9.8,2,0,2)),"Infinite orientation accepted"));
    check("Vision rejects NaN distance",()->yes(!accept(m(1,1,0,0,9.8,2,0,Double.NaN)),"NaN distance accepted"));
    check("Vision rejects NaN timestamp",()->yes(!accept(m(1,1,0,0,Double.NaN,2,0,2)),"NaN timestamp accepted"));
    var llTable=NetworkTableInstance.getDefault().getTable("limelight-review");
    var ll=new LimelightCamera("limelight-review",false,.25,.1,.5,0,-20,0,2,false);
    check("Limelight writes camera transform and initial pipeline",()->{near(llTable.getEntry("pipeline").getDouble(-1),2,0);var transform=llTable.getEntry("camerapose_robotspace_set").getDoubleArray(new double[0]);yes(transform.length==6,"Missing camera transform");near(transform[0],.25,0);near(transform[4],-20,0);});
    check("Limelight no heartbeat means disconnected",()->yes(!ll.connected(),"Unseen camera reports connected"));
    llTable.getEntry("hb").setDouble(1);llTable.getEntry("tv").setDouble(1);llTable.getEntry("tx").setDouble(7);llTable.getEntry("ty").setDouble(-3);llTable.getEntry("ta").setDouble(.8);llTable.getEntry("tid").setDouble(4);
    llTable.getEntry("botpose_wpiblue").setDoubleArray(new double[]{1,1,0,0,0,30,10,1,.2,2,.8,4,7,-3,.8,2,2,.1});
    AtomicReference<VisionCamera.Measurement> llFrame=new AtomicReference<>();ll.update(Timer.getFPGATimestamp(),0,0,llFrame::set);
    check("Limelight heartbeat and target cached",()->{yes(ll.connected(),"Fresh heartbeat disconnected");yes(ll.hasTarget(Timer.getFPGATimestamp(),.5),"Target missing");near(ll.value("yaw",Timer.getFPGATimestamp(),.5),7,0);near(ll.value("id",Timer.getFPGATimestamp(),.5),4,0);});
    check("Limelight valid pose contains timestamp and ambiguity",()->{yes(llFrame.get()!=null,"No pose delivered");near(llFrame.get().pose().getX(),1,0);near(llFrame.get().pose().getRotation().getZ(),Math.toRadians(30),1e-8);near(llFrame.get().ambiguity(),.1,0);yes(llFrame.get().tags()==1,"Incorrect tag count");});
    check("Limelight rejects unknown single-tag ambiguity",()->{llTable.getEntry("hb").setDouble(2);llTable.getEntry("botpose_wpiblue").setDoubleArray(new double[]{1,1,0,0,0,30,10,1,.2,2,.8});llFrame.set(null);ll.update(Timer.getFPGATimestamp(),0,0,llFrame::set);yes(llFrame.get()==null||!gate().accept("ll",llFrame.get(),llFrame.get().timestamp()+.01,0,new Pose2d(1,1,new Rotation2d()),true),"Malformed tag info accepted with ambiguity "+llFrame.get().ambiguity());});
    check("Limelight controls publish correct NT commands",()->{ll.pipeline(5);near(llTable.getEntry("pipeline").getDouble(-1),5,0);ll.driverMode(true);near(llTable.getEntry("camMode").getDouble(-1),1,0);ll.led("ON");near(llTable.getEntry("ledMode").getDouble(-1),3,0);ll.led("OFF");near(llTable.getEntry("ledMode").getDouble(-1),1,0);});
    check("Limelight stale heartbeat loses target",()->{SimHooks.stepTiming(.6);ll.update(Timer.getFPGATimestamp(),0,0,x->{});yes(!ll.connected(),"Old heartbeat connected");yes(!ll.hasTarget(Timer.getFPGATimestamp(),.5),"Old target active");near(ll.value("yaw",Timer.getFPGATimestamp(),.5),0,0);});
    check("Limelight MegaTag2 publishes gyro orientation",()->{var mega=new LimelightCamera("limelight-review-mt2",true,0,0,0,0,0,0,0,false);mega.update(Timer.getFPGATimestamp(),80,12,x->{});var orientation=NetworkTableInstance.getDefault().getTable("limelight-review-mt2").getEntry("robot_orientation_set").getDoubleArray(new double[0]);yes(orientation.length==6,"Orientation not sent");near(orientation[0],80,0);near(orientation[1],12,0);});
    // Windows requires explicit loading of the native dependency chain. Other
    // platforms resolve dependencies through the runner's native-library path.
    if(System.getProperty("os.name").startsWith("Windows")) {
      String nativeRoot=System.getProperty("frc.test.nativeDir");
      for(String dependency:List.of("wpimath.dll","wpinet.dll","opencv_core4100.dll","opencv_flann4100.dll","opencv_imgproc4100.dll","opencv_features2d4100.dll","opencv_calib3d4100.dll","opencv_imgcodecs4100.dll","apriltag.dll","cscore.dll","photontargeting.dll"))
        System.load(java.nio.file.Path.of(nativeRoot,dependency).toAbsolutePath().toString());
    }
    PhotonCamera.setVersionCheckEnabled(false);
    PhotonCameraAdapter photon=new PhotonCameraAdapter("photon-review",edu.wpi.first.apriltag.AprilTagFieldLayout.loadField(edu.wpi.first.apriltag.AprilTagFields.k2026RebuiltWelded),0,0,0,0,0,0,3,true);
    var photonTable=NetworkTableInstance.getDefault().getTable("photonvision/photon-review");
    check("Photon initial controls use official NT requests",()->{yes(photonTable.getEntry("pipelineIndexRequest").getInteger(-1)==3,"Pipeline missing");yes(photonTable.getEntry("driverModeRequest").getBoolean(false),"Driver mode missing");});
    check("Photon no heartbeat means disconnected",()->yes(!photon.connected(),"Unseen Photon connected"));
    photonTable.getEntry("heartbeat").setInteger(1);photon.connected();
    var publisher=new PacketPublisher<PhotonPipelineResult>(photonTable.getRawTopic("rawBytes").publish(PhotonPipelineResult.photonStruct.getTypeString()),PhotonPipelineResult.photonStruct);
    var corners=List.of(new TargetCorner(0,0),new TargetCorner(1,0),new TargetCorner(1,1),new TargetCorner(0,1));
    var photonTarget=new PhotonTrackedTarget(5,-2,1,0,4,-1,0,new Transform3d(2,0,0,new Rotation3d()),new Transform3d(2,0,0,new Rotation3d()),.1,corners,corners);
    var photonResult=new PhotonPipelineResult();photonResult.targets=List.of(photonTarget);photonResult.metadata.captureTimestampMicros=(long)((Timer.getFPGATimestamp()-.02)*1e6);photonResult.metadata.publishTimestampMicros=(long)(Timer.getFPGATimestamp()*1e6);photonResult.metadata.sequenceID=1;photonResult.metadata.timeSinceLastPong=0;
    publisher.set(photonResult,4096);
    AtomicInteger photonFrames=new AtomicInteger();photon.update(Timer.getFPGATimestamp(),0,0,x->photonFrames.incrementAndGet());
    check("Photon consumes official serialized target result",()->{yes(photonFrames.get()==1,"Estimate count "+photonFrames.get());yes(photon.hasTarget(Timer.getFPGATimestamp(),.5),"Photon target missing");near(photon.value("yaw",Timer.getFPGATimestamp(),.5),5,0);near(photon.value("latency",Timer.getFPGATimestamp(),.5),20,1e-3);});
    check("Photon results are consumed exactly once",()->{photon.update(Timer.getFPGATimestamp(),0,0,x->photonFrames.incrementAndGet());yes(photonFrames.get()==1,"Duplicate Photon frame consumed");});
    check("Photon no-target frame clears target cache",()->{var empty=new PhotonPipelineResult();empty.metadata.captureTimestampMicros=(long)(Timer.getFPGATimestamp()*1e6);empty.metadata.publishTimestampMicros=empty.metadata.captureTimestampMicros;empty.metadata.sequenceID=2;publisher.set(empty,4096);photon.update(Timer.getFPGATimestamp(),0,0,x->photonFrames.incrementAndGet());yes(!photon.hasTarget(Timer.getFPGATimestamp(),.5),"Empty frame kept target");near(photon.value("yaw",Timer.getFPGATimestamp(),.5),0,0);});
    check("Photon controls publish LED pipeline and driver mode",()->{photon.led("ON");near(NetworkTableInstance.getDefault().getTable("photonvision").getEntry("ledModeRequest").getInteger(-2),1,0);photon.pipeline(6);near(photonTable.getEntry("pipelineIndexRequest").getInteger(-1),6,0);photon.driverMode(false);yes(!photonTable.getEntry("driverModeRequest").getBoolean(true),"Driver mode retained");});
    check("Photon stale heartbeat reports disconnected",()->{SimHooks.stepTiming(.6);yes(!photon.connected(),"Stale Photon heartbeat connected");});publisher.close();
    check("Physics flywheel accelerates with applied voltage",()->{AtomicReference<MotorPhysics.State> state=new AtomicReference<>();var physics=new MotorPhysics("flywheel",DCMotor.getNEO(1),2,.004,5,.025,.5,0,1.5,0,()->6,state::set);for(int k=0;k<50;k++)physics.update(.02);yes(state.get().rotorRps()>0,"No rotation");yes(state.get().rotorRotations()>0,"No integrated position");});
    check("Physics flywheel neutral at zero voltage",()->{AtomicReference<MotorPhysics.State> state=new AtomicReference<>();var physics=new MotorPhysics("flywheel",DCMotor.getNEO(1),2,.004,5,.025,.5,0,1.5,0,()->0,state::set);physics.update(.02);near(state.get().rotorRps(),0,1e-8);});
    check("Physics NaN input becomes zero",()->{AtomicReference<MotorPhysics.State> state=new AtomicReference<>();var physics=new MotorPhysics("flywheel",DCMotor.getNEO(1),2,.004,5,.025,.5,0,1.5,0,()->Double.NaN,state::set);physics.update(.02);near(state.get().rotorRps(),0,1e-8);});
    check("Physics elevator stays within physical bounds",()->{AtomicReference<MotorPhysics.State> state=new AtomicReference<>();var physics=new MotorPhysics("elevator",DCMotor.getNEO(1),10,.004,5,.025,.5,0,1.5,.5,()->12,state::set);for(int k=0;k<200;k++)physics.update(.02);yes(state.get().mechanismPosition()<=1.50001&&state.get().mechanismPosition()>=0,"Exceeded travel");});
    check("Physics arm stays within physical bounds",()->{AtomicReference<MotorPhysics.State> state=new AtomicReference<>();var physics=new MotorPhysics("arm",DCMotor.getNEO(1),100,.2,5,.025,.5,-1,1,0,()->12,state::set);for(int k=0;k<200;k++)physics.update(.02);yes(state.get().mechanismPosition()<=1.00001&&state.get().mechanismPosition()>=-1.00001,"Exceeded travel");});
    Drive drive=new Drive();RobotServices.initialize(drive);
    check("Services NetworkTables numeric write/read",()->{RobotServices.publish("review-number",42.5);near(RobotServices.number("review-number",0),42.5,0);});
    check("Services numeric fallback",()->near(RobotServices.number("review-missing",7),7,0));
    check("Services boolean read",()->{NetworkTableInstance.getDefault().getEntry("/review/boolean").setBoolean(true);yes(RobotServices.flag("/review/boolean"),"Boolean false");});
    check("Services discards nonfinite publish",()->{RobotServices.publish("review-number",Double.NaN);near(RobotServices.number("review-number",0),42.5,0);});
    check("Services gyro reset preserves translation",()->{RobotServices.zeroGyro();near(drive.pose.getX(),1,0);near(drive.pose.getY(),2,0);near(drive.pose.getRotation().getRadians(),0,1e-8);});
    check("Services publishes telemetry and Pose2d struct",()->{RobotServices.metric("review/value",()->17.2);SimHooks.stepTiming(.1);RobotServices.periodic();near(RobotServices.number("/FRCStudio/Devices/review/value",0),17.2,0);yes(NetworkTableInstance.getDefault().getStructTopic("/FRCStudio/Drive/Pose",Pose2d.struct).exists(),"Pose topic missing");});
    check("Services command starts and times out",()->{AtomicInteger calls=new AtomicInteger();RobotServices.registerMethod("review.timeout",()->Commands.run(calls::incrementAndGet,drive));RobotServices.startMethod("review.timeout",.08);for(int k=0;k<8;k++)tick();int count=calls.get();yes(count>=2&&count<=6,"Timeout invocation count "+count);tick();yes(calls.get()==count,"Command still active");});
    check("Services rejects disabled command start",()->{DriverStationSim.setEnabled(false);tick();AtomicInteger calls=new AtomicInteger();RobotServices.registerMethod("review.disabled",()->Commands.run(calls::incrementAndGet,drive));RobotServices.startMethod("review.disabled",.1);DriverStationSim.setEnabled(true);tick();yes(calls.get()==0,"Disabled start was queued");});
    check("Services repeated starts do not interrupt same active method",()->{AtomicInteger interrupts=new AtomicInteger();RobotServices.registerMethod("review.repeat",()->Commands.run(()->{},drive).finallyDo(interrupted->{if(interrupted)interrupts.incrementAndGet();}));for(int k=0;k<5;k++){RobotServices.startMethod("review.repeat",.2);tick();}yes(interrupts.get()==0,"Repeated schedule interruptions "+interrupts.get());CommandScheduler.getInstance().cancelAll();});
    check("Physics disabled cannot apply voltage",()->{DriverStationSim.setEnabled(false);tick();AtomicReference<MotorPhysics.State> state=new AtomicReference<>();var physics=new MotorPhysics("flywheel",DCMotor.getNEO(1),2,.004,5,.025,.5,0,1.5,0,()->6,state::set);for(int k=0;k<20;k++)physics.update(.02);near(state.get().rotorRps(),0,1e-8);});
    System.out.println("RUNTIME_REVIEW passed="+passed+" failed="+failed);CommandScheduler.getInstance().cancelAll();HAL.shutdown();System.exit(failed==0?0:1);
  }
}
