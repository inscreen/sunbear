import type { Client, Pool } from 'pg';

import type { Schema } from '..';
import type { Driver } from '../Driver';
import { emitSql } from '../emitSql';
import type { PlannedQuery } from '../queryPlan';

export class PostgresDriver<Node, Relation, Role, Permission extends string> implements Driver<string, Node> {
    constructor(
        protected readonly schema: Schema<Node, Relation, Role, Permission>,
        protected readonly client: Client | Pool,
    ) {}

    emitGoalsQuery<Goal extends Node, Actor extends Node>(query: PlannedQuery<Node, Goal, Actor>): string {
        return emitSql(this.schema, query, 'goal');
    }

    emitActorsQuery<Goal extends Node, Actor extends Node>(query: PlannedQuery<Node, Goal, Actor>): string {
        return emitSql(this.schema, query, 'actor');
    }

    async run<Goal extends Node>(query: string): Promise<Goal[]> {
        const result = await this.client.query(query);
        return result.rows;
    }
}
