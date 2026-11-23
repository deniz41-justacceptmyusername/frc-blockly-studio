import edu.wpi.first.hal.HAL;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj.simulation.*;
import frc.robot.RobotIO;
import frc.robot.subsystems.DriveSubsystem;
public class OpenLoopReview {
 static int passed,failed;
 static void check(String n,Runnable r){try{r.run();passed++;System.out.println("PASS "+n);}catch(Throwable e){failed++;System.out.println("FAIL "+n+": "+e);}}
 static void yes(boolean b,String why){if(!b)throw new AssertionError(why);}static void near(double a,double b){yes(Double.isFinite(a)&&Math.abs(a-b)<.002,"Expected "+b+", got "+a);}
 static double[] pwm(){double[] x=new double[4];for(int n=0;n<4;n++)x[n]=new PWMSim(n).getSpeed();return x;}
 static void zero(){for(double n:pwm())near(n,0);}
 public static void main(String[]args){yes(HAL.initialize(500,0),"HAL");DriverStationSim.setDsAttached(true);DriverStationSim.setEnabled(true);DriverStationSim.notifyNewData();DriverStation.refreshData();RoboRioSim.setVInVoltage(12);RobotIO.setGyroAccess(()->0,()->{});DriveSubsystem drive=new DriveSubsystem();boolean tank=args[0].equals("tank");
  check(args[0]+" open-loop forward moves all wheels forward",()->{drive.drive(.4,0,0,false);for(double n:pwm())yes(n>0,"Forward wheel has nonpositive command");});
  check(args[0]+" open-loop positive rotation commands CCW",()->{drive.drive(0,0,.4,false);double[] x=pwm();for(int n=0;n<4;n++){boolean left=tank?n<2:n==0||n==2;yes(left?x[n]<0:x[n]>0,"Wheel "+n+" has wrong CCW sign "+x[n]);}});
  if(!tank){
   check("mecanum positive left command matches wheel geometry",()->{drive.drive(0,.4,0,false);double[] x=pwm();yes(x[0]<0&&x[1]>0&&x[2]>0&&x[3]<0,"Wrong strafe signs "+java.util.Arrays.toString(x));});
   check("mecanum field-relative drive rotates command using gyro without encoders",()->{drive.drive(0,-.4,0,false);double[] robotRight=pwm();RobotIO.setGyroAccess(()->90,()->{});drive.drive(.4,0,0,true);double[] fieldForward=pwm();for(int n=0;n<4;n++)near(fieldForward[n],robotRight[n]);});
  }
  check(args[0]+" robot-relative mode ignores current gyro heading",()->{RobotIO.setGyroAccess(()->0,()->{});drive.drive(.4,0,0,false);double[] before=pwm();RobotIO.setGyroAccess(()->90,()->{});drive.drive(.4,0,0,false);double[] after=pwm();for(int n=0;n<4;n++)near(after[n],before[n]);});
  check(args[0]+" open-loop inputs remain bounded",()->{drive.drive(100,100,100,false);for(double n:pwm())yes(Double.isFinite(n)&&Math.abs(n)<=1,"Unbounded PWM "+n);});
  check(args[0]+" open-loop NaN input becomes zero",()->{drive.drive(Double.NaN,Double.NaN,Double.NaN,false);zero();});
  check(args[0]+" stopAll zeros every output",()->{drive.drive(.4,0,0,false);drive.stopAll();zero();});
  System.out.println("OPEN_LOOP_REVIEW "+args[0]+" passed="+passed+" failed="+failed);HAL.shutdown();System.exit(failed==0?0:1);
 }
}
