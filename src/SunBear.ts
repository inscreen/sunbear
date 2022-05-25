import type { Driver } from './Driver';
import { planQuery } from './queryPlan';
import { solveByPermission } from './solver';

import type { Schema } from '.';

export interface SunBearOptions<
    Node extends AnyClass,
    Relation extends string,
    Role extends string,
    Permission extends string,
    Query,
    DriverT extends Driver<Query, Node>,
> {
    driver: (schema: Schema<Node, Relation, Role, Permission>) => DriverT;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyClass = new (..._: any[]) => any;

export class SunBear<
    Node extends AnyClass,
    Relation extends string,
    Role extends string,
    Permission extends string,
    Query,
    DriverT extends Driver<Query, Node>,
> {
    private driver: DriverT;

    constructor(
        private readonly schema: Schema<Node, Relation, Role, Permission>,
        private readonly options: SunBearOptions<Node, Relation, Role, Permission, Query, DriverT>,
    ) {
        this.driver = this.options.driver(schema);
    }

    async isAuthorized<Actor extends Node, Goal extends Node>(
        actor: InstanceType<Actor>,
        permission: Permission,
        goal: InstanceType<Goal>,
    ): Promise<boolean> {
        const solution = solveByPermission(this.schema, actor.constructor, actor, permission, goal.constructor, [goal]);
        if (solution === true) {
            return true;
        }
        const query = this.driver.emit(planQuery(this.schema, solution));
        return (await this.driver.run(query)).length > 0;
    }

    authorizedQuery<Actor extends Node, Goal extends Node>(
        actor: InstanceType<Actor>,
        permission: Permission,
        goal: Goal,
    ): Query {
        const solution = solveByPermission(this.schema, actor.constructor, actor, permission, goal, undefined);
        return this.driver.emit(planQuery(this.schema, solution));
    }

    authorizedActorsQuery<Actor extends Node, Goal extends Node>(
        actor: Actor,
        permission: Permission,
        goal: InstanceType<Goal>,
    ): Query {
        const solution = solveByPermission(this.schema, actor, undefined, permission, goal.constructor, [goal]);
        return this.driver.emit(planQuery(this.schema, solution));
    }
}
