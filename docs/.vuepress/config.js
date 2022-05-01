module.exports={
    title: 'oitq',
    description: 'Ohh,I tick you!',
    themeConfig: {
        displayAllHeaders: true, // 默认值：false
        activeHeaderLinks: false, // 默认值：true
        lastUpdated: 'Last Updated', // string | boolean
        nav: [
            { text: '首页', link: '/' },
            { text: '起步', link: '/start/' },
            { text: 'github', link: 'https://github.com/oitq/oitq' }
        ],
        sidebar: [
            {
              title:'首页',
              path: '/'
            },
            {
                title: '起步',   // 必要的
                path: '/start/',      // 可选的, 标题的跳转链接，应为绝对路径且必须存在
                collapsable: false, // 可选的, 默认值是 true,
                sidebarDepth: 1,    // 可选的, 默认值是 1
                children: [
                    {
                      title:'安装Node.js',
                        path: '/start/node'
                    },
                    {
                        title:'通过模板项目上手',
                        path:'/start/install'
                    },{

                    }
                ]
            },
            {
                title: '编写插件',
                children: [
                    /* ... */
                ],
                initialOpenGroupIndex: -1 // 可选的, 默认值是 0
            }
        ]
    }
}
