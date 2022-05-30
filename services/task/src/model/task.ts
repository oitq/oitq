import {DataTypes} from '@oitq/service-database'
export const Task={
    name:DataTypes.STRING,
    desc:DataTypes.TEXT,
    creator:DataTypes.INTEGER
}
export interface Task{
    name:string
    desc:string
    creator:number
}
