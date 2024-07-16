# Java场景题（一）
## 订单未支付过期如何实现自动关单？
问题描述：外卖订单超 30 分钟未支付，则自动取订单；用户注册成功 15 分钟后，发短信息通知用户等等。这就延时任务处理场景。
### 定时任务
通过`定时任务`去关闭，成本低也容易实现的方案，写一个定时任务，定期扫描数据库中的订单，如果时间国企，就将其状态更新为关闭即可
> 这种方法实现容易，不依赖其他组件，但是时间可能不够精确，因为定时任务扫描间隔是固定的，所以造成一些订单过了一段时间才能被扫描到，订单关闭时间也比正常时间晚一点，也增加了数据库压力
> 适用于对时间要求不敏感，并且数据量不多的业务场景

### JDK延时队列（DelayQueue）
`DelayQueue` 是 JDK 提供的一个无界队列，我们可以看到，`DelayQueue `队列中的元素需要实现 Delayed，它只提供了一个方法，就是获取过期时间。
![c.png](..%2F..%2F..%2F.vitepress%2Fpublic%2Fimages%2Fa54024037a48436c9ff6d4b8b8a9ce17.png)
用户的订单生成以后，设置过期时间比如 30 分钟，放入定义好的`DelayQueue `，然后创建一个线程，在线程中通过 while(true)不断的从 `DelayQueue `中获取过期的数据。
> 同样不依赖其他组件，同时也不需要增加数据库压力，实现起来也较为简单方便，**由于`DelayQueue`是一个无界队列，如果放入的订单过多的话，就会造成JVM的OOM，因为`DelayQueue`是基于JVM内存的，如果JVM重启了，那么所有的数据就丢失了**
> 所以适用于数据量小，且丢失也不会影响主业务的场景

### `redis`过期监听
redis本身除了缓存以外，也提供了过期监听功能。
> 在 `redis.conf`中，配置 `notify-keyspace-events Ex` 即可开启此功能。

在项目的`RedisConfig`中配置`Message Listener Containers`（消息订阅者容器）
类似于Redis pub/sub 中 Message Listener Containers 的配置，区别少了监听器的指定。
```java
  @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory redisConnectionFactory) {
        // redis 消息订阅(监听)者容器
        RedisMessageListenerContainer messageListenerContainer = new RedisMessageListenerContainer();
        messageListenerContainer.setConnectionFactory(redisConnectionFactory);
        // messageListenerContainer.addMessageListener(new ProductUpdateListener(), new PatternTopic("*.product.update"));
        return messageListenerContainer;
    }
```

然后创建自定义的监听器
代码实现时需要继承`KeyspaceEventMessageListener`，实现`onMessage()`方法，就可以监听过期的数据量
```java
@Component
public class RedisKeyExpirationListener extends KeyExpirationEventMessageListener {

    /**
     * 创建RedisKeyExpirationListener bean时注入 redisMessageListenerContainer
     *
     * @param redisMessageListenerContainer RedisConfig中配置的消息监听者容器bean
     */
    public RedisKeyExpirationListener(RedisMessageListenerContainer redisMessageListenerContainer) {
        super(redisMessageListenerContainer);
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel()); // __keyevent@*__:expired
        String pa = new String(pattern); // __keyevent@*__:expired
        String expiredKey = message.toString();
        System.out.println("监听到过期key：" + expiredKey);
    }
}
```
> 这个方案通过使用`redis`，保证设置key或者消费key的时候，速度可以保证；**由于`redis`的key过期策略的原因，当一个key过期时，`redis`不能保证立刻删除，导致监听事件不能第一时间消费这个key，所以出现延迟**

>  `redis`过期策略：
> - 定期选取部分数据删除。
>  - 惰性删除。
### Redisson分布式延迟队列
`Redisson` 除了提供我们常用的分布式锁外，还提供了一个分布式延迟队列`RDelayedQueue`，他是一种基于 `zset` 结构实现的延迟队列，其实现类是`RedissonDelayedQueue`
> 使用简单，实现类里面用了较多的`lua`脚本保证原子性，不会有并发问题

### RocketMQ 延迟消息
> 延迟消息，当消息写入到 Broker 后，不会立刻被消费者消费，需要等待指定的时长后才可被消费处理的消息，称为延时消息。

在订单创建之后，我们就可以把订单作为一条消息投递到 `rocketmq`，并将延迟时间设置为 30 分钟，这样，30 分钟后我们定义的 `consumer` 就可以消费到这条消息，然后检查用户是否支付了这个订单。
通过延迟消息，我们就可以将业务解耦，极大地简化我们的代码逻辑。
> 相对来说 mq 是重量级的组件，引入 mq 之后，随之而来的消息丢失、幂等性问题等都加深了系统的复杂度。
通过 mq 进行系统业务解耦，以及对系统性能削峰填谷已经是当前高性能系统的标配。
## 百万级别数据的Excel如何快速导入到数据库中
### 确认导入细节
- 数据导入：导入模板由系统提供，格式是`xlsx`（支持65535+行数据）还是`csv`格式
- 数据校验：
	- 字段长度、字段正则表达式校验；（内存内校验，性能影响较小）
	- 数据重复性校验；（需要查询数据库，十分影响性能）
- 数据插入：未分库分表
### V1方案：POI + 逐行查询校对 + 逐行插入
这个版本是最古老的版本，采用原生 POI，手动将 Excel 中的行映射成ArrayList 对象，然后存储到 List，代码执行的步骤如下：
1. 手动读取 Excel 成 List
2. 循环遍历，在循环中进行以下步骤
3. 检验字段长度
4. 一些查询数据库的校验，查询对应业务表是否存在
5. 写入当前行数据
6. 返回执行结果，如果出错 / 校验不合格。则返回提示信息并回滚数据

这样实现一定是赶工赶出来的，后续可能用的少也没有察觉到性能问题
最多适用于个位数/十位数级别的数据。

**存在以下明显的问题：**
**1. 查询数据库的校验对每一行数据都要查询一次数据库，应用访问数据库来回的网络IO次数被放大了 n 倍，时间也就放大了 n 倍
2. 写入数据也是逐行写入的，问题和上面的一样
3. 数据读取使用原生 POI，代码十分冗余，可维护性差**

### V2方案 EasyPOI + 缓存数据库查询操作 + 批量插入
针对V1方案做以下优化
1. 缓存数据，以空间换时间
将数据库需要对比的数据进行缓存到`HashMap`或者其他容器中，以对于的业务查询需求的字段作为key，后续校验只需要检查是否在`HashMap`中命中key
2. 将对比好的数据使用批量插入，例如每30000行拼接一个长SQL进行批量插入

### V3方案 优化数据插入速度
在V2的批量插入基础上使用每30000 行拼接一个长 SQL、顺序插入的话，整个导入方法这块耗时最多，非常拉跨。
后来我将每次拼接的行数减少到 10000、5000、3000、1000、500 发现执行最快的是1000。
结合网上一些对 innodb_buffer_pool_size 描述我猜是因为过长的 SQL 在写操作的时候由于超过内存阈值，发生了磁盘交换。
每次 1000 条插入后，为了榨干数据库的 CPU，那么网络 IO 的等待时间就需要利用起来，这个需要多线程来解决，而最简单的多线程可以使用并行流`parallelStream `实现
> 提升 Excel 导入速度的方法：
**1.使用更快的 Excel 读取框架(推荐使用阿里 EasyExcel)
2.对于需要与数据库交互的校验、按照业务逻辑适当的使用缓存。用空间换时间
3.使用 values(),(),() 拼接长 SQL 一次插入多行数据
4.使用多线程插入数据，利用掉网络 IO 等待时间(推荐使用并行流，简单易用)
5.避免在循环中打印无用的日志**




