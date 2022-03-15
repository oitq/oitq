import {App,cwd} from '../src'
const app=new App({
    bots:[
        {
            type:'password',
            uin:123456789,
            config:{
                platform:5
            },
            oneBot:true,
            password:'abcdefghigklmn'
        }
    ]
})
app.listen(8086)