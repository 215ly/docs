import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "LiYiDocs",
    description: "LiYiDocs",
    head: [['link', {rel: 'icon', href: '/favicon.ico'}]],
    base:'/docs/',
    lastUpdated: true, // 最新更新时间戳
    themeConfig: {
        search: {
            provider: 'local'
        },
        lastUpdatedText: "最后更新", // string
        // 编辑链接
        editLink: {
            pattern: "https://gitee.com/liyi2020/docs", // 自己项目仓库地址
            text: "在 gitee 上编辑此页",
        },
        // 右侧边栏配置，默认值是"In hac pagina"
        outlineTitle: "本页目录",

        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: '首页', link: '/'},
            {
                text: 'Java',
                items: [
                  { text: '并发编程', link: '/docs/java/thread/thread1' },
                  { text: 'JVM', link: '/docs/java/jvm/jvm1' },
                  { text: '线上问题', link: '/docs/java/online/questions' },
                  { text: '场景题', link: '/docs/java/scenario/questions' },
                ]
            },
            {
                text: 'Spring',
                items: [
                    { text: 'Spring', link: '/docs/java/springboot/annotation' },
                    { text: 'SpringBoot', link:'/docs/java/springboot/annotation' },
                  ]
                
            }
        ],

        sidebar: {
            '/docs/java/online/': [
                {
                    text: '线上问题',
                    collapsed: false,
                    items: [
                        {text: '问题记录', link: '/docs/java/online/questions'},
                    ]
                },
            ],
            '/docs/java/scenario/': [
                {
                    text: 'Java场景题',
                    collapsed: false,
                    items: [
                        {text: '场景题（一）', link: '/docs/java/scenario/questions'},
                    ]
                },
            ],
            '/docs/java/thread/': [
                {
                    text: '多线程&并发编程',
                    collapsed: false,
                    items: [
                        {text: '知识点（一）', link: '/docs/java/thread/thread1'},
                        {text: '知识点（二）', link: '/docs/java/thread/thread2'},
                        {text: '线程池最佳实践', link: '/docs/java/thread/ThreadPool'},
                    ]
                }
            ],
            '/docs/java/jvm/': [
                {
                    text: 'JVM理论知识补充',
                    collapsed: false,
                    items: [
                        {text: '理论补充（一）', link: '/docs/java/jvm/jvm1'},
                        {text: '理论补充（二）', link: '/docs/java/jvm/jvm2'},
                    ]
                }
            ],
            '/docs/java/springboot/': [
                {
                    text: 'SpringBoot',
                    collapsed: false,
                    items: [
                        { text: '常见注解', link: '/docs/java/springboot/annotation' },
                        { text: '项目规范', link: '/docs/java/springboot/projectSpecifications' },
                        { text: '相关问题', link: '/docs/java/springboot/questions' },
                    ]
                }
            ],
        },

        socialLinks: [
            {icon: 'github', link: 'https://github.com/215ly'}
        ]
    }
})
