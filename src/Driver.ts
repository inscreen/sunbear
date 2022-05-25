import type { PlannedQuery } from './queryPlan';

export interface Driver<Query, Node> {
    emit<Goal extends Node>(query: PlannedQuery<Node, Goal>): Query;
    run<Goal extends Node>(query: Query): Promise<Goal[]>;
}
