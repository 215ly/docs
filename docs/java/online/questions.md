# Java常见线上问题

## API 接口响应比较慢，该如何快速排查和定位问题？
### 1.1 定位问题
1. 查看是否是sql性能瓶颈，我们需要开启 mysql 的慢查询日志。把超过指定时间的 sql 语句，单独记录下来，方面以后分析和定位问题。
> 开启慢查询日志需要重点关注三个参数：
> - `slow_query_log`慢查询开关
> - `slow_query_log_file`慢查询日志存放地址
> - `long_query_time`超过多少秒才会记录日志
```shell
 # 通过 mysql 的 set 命令可以设置：
 set global slow_query_log='ON';
 set global slow_query_log_file='/usr/local/mysql/data/slow.log';
 set global long_query_time=2;
```
设置完之后，如果某条 sql 的执行时间超过了 2 秒，会被自动记录到slow.log文件中。当然也可以直接修改配置文件 `my.cnf`
```shell
[mysqld]
slow_query_log = ON
slow_query_log_file = /usr/local/mysql/data/slow.log
long_query_time = 2
```
但这种方式需要重启 mysql 服务
### 1.2 监控
常见开源监控系统是`Prometheus`，它提供了 监控 和 预警 的功能。
我们可以用它监控如下信息：
- 接口响应时间
- 调用第三方服务耗时
- 慢查询 sql 耗时
- cpu 使用情况
- 内存使用情况
- 磁盘使用情况
- 数据库使用情况

### 1.3 链路追踪
有时候某个接口涉及的逻辑很多，比如：查数据库、查 redis、远程调用接口，发mq消息，执行业务代码等等。
该接口一次请求的链路很长，如果逐一排查，需要花费大量的时间，这时候，我们已经没法用传统的办法定位问题了。
用分布式链路跟踪系统：`skywalking`
在 skywalking 中可以通过 traceId（全局唯一的 id），串联一个接口请求的完整链路。可以看到整个接口的耗时，调用的远程服务的耗时，访问数据库或者redis 的耗时等等，功能非常强大。
之前没有这个功能的时候，为了定位线上接口性能问题，我们还需要在代码中加日志，手动打印出链路中各个环节的耗时情况，然后再逐一排查。

### 1.4 死锁问题
使用`Arthas`中的`thread -b`命令，找出当前阻塞其他线程的线程，就是造成死锁的线程
```shell
[arthas@11596]$ thread -b
"t1" Id=10 BLOCKED on java.lang.Object@26dee7d7 owned by "t2" Id=11
    at test.Deadlock.lambda$main$0(Deadlock.java:24)
    -  blocked on java.lang.Object@26dee7d7
    -  locked java.lang.Object@13a631ce <---- but blocks 1 other threads!
    at test.Deadlock$$Lambda$1/250421012.run(Unknown Source)
    at java.lang.Thread.run(Thread.java:748)

```
其他相关命令
```shell
thread –all, 显示所有的线程；
thread id, 显示指定线程的运行堆栈；
thread –state：查看指定状态的线程，如：thread –state BLOCKED；
thread -n 3：展示当前最忙的前N个线程并打印堆栈；
```

## CPU占用过高
### 可能导致 CPU 使用率飙升的操作
- 无限循环的 while
- 经常使用 Young GC
- 频繁的 GC
- 序列化和反序列化
- 正则表达式
- 线程上下文切换
### 如何排查
1. 定位进程，使用`top`查看资源占用高的进程，获取到PID号，假设：18893
2. 通过进程找到对应的线程，使用`top -Hp 18893`获取到线程号，假设：4519
3. 通过线程定位到代码大概位置信息
	- 通过`printf %x 4519`，获取16进制线程号，结果为11a7
	- 通过`jstack 18893 | grep 11a7 -A 30 -color`获取到堆栈信息，拿到代码大致位置
4. 通过`Arthas`中的`thread -n 3`查看cpu占比前三的线程
## 内存占用过高
### 如何排查
1. 定位进程，输入`top`命令后按下`M`（按照内存占用由大到小排序）假设定位到进程ID是14279
2. 找到对应线程`top -Hp 14279`，同样按下`M`（按内存占用由大到小排序）
![c.png](..%2F..%2F..%2F.vitepress%2Fpublic%2Fimages%2F64e29a5edb58403da6a060a71776d39d.jpeg)
3. 需要观察左上角的线程数量，现在的线程数量是54，属于正常，如果较大的话比如大于1000时，就需要考虑是不是代码有问题导致起了多个线程或者是是不是自己的线程池创建的最大个数太大了。
4. 如果线程数量正常则找到占内存大的线程的PID，比如按下M后的第一个线程(这里没有模拟内存占用，只展示命令)，此时需要使用dump内存的快照信息来查看
> **如果是线上环境，dump之前需要保证没有流量使用，否则较大内存的dump是直接卡死服务**
5. 使用`jmap -dump:format=b,file=dump.hprof 19796`来获取快照
6. 使用工具查看业务相关实例，然后找到对应代码查看（比如：MAT、MAT、VisualVM、jhat）

## 磁盘问题
1. 检查磁盘占用情况，使用`df -h`或`du`命令查看
2. TPS是否正常，使用`iostat、vmstat、lsof`
	- `iostat`用来报告CPU使用情况和磁盘I/O统计信息
	- `vmstat`报告虚拟内存统计信息
	- `lsof`命令用于列出打开文件
3. 通过这些命令，获取评估磁盘I/O统计信息中的TPS（每秒传输的I/O操作数），如果过高或者过低，意味着磁盘存在问题

## GC问题导致程序卡顿
不管 Minor GC 还是 FGC，都会造成一定程度的程序卡顿（即Stop The World：GC线程开始工作，其他工作线程被挂起），即使采用 ParNew、CMS 或者G1 这些更先进的垃圾回收算法，也只是在减少卡顿时间，而并不能完全消除卡顿。
1. FGC 过于频繁，FGC 通常比较慢，少则几百毫秒，多则几秒，正常情况FGC 每隔几个小时甚至几天才执行一次，对系统的影响还能接受。
> 一旦出现 FGC 频繁（比如几十分钟执行一次），是存在问题的，会导致工作线程频繁被停止，让系统看起来一直有卡顿现象，也会使得程序的整体性能变差。
2. YGC 耗时过长，一般来说，YGC 的总耗时在几十或者上百毫秒是比较正常的，虽然会引起系统卡顿几毫秒或者几十毫秒，这种情况几乎对用户无感知，对程序的影响可以忽略不计。
> 如果 YGC 耗时达到了 1 秒甚至几秒（都快赶上 FGC 的耗时了），那卡顿时间就会增大，加上 YGC 本身比较频繁，就会导致比较多的服务超时问题。
3. FGC 耗时过长，FGC 耗时增加，卡顿时间也会随之增加，尤其对于高并发服务，可能导致FGC期间比较多的超时问题，可用性降低，这种也需要关注
4. YGC 过于频繁，即使 YGC 不会引起服务超时，但是 YGC 过于频繁也会降低服务的整体性能，对于高并发服务也是需要关注的。
### 如何排查
1. JDK 自带工具：jmap、jstat
2. 查看堆内存各区域的使用率以及 GC 情况：`jstat -gcutil 进程pid 1000` （重点关注结果中的 YGC、YGCT、FGC、FGCT、GCT）
3. 查看堆内存中的存活对象，并按空间排序：`jmap -histo 进程pid | head -n20`
4. dump 堆内存文件：`jmap -dump:format=b,file=heap 进程pid`


## 频率出现FullGC如何排查解决
### 触发FullGC的条件
1. 程序执行了 `System.gc() //建议 jvm 执行 fullgc`，并不一定会执行
2. 执行了`jmap -histo:live pid` 命令 //这个会立即触发 fullgc
3. 在执行 `minor gc` 的时候进行的一系列检查
> 在执行`MinorGC`的时候，JVM会检查老年代中最大连续可用空间是否大于了当前新生代所有对象的总大小，
> 如果大于直接执行`MinorGC`，
> 如果小于了，JVM 会检查是否开启了空间分配担保机制，如果没有开启则直接改为执行 `Full GC`。
> 如果开启了，则 JVM 会检查老年代中最大连续可用空间是否大于了历次晋升到老年代中的平均大小，
> 如果小于则执行改为执行 `Full GC`。
如果大于则会执行 `Minor GC`，如果 `Minor GC` 执行失败则会执行`Full GC`
4. 使用了大对象 //大对象会直接进入老年代

### 调整JVM参数

通常的处理，我们还是要在FULLGC时取到当时的dump文件，来分析内存里都有哪些数据占居着内存。这里有两种办法来获取dump文件：
- 通过在jvm里添加参数配置：`+HeapDumpBeforeFullGC`，`+HeapDumpAfterFullGC` 这种方法需要在应用启动前要提前配置好，如果不需要的话，还需要修改jvm参数重启应用
- 使用jinfo命令进行设置。（生产环境常用的方法）
	1. 获取java的进程id
	2. 调用`jinfo`设置JVM参数，`jinfo -flag +HeapDumpBeforeFullGC 进程pid`和`jinfo -flag +HeapDumpAfterFullGC 进程pid`，使用`jinfo -flags 进程pid`查看是否生效
	3. 下次发送FullGC的时候就会生成dump文件

## 出现OOM问题如何排查
`OutOfMemoryError`属于java中常见的内存问题，oom 出现的原因就是内存不够用了，GC 虽然在回收，然后回收的速度赶不上新对象分配了或者根本就没有对象可以被回收，就会抛出`OutOfMemoryError` 错误，

### 常见的五种OOM错误：
- `java.lang.OutOfMemoryError: Java heap space`
- `java.lang.OutOfMemoryError: unable to create new native thread`
- `java.lang.OutOfMemoryError: Metaspace`
- `java.lang.OutOfMemoryError: Direct buffer memory`
- `java.lang.OutOfMemoryError: GC overhead limit exceeded`


### 如何发现OOM错误
1. 日志监控，通过监控日志中关键字 `java.lang.OutOfMemoryError`，就可以知道应用是否出现oom.对于文件的监控，可以使用 `filebeat` 或者 `flume` 等采集
2. JVM参数配置`-XX:+ExitOnOutOfMemoryError`，**当 jvm 启用该参数时，如果出现了 oom，就会自动退出程序**，咱们的健康检测自然能发现应用不存在了，从而能发出告警
3. 使用 jstat 监控 jvm 内存使用率，通过 jstat 工具可以查看 jvm 的内存使用情况，如果老年代使用率一直是100%，并且期间还在一直不断 GC，这也是发生了 oom 的一种现象，`jstat -gcutil $pid 1000`使用该命令即可实现每秒打印一次 jvm的内存信息。**O列代表老年代内存使用比例，YGC和FGC分别代表新生代GC和老年代GC次数**
![c.png](..%2F..%2F..%2F.vitepress%2Fpublic%2Fimages%2F5b90a102132b452b82208a4e29bbd86d.png)
### 如何保证OOM出现时服务可用
当应用出现 oom 时，意味着应用无法申请到内存来分配对象，那么咱们的业务代码就会处于混沌状态，不清楚能进行到哪一步，不清楚状态是否完备，业务的请求可能在系统无限阻塞。这种情况对于用户体验的伤害会非常大。
所以这里有一个简单的方法就是，配置`-XX:+HeapDumpOnOutOfMemoryError` 参数，当应用发生 oom 后，自动关停，借助 `k8s` 的健康检测实现自动重启能力再次拉起来新的容器。**注意，这里需要实现业务系统能够实现故障转移或者请求幂等。这样才能保证用户请求不会出问题。**

### OOM的解决方案
对于 `unable to create new native thread `、`Metaspace`、`Direct buffer memory`和 `GC overhead limit exceeded`它们的原因相对简单，可以直接给出结论。
- `unable to create new native thread` : **无法创建更多的操作系统线程**
	-  说明当前系统的线程数过多，超过了系统线程数的上限，减少当前应用创建的线程即可。
	- 没有 `native` 内存了
- `Metaspace`**（存储类元数据的内存）**
	-  说明 `Metaspace` 不够用，修改 `-XX:MaxMetaspaceSize` 启动参数，调大永久代空间即可。
- `Direct buffer memory`**（直接缓存区）它允许应用程序直接在堆外内存中分配数据**
	- `Direct ByteBuffer` 的默认大小为 64 MB，一旦使用超出限制，就会抛出`Directbuffer memory` 错误。
- `GC overhead limit exceeded`
	-  当 jvm 98%的时间都在 GC 时，就会出现该异常。这种情况需要增大堆或者结合下面的方法继续排查

当应用发生 oom 后，最佳的分析载体就是 `heap dump`。通过添加`-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp/app.dump`参数，可以实现发送OOM时自动导出`heap dump`，有了 heap dump，我们就可以借助 Eclipse MAT 这款工具来分析heap
dump 了

### 如何规避OOM
oom 发生的原因有两种:
1. 应用正常，但是堆设置过小，无法支持正常的对象分配
	- 增大堆内存
	- 优化应用内存使用效率  
2. 应用发生了内存泄漏，导致应该被清理的对象没有清理，无限增长通过分析 heap dump，我们基本可以区分出两种情况，第一种情况，对象的分布都正确，没有那种以下占用 30%*-，甚至 50%的对象。第二种情况就是某一种类型的对象，占据了大量的内存空间。
	 - 需要针对性分析，这里给出几个常见原因
	 - `ThreadLocal` 未清理
	 - 出现了未指定分页的大数据量查询
	 - 定时任务中 list 忘记清空，每次都追加数据
	 - 监控系统中使用了不可控的字段作为 label,导致 label 无限增长