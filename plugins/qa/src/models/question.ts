import {Table,
    Column,
    Default,
    DataType,
    Model,} from "@oitq/plugin-database";
@Table({modelName:'QA'})
export class QA extends Model{
    @Column(DataType.TEXT)
    question:string
    @Column(DataType.TEXT)
    answer:string
    @Column(DataType.BOOLEAN)
    isReg:boolean
    @Default(1)
    @Column(DataType.FLOAT)
    probability:number
    @Column(DataType.TEXT)
    get belongs(){
        const str=this.getDataValue('belongs')||''
        if(!str) return []
        return str.split(',').map(str=>{
            const [type,target]=str.split(':')
            return {type,target}
        })
    }
    set belongs(data:{type,target}[]){
        const belongs=data.map(item=>`${item.type}:${item.target}`).join(',')
        this.setDataValue('belongs',belongs)
    }
    @Column(DataType.TEXT)
    redirect:string
}
export interface QAInfo{
    question:string
    answer:string
    isReg:boolean
    probability:number
    redirect:string
    belongs: { type:string,target:string }[]
}
