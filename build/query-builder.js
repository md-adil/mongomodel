"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pagination_1 = __importDefault(require("./pagination"));
class QueryBuilder {
    // eslint-disable-next-line no-shadow
    constructor(Model) {
        this.Model = Model;
        this._query = {};
        this._options = {};
        this.hasObserver = true;
    }
    noObserve() {
        this.hasObserver = false;
        return this;
    }
    get query() {
        return this._query;
    }
    get options() {
        return this._options;
    }
    async find() {
        const querybuilder = this.Model.collection.find(this._query, this._options);
        const rows = [];
        for await (const row of querybuilder) {
            rows.push(new this.Model(row));
        }
        return rows;
    }
    async first() {
        const row = await this.Model.collection.findOne(this._query, this._options);
        if (!row) {
            return null;
        }
        return new this.Model(row, false);
    }
    take(n) {
        this._options.limit = n;
        return this;
    }
    skip(n) {
        this._options.skip = n;
        return this;
    }
    sort(n) {
        this._options.sort = n;
        return this;
    }
    where(name, value) {
        if (typeof name === "string") {
            this._query[name] = value;
        }
        else {
            Object.assign(this._query, name);
        }
        return this;
    }
    project(p) {
        this._options.projection = p;
    }
    clone() {
        const cloned = new QueryBuilder(this.Model);
        cloned._query = this._query;
        cloned._options = this._options;
        return cloned;
    }
    create(props) {
        const record = new this.Model(props);
        record.hasObserve = this.hasObserver;
        return record.save();
    }
    async createMany(props) {
        const observer = this.hasObserver && this.Model.observer;
        const rows = props.map(prop => new this.Model(prop));
        if (observer && observer.creating) {
            await Promise.all(rows.map(row => observer.creating(row)));
        }
        const inserted = await this.Model.collection.insertMany(props.map(prop => this.Model.validateSchema(prop)));
        for (let i = 0; i > rows.length; i++) {
            const row = rows[i];
            row.attributes._id = inserted[i];
            if (observer && observer.created) {
                observer.created(row);
            }
        }
        return rows;
    }
    async increment(values) {
        const updatedRows = await this.Model.collection.updateMany(this._query, {
            $inc: values
        });
        return updatedRows.modifiedCount;
    }
    async multiply(values) {
        const updatedRows = await this.Model.collection.updateMany(this._query, {
            $mul: values
        });
        return updatedRows.modifiedCount;
    }
    async push(values) {
        const updatedRows = await this.Model.collection.updateMany(this._query, {
            $push: values
        });
        return updatedRows.modifiedCount;
    }
    async pull(values) {
        const updatedRows = await this.Model.collection.updateMany(this._query, {
            $pull: values
        });
        return updatedRows.modifiedCount;
    }
    async unset(fields) {
        const values = fields.reduce((r, k) => {
            r[k] = true;
            return r;
        }, {});
        const updatedRows = await this.Model.collection.updateMany(this._query, {
            $unset: values
        });
        return updatedRows.modifiedCount;
    }
    update(items) {
        return this.Model.collection.updateMany(this._query, {
            $set: this.Model.validateSchema(items, true)
        });
    }
    delete() {
        return this.Model.collection.deleteMany(this._query);
    }
    async modelify(data) {
        const rows = [];
        for await (const row of data) {
            rows.push(new this.Model(row, false));
        }
        return rows;
    }
    count() {
        return this.Model.collection.countDocuments(this._query);
    }
    paginate(page, limit) {
        if (!page) {
            page = 1;
        }
        if (typeof page === "string") {
            page = parseInt(page, 10);
        }
        return new pagination_1.default(this, page, limit);
    }
    async *[Symbol.asyncIterator]() {
        for await (const row of this.Model.collection.find(this._query, this._options)) {
            yield new this.Model(row, false);
        }
    }
}
exports.default = QueryBuilder;
QueryBuilder.pageSize = 25;
