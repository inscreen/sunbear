import format from 'pg-format';
import type { BaseEntity, DataSource, ObjectType, SelectQueryBuilder } from 'typeorm';

import type { Schema } from '..';
import type { Driver } from '../Driver';
import { emitSql } from '../emitSql';
import type { PlannedQuery } from '../queryPlan';

export class TypeOrmDriver<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Node extends BaseEntity & ObjectType<any>,
        Relation,
        Role,
        Permission extends string,
    >
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    implements Driver<SelectQueryBuilder<any>, Node>
{
    constructor(
        private readonly schema: Schema<Node, Relation, Role, Permission>,
        private readonly dataSource: DataSource,
    ) {
        if (!['postgres', 'aurora-postgres'].includes(dataSource.driver.options.type)) {
            throw new Error('SunBear: TypeOrmDriver only supports PostgreSQL');
        }
    }

    emit<Goal extends Node>(query: PlannedQuery<Node, Goal>): SelectQueryBuilder<Goal> {
        const goalPrimaryColumn = this.schema.nodes.find(
            (node) => node.node === query.alternatives[0]!.goalTable,
        )!.primaryColumn;
        return this.dataSource
            .createQueryBuilder(query.alternatives[0]!.goalTable, 'goal')
            .where(`goal.${format.ident(goalPrimaryColumn)} IN (${emitSql(this.schema, query, goalPrimaryColumn)})`);
    }

    async run<Goal extends Node>(query: SelectQueryBuilder<Goal>): Promise<Goal[]> {
        return query.getMany();
    }
}
