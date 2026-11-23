import javax.tools.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
public class CompileDriver {
  public static void main(String[] args) throws Exception {
    JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
    if(compiler==null)throw new IllegalStateException("Java 17 JDK is required; a JRE cannot compile robot code.");
    StandardJavaFileManager manager=compiler.getStandardFileManager(null,null,java.nio.charset.StandardCharsets.UTF_8);
    List<String> sources=Files.readAllLines(Path.of(args[2]));
    boolean ok=compiler.getTask(null,manager,null,List.of("--release","17","-encoding","UTF-8","-proc:none","-Xlint:deprecation","-classpath",args[0],"-d",args[1]),null,manager.getJavaFileObjectsFromStrings(sources)).call();
    // The Windows sandbox denies real-path lookup at ZipFS close. The process releases handles.
    System.out.println("COMPILE_RESULT="+ok);
    System.exit(ok?0:1);
  }
}
