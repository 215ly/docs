# 线程池的最佳实践方式和注意事项
## 一、使用正确的声明方式
线程池必须手动通过`ThreadPoolExecutor` 的构造函数来声明，避免使用`Executors`类创建线程池，会有 OOM 风险。

`Executors`创建的线程池对象有以下弊端：
1. `FixedThreadPool`和`SingleThreadExecutor`使用的是有界阻塞队列`LinkedBlockingQueue`，任务队列的默认长度和最大长度为`Integer.MAX_VALUE`，可能堆积大量的请求，从而导致OOM
2. `CachedThreadPool`使用的是同步队列`SysnchronousQueue`，允许创建的线程数量为最大长度为`Integer.MAX_VALUE`，可能导致会创建大量线程，从而导致OOM
3. `ScheduledThreadPool `和 `SingleThreadScheduledExecutor` : 使用的无界的延迟阻塞队列`DelayedWorkQueue`，任务队列最大长度为 `Integer.MAX_VALUE`，可能堆积大量的请求，从而导致 OOM。
> **说白了就是，使用有界队列，然后控制线程创建数量**

## 二、不同业务使用不同的线程池
很多人在实际项目中都会有类似这样的问题：我的项目中多个业务需要用到线程池，是为每个线程池都定义一个还是说定义一个公共的线程池呢？

**一般建议是不同的业务使用不同的线程池**，配置线程池的时候根据当前业务的情况对当前线程池进行配置，**因为不同的业务的并发以及对资源的使用情况都不同，重心优化系统性能瓶颈相关的业务**。

## 三、监控线程池的状态
你可以通过一些手段来检测线程池的运行状态比如 SpringBoot 中的 Actuator 组件。

除此之外，我们还可以利用 `ThreadPoolExecutor `的相关 API 做一个简陋的监控。从下图可以看出， `ThreadPoolExecutor`提供了获取线程池当前的线程数和活跃线程数、已经执行完成的任务数、正在排队中的任务数等等。
![c.png](images%2Fc.png)
## 四、线程池的正确命名
初始化线程池的时候需要显示命名（设置线程池名称前缀），有利于定位问题。

默认情况下创建的线程名字类似 `pool-1-thread-n` 这样的，没有业务含义，不利于我们定位问题。

```java
/**
 * 自定义线程工厂，用来自定义线程池中的命名
 */
public class CustomThreadFactory implements ThreadFactory {
    private final AtomicInteger threadNumber = new AtomicInteger(1);
    private final String threadNamePrefix;

    public CustomThreadFactory(String threadNamePrefix) {
        this.threadNamePrefix = threadNamePrefix;
    }

    @Override
    public Thread newThread(Runnable r) {
        Thread t = new Thread(r, threadNamePrefix + "-" + threadNumber.getAndIncrement());
        return t;
    }
}

```

创建时调用
```java
ThreadPoolExecutor threadPoolExecutor = new ThreadPoolExecutor(
                CORE_POOL_SIZE,
                MAX_POOL_SIZE,
                KEEP_ALIVE_TIME,
                TimeUnit.SECONDS,
                new ArrayBlockingQueue<Runnable>(QUEUE_CAPACITY), // 有界阻塞队列
                new CustomThreadFactory("custom-thread-pool"),
                new ThreadPoolExecutor.CallerRunsPolicy());
```

## 五、正确配置线程池参数
> 线程数更严谨的计算的方法应该是：**最佳线程数 = N（CPU 核心数）∗（1+WT（线程等待时间）/ST（线程计算时间）），其中 WT（线程等待时间）=线程运行总时间 - ST（线程计算时间）**


也可以使用一些开源项目

- `Hippo4j`：异步线程池框架，支持线程池动态变更&监控&报警，无需修改代码轻松引入。支持多种使用模式，轻松引入，致力于提高系统运行保障能力
- `Dynamic` ：轻量级动态线程池，内置监控告警功能，集成三方中间件线程池管理，基于主流配置中心（已支持 Nacos、Apollo，Zookeeper、Consul、Etcd，可通过 SPI 自定义实现）

## 六、正确关闭线程池
线程池提供了两个关闭方法：
- `shutdown（）` :关闭线程池，线程池的状态变为 SHUTDOWN。线程池不再接受新任务了，但是队列里的任务得执行完毕。
- `shutdownNow（）` :关闭线程池，线程池的状态变为 STOP。线程池会终止当前正在运行的任务，停止处理排队的任务并返回正在等待执行的 List。

**调用完 shutdownNow 和 shuwdown 方法后，并不代表线程池已经完成关闭操作，它只是异步的通知线程池进行关闭处理。**
如果要同步等待线程池彻底关闭后才继续往下执行，需要调用awaitTermination方法进行同步等待。

```java
// ...
// 关闭线程池
executor.shutdown();
try {
    // 等待线程池关闭，最多等待5分钟
    if (!executor.awaitTermination(5, TimeUnit.MINUTES)) {
        // 如果等待超时，则打印日志
        System.err.println("线程池未能在5分钟内完全关闭");
    }
} catch (InterruptedException e) {
    // 异常处理
}

```

## 七、Spring中使用线程池的配置参考
```java
@Configuration
@EnableAsync
public class ThreadPoolExecutorConfig {

    @Bean(name="threadPoolExecutor")
    public Executor threadPoolExecutor(){
        ThreadPoolTaskExecutor threadPoolExecutor = new ThreadPoolTaskExecutor();
        int processNum = Runtime.getRuntime().availableProcessors(); // 返回可用处理器的Java虚拟机的数量
        int corePoolSize = (int) (processNum / (1 - 0.2));
        int maxPoolSize = (int) (processNum / (1 - 0.5));
        threadPoolExecutor.setCorePoolSize(corePoolSize); // 核心池大小
        threadPoolExecutor.setMaxPoolSize(maxPoolSize); // 最大线程数
        threadPoolExecutor.setQueueCapacity(maxPoolSize * 1000); // 设置线程池任务队列的容量为最大线程数的1000倍
        threadPoolExecutor.setThreadPriority(Thread.MAX_PRIORITY); //设置线程池中线程的优先级为最高
        threadPoolExecutor.setDaemon(false); //设置线程池中的线程不是守护线程。这意味着应用程序不会在所有非守护线程结束时立即退出
        threadPoolExecutor.setKeepAliveSeconds(300);// 线程空闲时间
        threadPoolExecutor.setThreadNamePrefix("test-Executor-"); // 线程名字前缀
        return threadPoolExecutor;
    }
}

```