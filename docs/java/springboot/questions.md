# 常见问题

## SpringBoot自动配置原理
`@EnableAutoConfiguration `(开启自动配置) 该注解引入了`AutoConfigurationImportSelector`，该类中
的方法会扫描所有存在`META-INF/spring.factories`的jar包。

## SpringBoot的配置文件可以