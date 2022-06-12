import type { PlannedQuery } from './queryPlan';

export interface Driver<Query, Node> {
    emitGoalsQuery<Goal extends Node, Actor extends Node>(query: PlannedQuery<Node, Goal, Actor>): Query;
    emitActorsQuery<Goal extends Node, Actor extends Node>(query: PlannedQuery<Node, Goal, Actor>): Query;
    run<Goal extends Node>(query: Query): Promise<Goal[]>;
}
