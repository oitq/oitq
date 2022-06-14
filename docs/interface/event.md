:::warning
非 EventEmitter，事件名称支持使用*做通配符处理
:::
## propertys
| 属性 | 类型 | 描述 |
| ---- | ---- | ---- |
| logger |log4js.Logger | 日志记录器 |
## methods
| 方法 | 参数 | 返回值 | 描述 |
| :--- | :--- | :--- | :--- |
| on | event:`string`,callback:`function` | Dispose | 添加事件监听 |
| emit | event:`string`,data:any | void | 触发事件 |
| off | event:`string` | void | 移除事件监听 |
| once | event:`string`,callback:`function` | Dispose | 添加一次性事件监听 |
| before | event:`string`,callback:`function`| Dispose| 添加事件前置监听 |
| parallel | event:`string`,callback:`function`| Dispose| 添加事件并行监听 |
| bail | event:`string`,data:any | data | 触发事件，在收到第一个返回值时中断 |
