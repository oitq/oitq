import {DataTypes,Model} from '@oitq/service-database'
export const Task={
    name:DataTypes.STRING,
    desc:DataTypes.TEXT,
    creator:DataTypes.BIGINT
}
export interface Task{
    id:number
    name:string
    desc:string
    creator:number
}
