import {DataTypes} from "sequelize";
import {TableDecl} from "../";
export interface User{
    id:number
    user_id:number
    authority:number
    name:string
    ignore:boolean
}
export const User:TableDecl={
    user_id:DataTypes.DECIMAL,
    authority:DataTypes.INTEGER,
    name:DataTypes.STRING,
    ignore:DataTypes.BOOLEAN
}
