import {Plugin,Random} from "oitq";
export function install(plugin:Plugin){
    const p=plugin.command('utils/math/math.random','message')
        .desc('随机数计算')
        .action(()=>{
            return Math.random().toString()
        })
    p.subcommand('random.int <min:integer> [max:integer]','message')
        .desc('在指定范围生成随机数,未传max时，min为0，max为min')
        .action((_,min,max)=>{
            if(!max&&min!==undefined){
                max=min;min=0
            }
            return Random.int(min,max).toString()
        })
    p.subcommand('random.boolean','message')
        .alias('random.bool')
        .option('probability',' -p <probability:number> 可选，概率，默认0.5',{initial:0.5})
        .desc('生成随机布尔值')
        .action(({options:{probability}})=>{
            return Random.bool(probability).toString()
        })
}
