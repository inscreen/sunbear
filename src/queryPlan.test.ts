import { Membership, Project, simpleMembershipWithAdminSchema, User } from '../examples/simpleMembershipWithAdmin';
import { Car, Person, simpleOwnershipSchema } from '../examples/simpleOwnership';

import { planQuery } from './queryPlan';

describe('queryPlan', () => {
    it('planQuery: [simpleOwnership]', () => {
        expect(
            planQuery(simpleOwnershipSchema, [
                {
                    actorId: undefined,
                    goalIds: ['car1', 'car2'],
                    direct: {
                        kind: 'direct',
                        actorNode: Person,
                        node: Car,
                        role: 'Stranger',
                    },
                    extensions: [],
                },
                {
                    actorId: undefined,
                    goalIds: undefined,
                    direct: {
                        kind: 'direct',
                        actorNode: Person,
                        node: Car,
                        role: 'Owner',
                        throughRelation: 'owner',
                    },
                    extensions: [],
                },
            ]),
        ).toStrictEqual({
            alternatives: [
                {
                    goalTable: Car,
                    goalFilters: [{ column: 'id', condition: { kind: 'IN', values: ['car1', 'car2'] } }],
                    joins: [],
                },
                {
                    goalTable: Car,
                    goalFilters: [],
                    joins: [
                        {
                            kind: 'inner',
                            joinedTable: Person,
                            joinedTableName: '__actor',
                            joinedTableColumn: 'id',
                            existingTableName: '__goal',
                            existingTableColumn: 'owner_id',
                            filters: [],
                        },
                    ],
                },
            ],
        });
    });

    it('planQuery: [simpleMembershipWithAdminSchema] edit', () => {
        expect(
            planQuery(simpleMembershipWithAdminSchema, [
                {
                    actorId: 'user14',
                    goalIds: undefined,
                    direct: {
                        kind: 'direct',
                        node: Membership,
                        role: 'Member',
                        actorNode: User,
                        throughRelation: 'user',
                    },
                    extensions: [
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
                    ],
                },
                {
                    actorId: 'user14',
                    goalIds: undefined,
                    direct: {
                        kind: 'direct',
                        node: Project,
                        role: 'Owner',
                        actorNode: User,
                        throughRelation: 'owner',
                    },
                    extensions: [],
                },
            ]),
        ).toStrictEqual({
            alternatives: [
                {
                    goalTable: Project,
                    goalFilters: [],
                    joins: [
                        {
                            kind: 'inner',
                            joinedTable: Membership,
                            joinedTableName: '__t0',
                            joinedTableColumn: 'project_id',
                            existingTableName: '__goal',
                            existingTableColumn: 'id',
                            filters: [],
                        },
                        {
                            kind: 'inner',
                            joinedTable: User,
                            joinedTableName: '__actor',
                            joinedTableColumn: 'id',
                            existingTableName: '__t0',
                            existingTableColumn: 'user_id',
                            filters: [
                                {
                                    column: 'id',
                                    condition: { kind: '=', value: 'user14' },
                                },
                            ],
                        },
                    ],
                },
                {
                    goalTable: Project,
                    goalFilters: [],
                    joins: [
                        {
                            kind: 'inner',
                            joinedTable: User,
                            joinedTableName: '__actor',
                            joinedTableColumn: 'id',
                            existingTableName: '__goal',
                            existingTableColumn: 'owner_id',
                            filters: [
                                {
                                    column: 'id',
                                    condition: { kind: '=', value: 'user14' },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    });
});
