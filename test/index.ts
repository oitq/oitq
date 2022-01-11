import {App} from '../src'
const app=new App()
app.addBot({
    type:'password',
    uin:123456789,
    config:{
        platform:5
    },
    password:'abcdefgh'
})
app.listen(8086)