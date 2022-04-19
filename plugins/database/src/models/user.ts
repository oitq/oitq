import {Model, Table, Column, DataType} from "sequelize-typescript";
@Table
export class User extends Model{
    @Column(DataType.DECIMAL)
    user_id:number
    @Column(DataType.INTEGER)
    authority:number
    @Column(DataType.STRING)
    name:string
}
export interface UserInfo{
    id:number
    user_id:number
    authority:number
    name:string
}
