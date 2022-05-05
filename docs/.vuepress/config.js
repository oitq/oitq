module.exports = {
    title: 'oitq',
    base:'/oitq/',
    description: 'Ohh,I tick you!',
    themeConfig: {
        displayAllHeaders: true, // 默认值：false
        activeHeaderLinks: false, // 默认值：true
        lastUpdated: 'Last Updated', // string | boolean
        navbar: [
            {text: '首页', link: '/'},
            {text: '起步', link: '/start/'},
            {text: 'github', link: 'https://github.com/oitq/oitq'}
        ],
        sidebar: [
            {
                text: '起步',   // 必要的
                link: '/start/',      // 可选的, 标题的跳转链接，应为绝对路径且必须存在
                children: [
                    {
                        text: '安装Node.js',
                        link: '/start/node/'
                    },
                    {
                        text: '通过模板项目上手',
                        link: '/start/install/'
                    }
                ]
            }
        ]
    }
}
