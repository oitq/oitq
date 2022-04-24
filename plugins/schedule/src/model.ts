import {
    Column,
    Default,
    DataType,
    Model,
    Table,
} from "@oitq/plugin-database";
import {Session} from 'oitq'

export interface ScheduleInfo {
    id: number
    time: Date
    lastCall: Date
    interval: number
    command: string
}
@Table
export class Schedule extends Model{
    @Column(DataType.INTEGER)
    assignee:number
    @Column(DataType.DATE)
    time:Date
    @Column(DataType.DATE)
    lastCall:Date
    @Column(DataType.INTEGER)
    interval:number
    @Column(DataType.TEXT)
    command:string
    @Default('{}')
    @Column(DataType.TEXT)
    get session(){
        return JSON.parse(this.getDataValue('session')) as Session
    }
    set session(value){
        this.setDataValue('session',JSON.stringify(value))
    }
}
