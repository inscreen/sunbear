import { Schema, SchemaBuilder } from '../src';

export class User {
    constructor(public id: string, public admin: boolean) {}
}

export class Project {
    constructor(
        public id: string,
        public owner_id: string,
        public owner: User | undefined,
        public memberships: Membership[] | undefined,
    ) {}
}

export class Membership {
    constructor(
        public id: string,
        public user_id: string,
        public user: User | undefined,
        public project_id: string,
        public project: Project | undefined,
    ) {}
}

const nodes = [
    { node: User, tableName: 'users', primaryColumn: 'id' },
    { node: Project, tableName: 'projects', primaryColumn: 'id' },
    { node: Membership, tableName: 'memberships', primaryColumn: 'id' },
] as const;

const edges = [
    {
        source: Project,
        sourceColumn: 'owner_id',
        sourceRelation: 'owner',
        target: User,
        targetColumn: 'id',
    },
    {
        source: Membership,
        sourceColumn: 'user_id',
        sourcePreloadedProperty: 'user',
        sourceRelation: 'user',
        target: User,
        targetColumn: 'id',
    },
    {
        source: Membership,
        sourceColumn: 'project_id',
        sourceRelation: 'project',
        target: Project,
        targetColumn: 'id',
        targetPreloadedProperty: 'memberships',
        targetRelation: 'memberships',
    },
] as const;

type Relation = 'owner' | 'user' | 'project' | 'memberships';

type Role = 'Stranger' | 'Member' | 'Owner' | 'Admin';

type Permission = 'view' | 'edit' | 'manage';

export const simpleMembershipWithAdminSchema: Schema<typeof nodes[number]['node'], Relation, Role, Permission> =
    new SchemaBuilder<typeof nodes[number]['node'], Relation, Role, Permission>(nodes, edges)
        .grant(Project, 'Owner', ['view', 'edit', 'manage'])
        .grant(Project, 'Admin', 'manage')
        .grant(Project, 'Member', ['view', 'edit'])
        .grant(Project, 'Stranger', 'view')
        .assignDirectly(Project, [], User, [], 'Stranger')
        .assignDirectly(Project, [], User, [{ column: 'admin', condition: { kind: '=', value: true } }], 'Admin')
        .assignThroughRelation(Project, [], 'owner', User, [], 'Owner')
        .assignThroughRelation(Membership, [], 'user', User, [], 'Member')
        .assignByExtension(Project, [], User, [], 'Member', {
            linkNode: Membership,
            linkRole: 'Member',
            throughRelation: 'memberships',
        })
        .finalize();
