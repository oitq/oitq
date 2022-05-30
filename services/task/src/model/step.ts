import {DataTypes} from '@oitq/service-database'
export const TaskStep={
    index:DataTypes.INTEGER,
    template:DataTypes.TEXT
}
export interface TaskStep{
    index:number
    template:string
}
