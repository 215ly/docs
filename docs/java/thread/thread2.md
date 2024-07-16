# 一、CyclicBarrier、CountDownLatch、Semaphore的区别
- `CyclicBarrier`的某个线程运行到某个点上之后，该线程即停止运行，直到所有的线程都到达了这个点，所有线程才重新运行（**类似于一个栅栏拦住所有线程直到所有线程到达后在重新执行**）
- `CountDownLatch`则不是，某线程运行到某个点上之后，只是给某个数值-1而已，该线程继续运行
- `CyclicBarrier`只能唤起一个任务，CountDownLatch可以唤起多个任务
- `CyclicBarrier`可重用，CountDownLatch不可重用，计数值为0该CountDownLatch就不可再用了

# 二、线程的生命周期和状态
1. `new`：初始状态，表示线程被创建出来了，但是还没有调用`start()`方法
2. `runnable`：就绪状态，线程调用`start()`方法后，**该状态的线程等待被线程调度选中，获取CPU的使用权。**
3. `running`：运行状态，就绪状态的线程获取到CPU时间片开始执行
4. `blocked`：阻塞状态，阻塞状态是指线程因为某种原因让出了CPU使用权，直到线程再次进入就绪状态`runnable`，等待再次获取CPU时间片进入运行状态或是等待锁释放。
5. `waiting`：等待状态，表示该线程需要等待其他线程做出一些特定动作（通知或中断）例如：`wait()`方法之后，依靠其他线程的通知才能够返回到运行状态
6. `time_waiting`：超时等待状态，可以在指定时间后自行变为运行状态，而不是像`watting`一直等待。例如：`sleep(long millis)`或者`wait(long millis)`方法
7. `TERMINATED`：表示线程已经运行完毕或者出现异常中止运行
## 阻塞状态出现的几种情况
1. **等待阻塞**：运行的线程执行`wait()`方法，JVM就会把当前线程放入到等待队列
2. **同步阻塞**：运行的线程在获取对象的同步锁时，该对象被其他线程锁占用了，那么JVM就会把这个线程放入锁池中
3. **其他阻塞**：例如执行`Thread.sleep`或者`join`方法，或者发出了IO请求时，JVM会把当前线程设置为阻塞状态，当`sleep`结束或者`join`线程终止或者IO处理完毕则线程恢复
> `join()`方法是用于将一个线程加入到当前线程，并且让当前线程等待被加入线程执行完成后再继续执行。


# 三、虚拟线程
虚拟线程是JDK而不是操作系统实现的轻量级线程，由JVM进行调度，许多虚拟线程共享同一个操作系统的线程，所以虚拟线程的数量可以远远大于操作系统的线程数量

## 如何使用虚拟线程
### 使用`Thread.startVirtualThread()`方法创建

```java
public class VirtualThreadTest {
  public static void main(String[] args) {
    CustomThread customThread = new CustomThread();
    // 创建虚拟线程并启动
    Thread.startVirtualThread(customThread);
  }
}

static class CustomThread implements Runnable {
  @Override
  public void run() {
    System.out.println("CustomThread run");
  }
}
```

### 使用`Thread.ofVirtual()`创建
```java
public class VirtualThreadTest {
  public static void main(String[] args) {
    CustomThread customThread = new CustomThread();
    // 创建不启动
    Thread unStarted = Thread.ofVirtual().unstarted(customThread);
    unStarted.start();
    // 创建直接启动
    Thread.ofVirtual().start(customThread);
  }
}
static class CustomThread implements Runnable {
  @Override
  public void run() {
    System.out.println("CustomThread run");
  }
}
```

### 使用`ThreadFactory`创建
```java
public class VirtualThreadTest {
  public static void main(String[] args) {
    CustomThread customThread = new CustomThread();
    ThreadFactory factory = Thread.ofVirtual().factory();
    Thread thread = factory.newThread(customThread);
    thread.start();
  }
}

static class CustomThread implements Runnable {
  @Override
  public void run() {
    System.out.println("CustomThread run");
  }
}


```
### 使用`Executors.newVirtualThreadPerTaskExecutor()`创建
```java
public class VirtualThreadTest {
  public static void main(String[] args) {
    CustomThread customThread = new CustomThread();
    ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    executor.submit(customThread);
  }
}
static class CustomThread implements Runnable {
  @Override
  public void run() {
    System.out.println("CustomThread run");
  }
}

```

# 四、CAS是什么
CAS是compare and swap的缩写，即我们所说的比较交换。cas是一种基于锁的操作，而且是乐观锁
> **CAS操作包含三个操作数：内存位置，预期原值，新值**。

CAS通过无限循环来获取数据的，**如果内存地址里面的值和预期原值是一样的，那么就将内存里面的值更新成B**
CAS通过无限循环来获取数据，当第一轮循环线程A中的值被B线程改了，那么A线程就需要自选，直到下次循环才有可能有机会执行

## ABA问题
**问题描述：**一个线程A需要将数值改成a，那么在线程执行过程中了中间改成了b，紧接着又改成了a，此时CAS就会认为是没有发生变化的，其实早已经变化过了
> 可以通过添加版本号标识来区分，每次操作version加1

### CAS在Java中的应用：

Java中的`java.util.concurrent.atomic`包提供了大量的原子类，如`AtomicInteger、AtomicLong、AtomicReference`等，这些类内部都使用了CAS操作来实现线程安全的原子操作。此外，Java的并发工具类如`CountDownLatch、Semaphore、CyclicBarrier`等也可能间接地使用了CAS操作来实现无锁并发控制。


# 五、ThreadLocal
通常情况下，我们创建的变量是可以被任何一个线程访问并修改的。
> 如果想实现每一个线程都有自己的专属本地变量该如何解决呢？
> JDK 中自带的ThreadLocal类正是为了解决这样的问题。

`ThreadLocal`类主要解决的就是让每个线程绑定自己的值，可以将ThreadLocal类形象的比喻成存放数据的盒子，盒子中可以存储每个线程的私有数据。
## ThreadLoacl原理
1. 当调用`ThreadLocal`的`set()、get()`时本质上是调用内部的 ` ThreadLoaclMap`对应的`set()、get()`方法
2. 所以最终变量放在了`ThreadLoaclMap`里面
> ThreadLoaclMap可以理解为ThreadLoacl类实现的定制化的一个HashMap。
3. `ThrealLocal` 类中可以通过`Thread.currentThread()`获取到当前线程对象后，直接通过`getMap(Thread t)`可以访问到该线程的`ThreadLocalMap`对象
4. 每一个ThreadLoacl都具备一个ThreadLoaclMap，而ThreadLoaclMap可以存储以ThreadLoacl为Key，Object对象为Value的键值对。

## ThreadLoacl内存泄漏的问题是怎么造成的？
`ThreadLocalMap` 中使用的 key 为 `ThreadLocal `的弱引用，而 value 是强引用。所以，如果`ThreadLocal `没有被外部强引用的情况下，在垃圾回收的时候，key 会被清理掉，而 value 不会被清理掉。

这样一来，ThreadLocalMap 中就会出现 key 为 null 的 Entry。
假如我们不做任何措施的话，value 永远无法被 GC 回收，这个时候就可能会产生内存泄露。

> ThreadLocalMap 实现中已经考虑了这种情况，在调用 set()、get()、remove() 方法的时候，会清理掉 key 为 null 的记录。
> 使用完 ThreadLocal方法后最好手动调用remove()方法
