import { Cursor, FilterQuery, FindOneOptions, ObjectID } from "mongodb";
import Model, { ModelConstructor } from "./model";
import Pagination from "./pagination";

export default class QueryBuilder<M extends Model<P>, P> {
  protected _query: Record<string, string | number> = {};
  protected _options: FindOneOptions<P> = {};

  static pageSize = 25;
  hasObserver = true;
  // eslint-disable-next-line no-shadow
  constructor(public Model: ModelConstructor<M, P>) {}
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
    const querybuilder = this.Model.collection.find<P>(this._query, this._options as any);
    const rows: M[] = [];
    for await (const row of querybuilder) {
      rows.push(new this.Model(row));
    }
    return rows;
  }

  async first() {
    const row = await this.Model.collection.findOne<P>(this._query, this._options as FindOneOptions<any>);
    if (!row) {
      return null;
    }
    return new this.Model(row, false);
  }
  findById(id: string | ObjectID) {
    return this.where({ _id: id } as any).first();
  }
  take(n: FindOneOptions<P>["limit"]) {
    this._options.limit = n;
    return this;
  }

  skip(n: FindOneOptions<P>["skip"]) {
    this._options.skip = n;
    return this;
  }

  sort(n: FindOneOptions<P>["sort"]) {
    this._options.sort = n;
    return this;
  }

  where(name: keyof P | FilterQuery<P>, value?: any) {
      if (typeof name === "string") {
          this._query[name] = value;
      } else {
          Object.assign(this._query, name);
      }
    return this;
  }

  project(p: FindOneOptions<P>["projection"]) {
    this._options.projection = p;
  }

  clone() {
    const cloned = new QueryBuilder(this.Model);
    cloned._query = this._query;
    cloned._options = this._options;
    return cloned;
  }

    create(props: P) {
        const record = new this.Model(props);
        record.hasObserve = this.hasObserver;
        return record.save();
    }

    async createMany(props: P[]) {
      const observer = this.hasObserver && this.Model.observer;
      const rows = props.map(prop => new this.Model(prop));
      if (observer && observer.creating) {
        await Promise.all(rows.map(row => observer.creating(row)));
      }
      const inserted = await this.Model.collection.insertMany(props.map(prop => this.Model.validateSchema(prop)));
      for (let i = 0; i > rows.length; i++) {
        const row = rows[i];
        (row.attributes as any)._id = (inserted as any)[i];
        if (observer && observer.created) {
          observer.created(row);
        }
      }
      return rows;
    }

    async increment(values: any) {
      const updatedRows = await this.Model.collection.updateMany(this._query as any, {
        $inc: values
      });
      return updatedRows.modifiedCount;
    }

    async multiply(values: any) {
      const updatedRows = await this.Model.collection.updateMany(this._query as any, {
        $mul: values
      });
      return updatedRows.modifiedCount;
    }

    async push(values: any) {
      const updatedRows = await this.Model.collection.updateMany(this._query as any, {
        $push: values
      });
      return updatedRows.modifiedCount;
    }

    async pull(values: any) {
      const updatedRows = await this.Model.collection.updateMany(this._query as any, {
        $pull: values
      });
      return updatedRows.modifiedCount;
    }

    async unset(fields: string[]) {
      const values = fields.reduce<Record<string, any>>((r, k) => {
        r[k] = true;
        return r;
      }, {})
      const updatedRows = await this.Model.collection.updateMany(this._query as any, {
        $unset: values
      });
      return updatedRows.modifiedCount;
    }

    update(items: P) {
        return this.Model.collection.updateMany(this._query, {
          $set: this.Model.validateSchema(items, true)
        });
    }

    delete() {
      return this.Model.collection.deleteMany(this._query);
    }

  async modelify(data: AsyncGenerator<P> | Cursor<P>) {
    const rows: M[] = [];
    for await (const row of data) {
      rows.push(new this.Model(row, false));
    }
    return rows;
  }

  count() {
    return this.Model.collection.countDocuments(this._query);
  }

  paginate(page?: number | string, limit?: number) {
    if (!page) {
        page = 1;
    }
    if (typeof page === "string") {
      page = parseInt(page, 10);
    }
    return new Pagination<M, P>(this, page, limit);
  }

  async *[Symbol.asyncIterator]() {
    for await (const row of this.Model.collection.find<P>(this._query, this._options as any)) {
        yield new this.Model(row, false);
    }
  }
}
