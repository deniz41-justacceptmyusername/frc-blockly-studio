import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.simulation.*;
import edu.wpi.first.wpilibj2.command.CommandScheduler;
import edu.wpi.first.math.geometry.*;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import frc.robot.*;
import frc.robot.runtime.*;
import frc.robot.subsystems.DriveSubsystem;

public class TankRuntimeReview {
 static int passed,failed;
 static void check(String name,Runnable run){try{run.run();passed++;System.out.println("PASS "+name);}catch(Throwable t){failed++;System.out.println("FAIL "+name+": "+t);t.printStackTrace(System.out);}}
 static void yes(boolean b,String msg){if(!b)throw new AssertionError(msg);}
 static void near(double a,double b,double tolerance){yes(Double.isFinite(a)&&Math.abs(a-b)<=tolerance,"Expected "+b+", got "+a);}
 static void tick(){DriverStationSim.notifyNewData();DriverStation.refreshData();CommandScheduler.getInstance().run();RobotServices.periodic();SimHooks.stepTiming(.02);}
 static void ticks(int n){for(int k=0;k<n;k++)tick();}
 static void stopped(){for(int channel=0;channel<4;channel++)near(new PWMSim(channel).getSpeed(),0,.0001);}
 public static void main(String[]args)throws Exception{
  yes(HAL.initialize(500,0),"HAL init");SimHooks.pauseTiming();RoboRioSim.setVInVoltage(12);DriverStationSim.setDsAttached(true);DriverStationSim.setEnabled(true);DriverStationSim.setAutonomous(false);
  var controller=new XboxControllerSim(RobotIO.driver);controller.setButtonCount(10);controller.setAxisCount(6);controller.setPOVCount(1);
  var container=new RobotContainer();DriveSubsystem drive=(DriveSubsystem)RobotServices.drive();ticks(2);
  check("Generated tank initializes zero PWM outputs",TankRuntimeReview::stopped);
  check("Generated tank forward drive updates real PWM and quadrature odometry",()->{controller.setLeftY(-.6);ticks(100);yes(new PWMSim(0).getSpeed()>0,"Left PWM inactive");yes(new PWMSim(2).getSpeed()>0,"Right PWM inactive");yes(drive.frc_encoder0Position()>1,"Left EncoderSim not updated");yes(drive.frc_encoder2Position()>1,"Right EncoderSim not updated");yes(drive.getPose().getX()>.1,"Pose did not advance "+drive.getPose());near(drive.getPose().getY(),0,.03);near(drive.getPose().getRotation().getRadians(),0,.03);});
  check("Generated tank turning updates simulated gyro and pose orientation",()->{controller.setLeftY(0);controller.setRightX(-.35);ticks(100);yes(RobotIO.headingDegrees()>15,"Simulated gyro did not turn "+RobotIO.headingDegrees());yes(drive.getPose().getRotation().getDegrees()>15,"Odometry did not turn "+drive.getPose());yes(drive.getRobotSpeeds().omegaRadiansPerSecond>0,"Measured wheel speeds do not show turn");});
  check("Generated tank pose reset remains consistent with gyro offset",()->{controller.setRightX(0);container.stopAll();drive.resetPose(new Pose2d(2,3,Rotation2d.fromDegrees(45)));near(drive.getPose().getX(),2,.0001);near(drive.getPose().getY(),3,.0001);near(drive.getPose().getRotation().getDegrees(),45,.0001);});
  check("Generated gyro zero preserves reset translation",()->{RobotServices.zeroGyro();near(drive.getPose().getX(),2,.0001);near(drive.getPose().getY(),3,.0001);near(drive.getPose().getRotation().getDegrees(),0,.0001);near(RobotIO.headingDegrees(),0,.0001);});
  check("Generated stopAll immediately clears all PWM outputs",()->{CommandScheduler.getInstance().cancelAll();container.stopAll();stopped();});
  check("Generated tank watchdog clears abandoned motor command",()->{drive.removeDefaultCommand();CommandScheduler.getInstance().cancelAll();drive.driveRobotRelative(new ChassisSpeeds(.8,0,0));yes(new PWMSim(0).getSpeed()!=0,"Test did not command a wheel");ticks(12);stopped();});
  check("Generated tank rejects nonfinite drive inputs",()->{drive.driveRobotRelative(new ChassisSpeeds(Double.NaN,Double.POSITIVE_INFINITY,Double.NEGATIVE_INFINITY));for(int channel=0;channel<4;channel++){double value=new PWMSim(channel).getSpeed();yes(Double.isFinite(value)&&Math.abs(value)<=1,"Invalid PWM output "+value);}});
  check("Generated tank disabled mode leaves outputs zero",()->{DriverStationSim.setEnabled(false);container.stopAll();ticks(5);stopped();});
  System.out.println("TANK_RUNTIME_REVIEW passed="+passed+" failed="+failed+" finalPose="+drive.getPose());CommandScheduler.getInstance().cancelAll();HAL.shutdown();System.exit(failed==0?0:1);
 }
}
