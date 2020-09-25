import { Cursor, FindOneOptions } from "mongodb";
import Model, { ModelConstructor } from "./model";
export default class QueryBuilder<M extends Model<P>, P> {
    Model: ModelConstructor<P, M>;
    protected _query: Record<string, string | number>;
    protected _options: FindOneOptions<P>;
    static pageSize: number;
    constructor(Model: ModelConstructor<P, M>);
    find(): Promise<M[]>;
    first(): Promise<M | null>;
    take(n: FindOneOptions<P>["limit"]): this;
    skip(n: FindOneOptions<P>["skip"]): this;
    sort(n: FindOneOptions<P>["sort"]): this;
    where(name: string, value: any): this;
    project(p: FindOneOptions<P>["projection"]): void;
    clone(): QueryBuilder<M, P>;
    create(props: Omit<P, "_id">): Promise<M>;
    delete(): void;
    modelify(data: AsyncGenerator<P> | Cursor<P>): Promise<M[]>;
    paginate(page: number, limit?: number): Promise<{
        limit: number;
        page: number;
        pages: number;
        total: number;
        docs: M[];
    }>;
    [Symbol.asyncIterator](): {
        next(): Promise<{
            done: boolean;
            value?: undefined;
        } | {
            done: boolean;
            value: M;
        }>;
    };
}
//# sourceMappingURL=query-builder.d.ts.map