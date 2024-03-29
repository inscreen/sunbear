import { Membership, Project, simpleMembershipWithAdminSchema, User } from '../examples/simpleMembershipWithAdmin';
import { Car, Person, simpleOwnershipSchema } from '../examples/simpleOwnership';

import { solveByPermission } from './solver';

describe('solver', () => {
    it('solveByPermission: [simpleOwnership] free-for-all view', () => {
        expect(solveByPermission(simpleOwnershipSchema, Person, undefined, 'view', Car, undefined)).toStrictEqual([
            {
                actorId: undefined,
                goalIds: undefined,
                direct: {
                    kind: 'direct',
                    actorNode: Person,
                    actorFilters: [],
                    node: Car,
                    role: 'Owner',
                    filters: [],
                    throughRelation: 'owner',
                },
                extensions: [],
            },
            {
                actorId: undefined,
                goalIds: undefined,
                direct: {
                    kind: 'direct',
                    actorNode: Person,
                    actorFilters: [],
                    node: Car,
                    filters: [],
                    role: 'Stranger',
                },
                extensions: [],
            },
        ]);
    });

    it('solveByPermission: [simpleOwnership] truthy direct drive', () => {
        expect(
            solveByPermission(simpleOwnershipSchema, Person, new Person('person14'), 'drive', Car, [
                new Car('car1', 'person14', undefined),
            ]),
        ).toStrictEqual(true);
    });

    it('solveByPermission: [simpleOwnership] falsy direct drive', () => {
        expect(
            solveByPermission(simpleOwnershipSchema, Person, new Person('person14'), 'drive', Car, [
                new Car('car2', 'otherperson', undefined),
            ]),
        ).not.toStrictEqual(true);
    });

    it('solveByPermission: [simpleMembershipWithAdminSchema] free-for-all edit', () => {
        expect(
            solveByPermission(simpleMembershipWithAdminSchema, User, undefined, 'edit', Project, undefined),
        ).toStrictEqual([
            {
                actorId: undefined,
                goalIds: undefined,
                direct: {
                    kind: 'direct',
                    node: Project,
                    filters: [],
                    role: 'Owner',
                    actorNode: User,
                    actorFilters: [],
                    throughRelation: 'owner',
                },
                extensions: [],
            },
            {
                actorId: undefined,
                goalIds: undefined,
                direct: {
                    kind: 'direct',
                    node: Membership,
                    filters: [],
                    role: 'Member',
                    actorNode: User,
                    actorFilters: [],
                    throughRelation: 'user',
                },
                extensions: [
                    {
                        kind: 'extension',
                        node: Project,
                        filters: [],
                        role: 'Member',
                        actorNode: User,
                        actorFilters: [],
                        extend: {
                            linkNode: Membership,
                            linkRole: 'Member',
                            throughRelation: 'memberships',
                        },
                    },
                ],
            },
        ]);
    });

    it('solveByPermission: [simpleMembershipWithAdminSchema] truthy direct edit, preloaded', () => {
        expect(
            solveByPermission(simpleMembershipWithAdminSchema, User, new User('user13', true), 'edit', Project, [
                new Project('project1', 'otheruser2', undefined, [
                    new Membership('mem13/1', 'user13', undefined, 'project1', undefined),
                ]),
            ]),
        ).toStrictEqual(true);
    });

    it('solveByPermission: [simpleMembershipWithAdminSchema] falsy direct edit, not preloaded', () => {
        expect(
            solveByPermission(simpleMembershipWithAdminSchema, User, new User('user15', false), 'edit', Project, [
                new Project('project1', 'otheruser2', undefined, undefined),
            ]),
        ).toStrictEqual([
            {
                actorId: 'user15',
                goalIds: ['project1'],
                direct: {
                    kind: 'direct',
                    node: Project,
                    filters: [],
                    role: 'Owner',
                    actorNode: User,
                    actorFilters: [],
                    throughRelation: 'owner',
                },
                extensions: [],
            },
            {
                actorId: 'user15',
                goalIds: ['project1'],
                direct: {
                    kind: 'direct',
                    node: Membership,
                    filters: [],
                    role: 'Member',
                    actorNode: User,
                    actorFilters: [],
                    throughRelation: 'user',
                },
                extensions: [
                    {
                        kind: 'extension',
                        node: Project,
                        filters: [],
                        role: 'Member',
                        actorNode: User,
                        actorFilters: [],
                        extend: {
                            linkNode: Membership,
                            linkRole: 'Member',
                            throughRelation: 'memberships',
                        },
                    },
                ],
            },
        ]);
    });

    it('solveByPermission: [simpleMembershipWithAdminSchema] truthy direct manage, admin', () => {
        expect(
            solveByPermission(simpleMembershipWithAdminSchema, User, new User('user13', true), 'manage', Project, [
                new Project('project1', 'otheruser2', undefined, undefined),
            ]),
        ).toStrictEqual(true);
    });

    it('solveByPermission: [simpleMembershipWithAdminSchema] falsy direct manage, admin', () => {
        expect(
            solveByPermission(simpleMembershipWithAdminSchema, User, new User('user15', false), 'manage', Project, [
                new Project('project1', 'otheruser2', undefined, undefined),
            ]),
        ).not.toStrictEqual(true);
    });
});
