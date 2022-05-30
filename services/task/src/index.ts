import {Service,Plugin} from "oitq";
import {TaskStep, Task} from "./model";
declare module 'oitq'{
    namespace Plugin{
        interface Services{
            tasks:Tasks
        }
    }
}
export default class Tasks extends Service{
    static using:readonly (keyof Plugin.Services)[]=['database']
    constructor(plugin:Plugin) {
        super(plugin,'tasks',true);
        plugin.app.before('database.ready',()=>{
            plugin.database.define('Task',Task)
            plugin.database.define('TaskStep',TaskStep)
        })
        plugin.app.before('database.sync',()=>{
            const {Task,TaskStep}=plugin.database.models
            Task.hasMany(TaskStep)
            TaskStep.belongsTo(Task)
        })
    }
}
