import format from 'pg-format';
import type { BaseEntity, Connection, ObjectType, SelectQueryBuilder } from 'typeorm';

import { getNodeDefinition, Schema } from '..';
import type { Driver } from '../Driver';
import { emitSql } from '../emitSql';
import type { PlannedQuery } from '../queryPlan';

export class TypeOrmDriver<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Node extends typeof BaseEntity & ObjectType<any>,
        Relation,
        Role,
        Permission extends string,
    >
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    implements Driver<SelectQueryBuilder<any>, Node>
{
    constructor(
        private readonly schema: Schema<Node, Relation, Role, Permission>,
        private readonly dataSource: Connection,
    ) {
        if (!['postgres', 'aurora-postgres'].includes(dataSource.driver.options.type)) {
            throw new Error('SunBear: TypeOrmDriver only supports PostgreSQL');
        }
    }

    emitGoalsQuery<Goal extends Node, Actor extends Node>(
        query: PlannedQuery<Node, Goal, Actor>,
    ): SelectQueryBuilder<Goal> {
        const goalPrimaryColumn = getNodeDefinition(this.schema, query.alternatives[0]!.goalTable).primaryColumn;
        return this.dataSource
            .createQueryBuilder(query.alternatives[0]!.goalTable, 'goal')
            .where(
                `goal.${format.ident(goalPrimaryColumn)} IN (${emitSql(
                    this.schema,
                    query,
                    'goal',
                    goalPrimaryColumn,
                )})`,
            );
    }

    emitActorsQuery<Goal extends Node, Actor extends Node>(
        query: PlannedQuery<Node, Goal, Actor>,
    ): SelectQueryBuilder<Actor> {
        const actorPrimaryColumn = getNodeDefinition(this.schema, query.alternatives[0]!.actorTable).primaryColumn;
        return this.dataSource
            .createQueryBuilder(query.alternatives[0]!.actorTable, 'actor')
            .where(
                `actor.${format.ident(actorPrimaryColumn)} IN (${emitSql(
                    this.schema,
                    query,
                    'actor',
                    actorPrimaryColumn,
                )})`,
            );
    }

    async run<Goal extends Node>(query: SelectQueryBuilder<Goal>): Promise<Goal[]> {
        return query.getMany();
    }
}
