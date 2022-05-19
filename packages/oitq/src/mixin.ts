export function Mixin(...mixins: Array<new (...args: any[]) => any>): new (...args: any[]) => any {
    return mixins.reduce((prev, cur) => __extends(prev,cur), class {});
}
export default Mixin
function __extends(base: MixinFunction, mixin: MixinFunction): MixinFunction {
    const mixedClass = class {
        constructor() {
            return mixin.apply(base.apply(this, arguments) || this, arguments);
        }
    };
    void Object.assign(mixedClass.prototype, mixin.prototype, base.prototype);
    for (const p in base) if (base.hasOwnProperty(p)) mixedClass[p] = base[p];
    for (const p in mixin) if (mixin.hasOwnProperty(p)) mixedClass[p] = mixin[p];

    return mixedClass;
}

interface MixinFunction {
    new (...args: any[]): any;
}
