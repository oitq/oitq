module.exports = {
    title: 'oitq开发文档',
    description: '优雅、轻量，简洁',
    lastUpdated: true,
    themeConfig:{
        repo: 'oitq/oitq',
        docsDir: 'docs',
        docsBranch: 'v2',
        editLinks: true,
        editLinkText: '在Github上编辑此页面',
        lastUpdated: '最近更新时间',
        nav: [
            { text: '开始', link: '/start/.', activeMatch: '^/$|^/start/' },
            {
                text: '配置',
                link: '/config/',
                activeMatch: '^/config/'
            },
            {
                text: '插件',
                link:'/plugins/',
                activeMatch: "^/plugins/",
            },
            {
                text: 'API',
                link: '/api/',
                activeMatch: '^/api/'
            },
            {
                text: 'Release',
                link: 'https://github.com/oitq/oitq/releases'
            }
        ],
        sidebar: {
            '/start/': [
                {
                    text: '快速上手',
                    children: [
                        { text: '安装', link: '/install' },
                        {
                            text: '以服务提供者工作', link: '/start/server',
                        },
                        { text: '以插件开发框架工作', link: '/start/framework' },
                        { text: '部署', link: '/start/deploy' },
                    ]
                }
            ],
            '/config/': [
                {
                    link:'/config/app',
                    text: 'App Config',
                },
                {
                    link:'/config/bot',
                    text: 'Bot Config',
                }
            ],
            '/plugins/': [
                {
                    link:'/plugins/database',
                    text: '数据库服务',
                },
                {
                    link:'/config/qa',
                    text: '问答系统',
                },
                {
                    link:'/config/admin',
                    text: '管理',
                },
                {
                    link:'/config/common',
                    text: '基础功能',
                },
                {
                    link:'/config/utils',
                    text: '工具',
                },
                {
                    link:'/config/rss',
                    text: 'Rss',
                }
            ],
        }

    }
}
