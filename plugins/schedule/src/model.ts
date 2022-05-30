import {
    DataTypes,
} from "@oitq/service-database";
import {Session} from 'oitq'

export interface Schedule {
    id: number
    time: Date
    lastCall: Date
    interval: number
    command: string
}
export const Schedule={
    assignee:DataTypes.INTEGER,
    time:DataTypes.DATE,
    lastCall:DataTypes.DATE,
    interval:DataTypes.INTEGER,
    command:DataTypes.TEXT,
    session:{
        type:DataTypes.TEXT,
        get(){
            return JSON.parse(this.getDataValue('session')) as Session
        },
        set(value:Session){
            this.setDataValue('session',JSON.stringify(value))
        }
    }
}
