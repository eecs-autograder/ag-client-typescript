import {
    Course,
    Group, GroupObserver, NewGroupData,
    Project,
    User
} from '..';

import {
    expect_dates_equal,
    expect_dates_not_equal,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
    sleep,
    SUPERUSER_NAME,
    zip,
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;

class TestObserver implements GroupObserver {
    group: Group | null = null;
    group1_merged_pk: number | null = null;
    group2_merged_pk: number | null = null;

    created_count = 0;
    changed_count = 0;
    merged_count = 0;

    update_group_changed(group: Group): void {
        this.changed_count += 1;
        this.group = group;
    }

    update_group_created(group: Group): void {
        this.created_count += 1;
        this.group = group;
    }

    update_group_merged(new_group: Group, group1_pk: number, group2_pk: number): void {
        this.merged_count += 1;
        this.group = new_group;
        this.group1_merged_pk = group1_pk;
        this.group2_merged_pk = group2_pk;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project', guests_can_submit: true});

    observer = new TestObserver();
    Group.subscribe(observer);
});

afterEach(() => {
    Group.unsubscribe(observer);
});

describe('List/create group tests', () => {
    test('Group ctor', () => {
        let now = (new Date()).toISOString();

        let members = [
            new User({
                pk: 2, username: 'john@umich.edu',
                first_name: 'joHn', last_name: 'umich',
                is_superuser: false
            }),
            new User({
                pk: 1, username: 'doe@umich.edu',
                first_name: 'doe', last_name: 'edu',
                is_superuser: true
            }),
        ];

        let group = new Group({
            pk: 6,
            project: project.pk,
            extended_due_date: now,
            members: members,
            member_names: members.map(member => member.username),
            bonus_submissions_remaining: 0,
            late_days_used: {'john@umich.edu': 0, 'doe@umich.edu': 0},
            num_submissions: 1,
            num_submits_towards_limit: 1,
            created_at: now,
            last_modified: now,
        });

        expect(group.pk).toEqual(6);
        expect(group.project).toEqual(project.pk);
        expect(group.extended_due_date).toEqual(now);
        expect(group.members).toEqual(members);
        expect(group.member_names).toEqual(['john@umich.edu', 'doe@umich.edu']);
        expect(group.bonus_submissions_remaining).toEqual(0);
        expect(group.late_days_used).toEqual({'john@umich.edu': 0, 'doe@umich.edu': 0});
        expect(group.num_submissions).toEqual(1);
        expect(group.num_submits_towards_limit).toEqual(1);
        expect_dates_equal(group.created_at, now);
        expect_dates_equal(group.last_modified, now);
    });

    test('List groups', async () => {
        let create_groups = `
from autograder.core.models import Project, Group
from django.contrib.auth.models import User

project = Project.objects.get(pk=${project.pk})
project.max_group_size = 2

member1 = User.objects.get_or_create(username='ffuxa@umich.edu')[0]
member2 = User.objects.get_or_create(username='thisisarealname@umich.edu')[0]
member3 = User.objects.get_or_create(username='notabot@umich.edu')[0]
member4 = User.objects.get_or_create(username='iranoutofnames@umich.edu')[0]

Group.objects.validate_and_create(project=project, members=[member1])
Group.objects.validate_and_create(project=project, members=[member2])
Group.objects.validate_and_create(project=project, members=[member3, member4])
        `;
        run_in_django_shell(create_groups);

        let loaded_groups = await Group.get_all_from_project(project.pk);

        let actual_usernames = loaded_groups.map((group) => group.member_names.sort());
        expect(actual_usernames.sort()).toEqual([
            ['ffuxa@umich.edu'],
            ['thisisarealname@umich.edu'],
            ['iranoutofnames@umich.edu', 'notabot@umich.edu']
        ].sort());
    });

    test('Create solo group', async () => {
        let created = await Group.create_solo_group(project.pk);
        let loaded = await Group.get_all_from_project(project.pk);

        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.member_names).toEqual([SUPERUSER_NAME]);
        expect(actual.extended_due_date).toEqual(null);
        expect(actual.bonus_submissions_remaining).toEqual(0);
        expect(actual.late_days_used).toEqual({});
        expect(actual.num_submissions).toEqual(0);
        expect(actual.num_submits_towards_limit).toEqual(0);

        expect(observer.group).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.merged_count).toEqual(0);
    });

    test('Create group with multiple members', async () => {
        let created = await Group.create(project.pk, new NewGroupData({
            member_names: ['member1@umich.edu', 'member2@umich.edu', 'member3@umich.edu']
        }));

        let loaded = await Group.get_all_from_project(project.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.member_names).toEqual(
            ['member1@umich.edu', 'member2@umich.edu', 'member3@umich.edu']);
        expect(actual.extended_due_date).toEqual(null);
        expect(actual.bonus_submissions_remaining).toEqual(0);
        expect(actual.late_days_used).toEqual({});
        expect(actual.num_submissions).toEqual(0);
        expect(actual.num_submits_towards_limit).toEqual(0);

        expect(observer.group).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.merged_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let group = await Group.create_solo_group(project.pk);

        expect(observer.group).toEqual(group);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.merged_count).toEqual(0);

        Group.unsubscribe(observer);

        await group.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.merged_count).toEqual(0);
    });
});

describe('Get/update/delete group tests', () => {
    let group!: Group;

    beforeEach(async () => {
        group = await Group.create_solo_group(project.pk);
    });

    test('Get group', async () => {
        let loaded = await Group.get_by_pk(group.pk);
        expect(loaded).toEqual(group);
    });

    test('Update group', async () => {
        let later = (new Date(2050, 1, 1)).toISOString();

        group.member_names = ['someothermember@umich.edu'];
        group.extended_due_date = later;
        group.bonus_submissions_remaining = 4;

        await sleep(1);
        await group.save();

        let loaded = await Group.get_by_pk(group.pk);
        expect_dates_equal(loaded.extended_due_date, later);
        expect(loaded.member_names).toEqual(['someothermember@umich.edu']);
        expect(loaded.bonus_submissions_remaining).toEqual(4);

        expect(group).toEqual(loaded);

        expect(observer.group).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.merged_count).toEqual(0);
    });

    test('Refresh group', async () => {
        let old_timestamp = group.last_modified;
        await sleep(1);
        await group.refresh();

        expect(group.bonus_submissions_remaining).toEqual(0);
        expect_dates_equal(group.last_modified, old_timestamp);

        expect(observer.group).toEqual(group);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.merged_count).toEqual(0);

        let change_group = `
from autograder.core.models import Group

group = Group.objects.get(pk=${group.pk})
group.validate_and_update(bonus_submissions_remaining=12)
        `;
        run_in_django_shell(change_group);

        await group.refresh();

        expect(group.bonus_submissions_remaining).toEqual(12);
        expect_dates_not_equal(group.last_modified, old_timestamp);

        expect(observer.group).toEqual(group);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.merged_count).toEqual(0);
    });

    test('Merge group', async () => {
        let group1 = await Group.create(project.pk, new NewGroupData({
            member_names: ['member1@umich.edu']
        }));

        let group2 = await Group.create(project.pk, new NewGroupData({
            member_names: ['member2@umich.edu']
        }));

        expect(observer.group).toEqual(group2);
        expect(observer.created_count).toEqual(3);
        expect(observer.changed_count).toEqual(0);
        expect(observer.merged_count).toEqual(0);

        let merged = await group1.merge_groups(group2.pk);

        expect(merged.member_names.sort()).toEqual(['member1@umich.edu', 'member2@umich.edu']);

        expect(observer.group).toEqual(merged);
        expect(observer.group1_merged_pk).toEqual(group1.pk);
        expect(observer.group2_merged_pk).toEqual(group2.pk);
        expect(observer.created_count).toEqual(3);
        expect(observer.changed_count).toEqual(0);
        expect(observer.merged_count).toEqual(1);
    });

    test('Pseudo-delete group', async () => {
        let original_members = group.member_names.slice();
        await group.pseudo_delete();

        expect(group.member_names).not.toEqual(original_members);
        for (let [original_name, new_name] of zip(original_members, group.member_names)) {
            expect(new_name).not.toEqual(original_name);
            expect(new_name).toContain(original_name);
        }

        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.merged_count).toEqual(0);
    });
});
