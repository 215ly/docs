import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "LiYiDocs",
    description: "LiYiDocs",
    head: [['link', {rel: 'icon', href: '/favicon.ico'}]],
    base:'/215ly/docs/',
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
            {text: '后端系列', link: '/docs/java/thread/ThreadPool'},
        ],

        sidebar: {
            '/docs/java/': [
                {
                    text: '线上问题处理',
                    collapsed: false,
                    items: [
                        {text: '问题记录', link: 'docs/java/online/questions'},
                    ]
                },
                {
                    text: 'Java场景题',
                    collapsed: false,
                    items: [
                        {text: '场景题（一）', link: 'docs/java/scenario/questions'},
                    ]
                },
                {
                    text: '多线程&并发编程',
                    collapsed: false,
                    items: [
                        {text: '线程池最佳实践', link: '/docs/java/thread/ThreadPool'},
                    ]
                }
            ],
        },

        socialLinks: [
            {icon: 'github', link: 'https://gitee.com/liyi2020'}
        ]
    }
})
