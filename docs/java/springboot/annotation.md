# 常用注解

## @SpringBootApplication
定义在main方法入口类处，用于启动sping boot应用项目

由下面的注解组成
- `@SpringBootConfiguration`:组合了 `@Configuration` 注解，实现配置文件的功能。
- `@EnableAutoConfiguration`:打开自动配置的功能，也可以关闭某个自动配置的选项。
- `@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class })`
- `@ComponentScan`Spring组件扫描


## @ImportResource

加载xml配置文件，一般是放在启动main类上
```java
@ImportResource("classpath*:/spring/*.xml")  //单个

@ImportResource({"classpath*:/spring/1.xml","classpath*:/spring/2.xml"})   //多个

```

## @Value

application.properties定义属性，直接使用@Value注入即可
```java
public class A{
	 @Value("${config.id:0}")    //如果缺失，默认值为0
     private Long  id;
}
```


## @ConfigurationProperties(prefix="person")

可以新建一个properties文件，ConfigurationProperties的属性prefix指定properties的配置的前缀，通过location指定properties文件的位置

```java
@ConfigurationProperties(prefix="person") //指定配置的前缀
public class PersonProperties {
	private String name ;
	private int age;
}

```

## @RestController

组合`@Controller`和`@ResponseBody`，当你开发一个和页面交互数据的控制时，比如xxx-web的api接口需要此注解

## @RequestMapping("/api2/copper")

用来映射web请求(访问路径和参数)、处理类和方法，可以注解在类或方法上。注解在方法上的路径会继承注解在类上的路径。
- value熟悉：映射的访问路径
- produces属性: 定制返回的response的媒体类型和字符集，或需返回值是json对象

```java
@RequestMapping(value="/api2/copper",produces="application/json;charset=UTF-8",method = RequestMethod.POST)
```

## @Bean

@Bean(name="bean的名字",initMethod="初始化时调用方法名字",destroyMethod="close")

```java
@Bean(destroyMethod="close")
@ConditionalOnMissingBean
public PersonService registryService() {
		return new PersonService();
	}
```

## @Component
泛指组件，将类交给spring进行管理和调用


## @PostConstruct

spring容器初始化时，要执行该方法
```java
@PostConstruct  
public void init() {   
}   
```

## @Order

`@Order(1)`，值越小优先级超高，越先运行

