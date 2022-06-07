import type { Schema } from '../src';

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

type Relation = 'owner' | 'user' | 'project' | 'memberships';

type Role = 'Stranger' | 'Member' | 'Owner' | 'Admin';

type Permission = 'view' | 'edit' | 'manage';

export const simpleMembershipWithAdminSchema: Schema<typeof nodes[number]['node'], Relation, Role, Permission> = {
    nodes,
    grants: new Map([
        [
            Project,
            {
                view: ['Stranger', 'Member', 'Owner'],
                edit: ['Member', 'Owner'],
                manage: ['Owner', 'Admin'],
            },
        ],
    ]),
    edges: [
        {
            kind: '1:n',
            source: Project,
            sourceColumn: 'owner_id',
            sourceRelation: 'owner',
            target: User,
            targetColumn: 'id',
        },
        {
            kind: '1:n',
            source: Membership,
            sourceColumn: 'user_id',
            sourcePreloadedProperty: 'user',
            sourceRelation: 'user',
            target: User,
            targetColumn: 'id',
        },
        {
            kind: '1:n',
            source: Membership,
            sourceColumn: 'project_id',
            sourceRelation: 'project',
            target: Project,
            targetColumn: 'id',
            targetPreloadedProperty: 'memberships',
            targetRelation: 'memberships',
        },
    ],
    rules: [
        {
            kind: 'direct',
            node: Project,
            role: 'Stranger',
            actorNode: User,
        },
        {
            kind: 'direct',
            node: Project,
            role: 'Owner',
            actorNode: User,
            throughRelation: 'owner',
        },
        {
            kind: 'direct',
            node: Membership,
            role: 'Member',
            actorNode: User,
            throughRelation: 'user',
        },
        {
            kind: 'extension',
            node: Project,
            role: 'Member',
            actorNode: User,
            extend: {
                linkNode: Membership,
                linkRole: 'Member',
                throughRelation: 'memberships',
            },
        },
        {
            kind: 'direct',
            node: Project,
            role: 'Admin',
            actorNode: User,
            actorFilters: [{ column: 'admin', condition: { kind: '=', value: true } }],
        },
    ],
};
