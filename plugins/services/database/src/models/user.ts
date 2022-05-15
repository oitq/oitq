import {Model, Table, Column, DataType} from "sequelize-typescript";
@Table({modelName:'User'})
export class User extends Model{
    @Column(DataType.DECIMAL)
    user_id:number
    @Column(DataType.INTEGER)
    authority:number
    @Column(DataType.STRING)
    name:string
    @Column(DataType.BOOLEAN)
    ignore:boolean
}
export interface UserInfo{
    id:number
    user_id:number
    authority:number
    name:string
    ignore:boolean
}
