import {defineConfig} from "vitepress";

module.exports = defineConfig({
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
                    text: 'Interface',
                    link: '/interface/',
                    activeMatch: '^/interface/'
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
                        link:"/start/",
                        children: [
                            { text: '安装', link: '/start/install' },
                            { text: '以服务提供者工作', link: '/start/server' },
                            { text: '以插件开发框架工作', link: '/start/framework' },
                            { text: '编写插件', link: '/start/plugin' },
                            { text: '部署', link: '/start/deploy' },
                        ]
                    }
                ],
                '/config/': [
                    {
                        text:'配置',
                        link:'/config/',
                        children:[
                            {
                                link:'/config/app',
                                text: '框架配置',
                            },
                            {
                                link:'/config/bot',
                                text: '机器人配置',
                            }
                        ]
                    }
                ],
                '/interface/':[
                    {
                        text:'Interface',
                        link:'/interface/',
                        children:[
                            {
                                text:'App',
                                link:'/interface/app'
                            },
                            {
                                text:'Bot',
                                link:'/interface/bot'
                            },
                            {
                                text:'Plugin',
                                link:'/interface/plugin'
                            },
                            {
                                text:'Session',
                                link:'/interface/session'
                            }
                        ]
                    }
                ],
                '/plugins/':[
                    {
                        text:'插件',
                        link:'/plugins/',
                        children: [
                            {
                                link:'/plugins/database',
                                text: '数据库服务',
                            },
                            {
                                link:'/plugins/qa',
                                text: '问答系统',
                            },
                            {
                                link:'/plugins/admin',
                                text: '管理',
                            },
                            {
                                link:'/plugins/common',
                                text: '基础功能',
                            },
                            {
                                link:'/plugins/utils',
                                text: '工具',
                            },
                            {
                                link:'/plugins/rss',
                                text: 'Rss',
                            }
                        ]
                    }
                ],
            }

        }
    }
)
