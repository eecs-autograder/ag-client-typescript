import { Course, Group, GroupInvitation, Project, Semester, User } from "..";

import { global_setup, make_superuser, reset_db, run_in_django_shell,
         SUPERUSER_NAME } from "./utils";

beforeAll(() => {
    global_setup();
});

beforeEach(() => {
    reset_db();
});

describe('User tests', () => {
    test('constructor', async () => {
        let user = new User({
            pk: 42,
            username: 'batman',
            first_name: 'The',
            last_name: 'Batman',
            is_superuser: true
        });
        expect(user.pk).toEqual(42);
        expect(user.username).toEqual('batman');
        expect(user.first_name).toEqual('The');
        expect(user.last_name).toEqual('Batman');
        expect(user.is_superuser).toEqual(true);
    });

    // ------------------------------------------------------------------------

    test('get current user', async () => {
        let current_user = await User.get_current();
        expect(current_user.username).toEqual(SUPERUSER_NAME);
        expect(current_user.first_name).toEqual('');
        expect(current_user.last_name).toEqual('');
        expect(current_user.is_superuser).toEqual(false);

        let set_superuser = `
from django.contrib.auth.models import User
User.objects.filter(pk=${current_user.pk}).update(is_superuser=True)`;
        run_in_django_shell(set_superuser);

        current_user = await User.get_current();
        expect(current_user.username).toEqual(SUPERUSER_NAME);
        expect(current_user.first_name).toEqual('');
        expect(current_user.last_name).toEqual('');
        expect(current_user.is_superuser).toEqual(true);
    });

    // ------------------------------------------------------------------------

    test('get user by pk', async () => {
        let current_user = await User.get_current();
        let set_superuser = `
from django.contrib.auth.models import User
User.objects.filter(pk=${current_user.pk}).update(is_superuser=True)`;
        run_in_django_shell(set_superuser);

        let user = await User.get_by_pk(current_user.pk);
        expect(user.is_superuser).toEqual(true);
    });

    // ------------------------------------------------------------------------

    test('user by pk not found', async () => {
        return expect(
            User.get_by_pk(10000)
        ).rejects.toHaveProperty('status', 404);
    });

    // ------------------------------------------------------------------------

    test('refresh user', async () => {
        let user = await User.get_current();
        expect(user.username).toEqual(SUPERUSER_NAME);
        expect(user.first_name).toEqual('');
        expect(user.last_name).toEqual('');
        expect(user.is_superuser).toEqual(false);

        let set_fields = `
from django.contrib.auth.models import User
User.objects.filter(pk=${user.pk}).update(
    is_superuser=True,
    first_name='James',
    last_name='Perretta')`;
        run_in_django_shell(set_fields);

        await user.refresh();
        expect(user.username).toEqual(SUPERUSER_NAME);
        expect(user.first_name).toEqual('James');
        expect(user.last_name).toEqual('Perretta');
        expect(user.is_superuser).toEqual(true);
    });

    // ------------------------------------------------------------------------

    test('Get current user roles for course, all roles false', async () => {
        let make_course = `
from autograder.core.models import Course, Semester
c = Course.objects.validate_and_create(name='course', semester=Semester.fall, year=2020)
        `;
        run_in_django_shell(make_course);
        let course = await Course.get_by_fields('course', Semester.fall, 2020);

        let roles = await User.get_current_user_roles(course.pk);
        expect(roles.is_admin).toBe(false);
        expect(roles.is_staff).toBe(false);
        expect(roles.is_student).toBe(false);
        expect(roles.is_handgrader).toBe(false);
    });

    // ------------------------------------------------------------------------

    test('Get current user roles for course, all roles true', async () => {
        make_superuser();

        let make_course = `
from autograder.core.models import Course, Semester
from django.contrib.auth.models import User
c = Course.objects.validate_and_create(name='course', semester=Semester.fall, year=2020)
user = User.objects.get(username='${SUPERUSER_NAME}')
c.admins.add(user)
c.staff.add(user)
c.students.add(user)
c.handgraders.add(user)
        `;
        run_in_django_shell(make_course);
        let course = await Course.get_by_fields('course', Semester.fall, 2020);

        let roles = await User.get_current_user_roles(course.pk);
        expect(roles.is_admin).toBe(true);
        expect(roles.is_staff).toBe(true);
        expect(roles.is_student).toBe(true);
        expect(roles.is_handgrader).toBe(true);
    });

    // ------------------------------------------------------------------------

    test('Current non-super user has can create courses permission', async () => {
        let make_user = `
from django.contrib.auth.models import User, Permission
user = User.objects.get_or_create(username='${SUPERUSER_NAME}')[0]
user.user_permissions.add(Permission.objects.get(codename='create_course'))
        `;
        run_in_django_shell(make_user);

        let can_create = await User.current_can_create_courses();
        expect(can_create).toBe(true);
    });

    test('Current user does not have create courses permission', async () => {
        let can_create = await User.current_can_create_courses();
        expect(can_create).toBe(false);
    });

    test('Superuser can create courses permission', async () => {
        make_superuser();
        let can_create = await User.current_can_create_courses();
        expect(can_create).toBe(true);
    });
});

// ----------------------------------------------------------------------------

describe('User reverse relation ship endpoint tests', () => {
    test('get courses is admin for', async () => {
        make_superuser();
        let add_admins = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='${SUPERUSER_NAME}')
for c in Course.objects.all():
    c.admins.add(user)
        `;
        run_in_django_shell(add_admins);

        let user = await User.get_current();
        let courses = await user.courses_is_admin_for();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
    });

    // ------------------------------------------------------------------------

    test('get courses is staff for', async () => {
        make_superuser();
        let add_staff = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='${SUPERUSER_NAME}')
for c in Course.objects.all():
    c.staff.add(user)
        `;
        run_in_django_shell(add_staff);

        let user = await User.get_current();
        let courses = await user.courses_is_staff_for();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
    });

    // ------------------------------------------------------------------------

    test('get courses is student in', async () => {
        make_superuser();
        let add_students = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='${SUPERUSER_NAME}')
for c in Course.objects.all():
    c.students.add(user)
        `;
        run_in_django_shell(add_students);

        let user = await User.get_current();
        let courses = await user.courses_is_student_in();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
    });

    // ------------------------------------------------------------------------

    test('get courses is handgrader for', async () => {
        make_superuser();
        let add_handgraders = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='${SUPERUSER_NAME}')
for c in Course.objects.all():
    c.handgraders.add(user)
        `;
        run_in_django_shell(add_handgraders);

        let user = await User.get_current();
        let courses = await user.courses_is_handgrader_for();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
    });

    // ------------------------------------------------------------------------

    test('Groups is member of', async () => {
        make_superuser();
        let add_groups = `
from autograder.core.models import Course, Project, Group
from django.contrib.auth.models import User

user = User.objects.get(username='${SUPERUSER_NAME}')

course = Course.objects.validate_and_create(name='Coursey')
course.admins.add(user)
p1 = Project.objects.validate_and_create(name='P1', course=course)
p2 = Project.objects.validate_and_create(name='P2', course=course)

Group.objects.validate_and_create(members=[user], project=p1)
Group.objects.validate_and_create(members=[user], project=p2)
        `;
        run_in_django_shell(add_groups);

        let user = await User.get_current();
        let groups = await user.groups_is_member_of();
        expect(groups.length).toEqual(2);
        expect(groups[0].member_names).toEqual([SUPERUSER_NAME]);
        expect(groups[1].member_names).toEqual([SUPERUSER_NAME]);

        expect(groups[0].pk).not.toEqual(groups[1].pk);

        groups.sort((a: Group, b: Group) => a.pk - b.pk);
        expect((await Project.get_by_pk(groups[0].project)).name).toEqual('P1');
        expect((await Project.get_by_pk(groups[1].project)).name).toEqual('P2');
    });
});

describe('Group invitations sent and received tests', () => {
    let user: User;
    let project: Project;

    beforeEach(async () => {
        make_superuser();
        user = await User.get_current();

        let course = await Course.create({name: 'Coursey'});
        project = await Project.create(course.pk, {name: 'Projy', max_group_size: 3});

        let make_users = `
from django.contrib.auth.models import User
from autograder.core.models import Course

User.objects.create(username='user1')
User.objects.create(username='user2')

Course.objects.get(pk=${course.pk}).admins.add(*User.objects.all())
        `;
        run_in_django_shell(make_users);
    });

    test('Group invitations sent', async () => {
        let invitation = await GroupInvitation.send_invitation(project.pk, ['user1', 'user2']);
        let invitations_sent = await user.group_invitations_sent();
        expect(invitations_sent).toEqual([invitation]);
    });

    test('Group invitations received', async () => {
        let make_invitation = `
from django.contrib.auth.models import User
from autograder.core.models import GroupInvitation, Project

invitor = User.objects.get(username='user1')
invitee = User.objects.get(username='${SUPERUSER_NAME}')

invitation = GroupInvitation.objects.validate_and_create(
    project=Project.objects.get(pk=${project.pk}),
    sender=invitor,
    recipients=[invitee]
)

print(invitation.pk)
        `;

        let result = run_in_django_shell(make_invitation);
        let invitation = await GroupInvitation.get_by_pk(parseInt(result.stdout, 10));

        let invitations_received = await user.group_invitations_received();
        expect(invitations_received).toEqual([invitation]);
    });
});

describe('User late days tests', () => {
    test('Get and edit user late days', async () => {
        make_superuser();
        let course = await Course.create({name: 'Coursey'});
        let user = await User.get_current();

        expect(await User.get_num_late_days(course.pk, user.pk)).toEqual({
            late_days_remaining: 0});
        expect(await User.set_num_late_days(course.pk, user.pk, 3)).toEqual({
            late_days_remaining: 3});

        expect(await User.get_num_late_days(course.pk, user.username)).toEqual({
            late_days_remaining: 3});
        expect(await User.set_num_late_days(course.pk, user.username, 1)).toEqual({
            late_days_remaining: 1});

        expect(await User.get_num_late_days(course.pk, user.pk)).toEqual({
            late_days_remaining: 1});
    });
});
